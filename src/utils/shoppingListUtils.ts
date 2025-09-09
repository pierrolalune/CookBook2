import { 
  ShoppingList, 
  ShoppingListItem, 
  Recipe, 
  Ingredient, 
  IngredientCategory,
  CreateShoppingListItemInput 
} from '../types';
import { ValidationUtils } from './validation';

/**
 * Utility functions for shopping list operations
 */
export class ShoppingListUtils {
  
  /**
   * Convert recipes to shopping list items with ingredient consolidation
   */
  static consolidateRecipeIngredients(recipes: Recipe[]): CreateShoppingListItemInput[] {
    const consolidatedMap = new Map<string, CreateShoppingListItemInput>();
    let orderIndex = 0;

    for (const recipe of recipes) {
      for (const recipeIngredient of recipe.ingredients) {
        if (recipeIngredient.optional) {
          continue; // Skip optional ingredients
        }

        const ingredient = recipeIngredient.ingredient;
        const unit = recipeIngredient.unit || 'pièce';
        
        // Create unique key for ingredient-unit combination
        const key = `${ingredient.id}-${unit.toLowerCase()}`;
        
        if (consolidatedMap.has(key)) {
          // Add to existing quantity
          const existing = consolidatedMap.get(key)!;
          existing.quantity = (existing.quantity || 0) + (recipeIngredient.quantity || 0);
        } else {
          // Create new item
          consolidatedMap.set(key, {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            quantity: recipeIngredient.quantity,
            unit: unit,
            category: ingredient.category,
            orderIndex: orderIndex++
          });
        }
      }
    }

    // Convert to array and sort by category and name
    return Array.from(consolidatedMap.values()).sort((a, b) => {
      // Primary sort by category
      if (a.category !== b.category) {
        return this.getCategoryOrder(a.category) - this.getCategoryOrder(b.category);
      }
      // Secondary sort by ingredient name
      return a.ingredientName.localeCompare(b.ingredientName, 'fr', { numeric: true });
    }).map((item, index) => ({ ...item, orderIndex: index }));
  }

  /**
   * Group shopping list items by category
   */
  static groupItemsByCategory(items: ShoppingListItem[]): { [category: string]: ShoppingListItem[] } {
    const grouped: { [category: string]: ShoppingListItem[] } = {};
    
    for (const item of items) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    // Sort items within each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        // Sort by completion status (uncompleted first), then by order_index
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        return a.orderIndex - b.orderIndex;
      });
    });

    return grouped;
  }

  /**
   * Calculate completion statistics for a shopping list
   */
  static getCompletionStats(items: ShoppingListItem[]): {
    totalItems: number;
    completedItems: number;
    completionPercentage: number;
    hasCompletedItems: boolean;
    allItemsCompleted: boolean;
  } {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.isCompleted).length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      completedItems,
      completionPercentage,
      hasCompletedItems: completedItems > 0,
      allItemsCompleted: totalItems > 0 && completedItems === totalItems
    };
  }

  /**
   * Export shopping list to text format
   */
  static exportToText(shoppingList: ShoppingList): string {
    let text = `📋 ${shoppingList.name}\n`;
    
    if (shoppingList.description) {
      text += `${shoppingList.description}\n`;
    }
    
    text += `\nCréé le: ${shoppingList.createdAt.toLocaleDateString('fr-FR')}\n\n`;

    const groupedItems = this.groupItemsByCategory(shoppingList.items);
    const sortedCategories = Object.keys(groupedItems).sort((a, b) => 
      this.getCategoryOrder(a) - this.getCategoryOrder(b)
    );

    for (const category of sortedCategories) {
      const items = groupedItems[category];
      const categoryName = this.getCategoryDisplayName(category);
      
      text += `## ${categoryName}\n`;
      
      for (const item of items) {
        const checkbox = item.isCompleted ? '✅' : '☐';
        const quantity = item.quantity && item.unit ? 
          ` (${item.quantity} ${item.unit})` : '';
        const notes = item.notes ? ` - ${item.notes}` : '';
        
        text += `${checkbox} ${item.ingredientName}${quantity}${notes}\n`;
      }
      
      text += '\n';
    }

    const stats = this.getCompletionStats(shoppingList.items);
    text += `📊 Progression: ${stats.completedItems}/${stats.totalItems} articles (${stats.completionPercentage}%)\n`;

    return text;
  }

  /**
   * Generate a default shopping list name
   */
  static generateDefaultListName(recipeNames?: string[]): string {
    const date = new Date().toLocaleDateString('fr-FR');
    
    if (!recipeNames || recipeNames.length === 0) {
      return `Liste de courses - ${date}`;
    }
    
    if (recipeNames.length === 1) {
      return `Liste pour "${recipeNames[0]}"`;
    }
    
    if (recipeNames.length === 2) {
      return `Liste pour "${recipeNames[0]}" et "${recipeNames[1]}"`;
    }
    
    return `Liste pour ${recipeNames.length} recettes - ${date}`;
  }

  /**
   * Validate ingredient category and provide default if invalid
   */
  static normalizeCategory(category: string): string {
    const validCategories = [
      'fruits',
      'legumes', 
      'viande',
      'produits_laitiers',
      'epicerie',
      'peche',
      'autres'
    ];

    const normalizedCategory = category?.toLowerCase().trim();
    
    if (validCategories.includes(normalizedCategory)) {
      return normalizedCategory;
    }
    
    return 'autres'; // Default category
  }

  /**
   * Get category display name in French
   */
  static getCategoryDisplayName(category: string): string {
    const categoryNames: { [key: string]: string } = {
      'fruits': '🍎 Fruits',
      'legumes': '🥕 Légumes',
      'viande': '🥩 Viande & Poisson',
      'peche': '🐟 Poisson & Fruits de mer',
      'produits_laitiers': '🥛 Produits laitiers',
      'epicerie': '🏪 Épicerie',
      'autres': '📦 Autres'
    };

    return categoryNames[category] || `📦 ${category}`;
  }

  /**
   * Get category sorting order (for display)
   */
  static getCategoryOrder(category: string): number {
    const order: { [key: string]: number } = {
      'legumes': 1,
      'fruits': 2,
      'viande': 3,
      'peche': 4,
      'produits_laitiers': 5,
      'epicerie': 6,
      'autres': 999
    };

    return order[category] || 999;
  }

  /**
   * Search shopping list items
   */
  static searchItems(items: ShoppingListItem[], query: string): ShoppingListItem[] {
    if (!query || query.trim().length === 0) {
      return items;
    }

    const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(query).toLowerCase();
    
    return items.filter(item => 
      item.ingredientName.toLowerCase().includes(sanitizedQuery) ||
      item.category.toLowerCase().includes(sanitizedQuery) ||
      (item.notes && item.notes.toLowerCase().includes(sanitizedQuery)) ||
      (item.unit && item.unit.toLowerCase().includes(sanitizedQuery))
    );
  }

  /**
   * Validate shopping list before creation
   */
  static validateShoppingListData(name: string, items: CreateShoppingListItemInput[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate name
    if (!name || name.trim().length === 0) {
      errors.push('Le nom de la liste est requis');
    } else if (name.trim().length > 200) {
      errors.push('Le nom de la liste ne peut pas dépasser 200 caractères');
    }

    // Validate items
    if (items.length === 0) {
      errors.push('La liste doit contenir au moins un article');
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.ingredientName || item.ingredientName.trim().length === 0) {
        errors.push(`Article ${i + 1}: Le nom de l'ingrédient est requis`);
      }
      
      if (!item.category || item.category.trim().length === 0) {
        errors.push(`Article ${i + 1}: La catégorie est requise`);
      }
      
      if (item.quantity !== undefined && (item.quantity < 0 || item.quantity > 10000)) {
        errors.push(`Article ${i + 1}: La quantité doit être entre 0 et 10000`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge duplicate ingredients in a shopping list
   */
  static mergeDuplicateItems(items: ShoppingListItem[]): ShoppingListItem[] {
    const mergedMap = new Map<string, ShoppingListItem>();

    for (const item of items) {
      const key = `${item.ingredientName.toLowerCase()}-${(item.unit || '').toLowerCase()}`;
      
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        existing.quantity = (existing.quantity || 0) + (item.quantity || 0);
        
        // Keep notes from both items if different
        if (item.notes && existing.notes !== item.notes) {
          existing.notes = existing.notes ? 
            `${existing.notes}; ${item.notes}` : item.notes;
        }
      } else {
        mergedMap.set(key, { ...item });
      }
    }

    return Array.from(mergedMap.values());
  }

  /**
   * Calculate estimated shopping time based on items
   */
  static estimateShoppingTime(items: ShoppingListItem[]): {
    estimatedMinutes: number;
    estimatedTimeText: string;
  } {
    // Base time: 5 minutes
    let estimatedMinutes = 5;
    
    // Add 1 minute per 3 items
    estimatedMinutes += Math.ceil(items.length / 3);
    
    // Add extra time for different categories (need to visit different aisles)
    const categories = new Set(items.map(item => item.category));
    estimatedMinutes += Math.max(0, categories.size - 2) * 2;

    // Format time text
    let estimatedTimeText: string;
    if (estimatedMinutes < 60) {
      estimatedTimeText = `${estimatedMinutes} min`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      estimatedTimeText = minutes > 0 ? `${hours}h${minutes}min` : `${hours}h`;
    }

    return {
      estimatedMinutes,
      estimatedTimeText
    };
  }
}