import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ShoppingList, ShoppingListItem, IngredientCategory } from '../types';
import { SecureErrorHandler } from './errorHandler';
import { ValidationUtils } from './validation';

export interface ShoppingListExportOptions {
  includeCompletedItems?: boolean;
  includeNotes?: boolean;
  groupByCategory?: boolean;
  format?: 'text' | 'checklist';
}

export class ShoppingListExporter {
  private static readonly EXPORTS_DIR = `${FileSystem.documentDirectory}shopping-list-exports/`;

  /**
   * Initialize export directory
   */
  static async initializeExportDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.EXPORTS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.EXPORTS_DIR, { intermediates: true });
      }
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'initializeExportDirectory' 
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'initialize',
        'export directory'
      );
    }
  }

  /**
   * Export shopping list as text
   */
  static async exportToText(
    shoppingList: ShoppingList, 
    options: ShoppingListExportOptions = {}
  ): Promise<string> {
    try {
      await this.initializeExportDirectory();

      const textContent = this.generateShoppingListText(shoppingList, options);
      const fileName = `${this.sanitizeFileName(shoppingList.name)}_liste_de_courses.txt`;
      const filePath = `${this.EXPORTS_DIR}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, textContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return filePath;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'exportToText',
        resource: shoppingList.id 
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'export',
        'shopping list text'
      );
    }
  }

  /**
   * Share shopping list using Expo sharing
   */
  static async shareShoppingList(
    shoppingList: ShoppingList, 
    options: ShoppingListExportOptions = {}
  ): Promise<void> {
    try {
      // Check if sharing is available
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this platform');
      }

      const filePath = await this.exportToText(shoppingList, options);

      // Use expo-sharing to share the file
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: `Partager la liste: ${shoppingList.name}`,
        UTI: 'public.plain-text'
      });
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'shareShoppingList',
        resource: shoppingList.id
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'share',
        'shopping list'
      );
    }
  }

  /**
   * Generate shopping list text content
   */
  private static generateShoppingListText(
    shoppingList: ShoppingList, 
    options: ShoppingListExportOptions
  ): string {
    const {
      includeCompletedItems = false,
      includeNotes = true,
      groupByCategory = true,
      format = 'checklist'
    } = options;

    let text = '';

    // Header
    text += '🛒 LISTE DE COURSES\n';
    text += '═'.repeat(30) + '\n\n';
    text += `📝 ${shoppingList.name.toUpperCase()}\n`;
    
    if (shoppingList.description) {
      text += `${shoppingList.description}\n`;
    }
    
    text += `📅 Créée le ${shoppingList.createdAt.toLocaleDateString('fr-FR')}\n\n`;

    // Filter items
    let items = shoppingList.items;
    if (!includeCompletedItems) {
      items = items.filter(item => !item.isCompleted);
    }

    if (items.length === 0) {
      text += 'Aucun élément dans cette liste.\n';
      return text;
    }

    // Group by category if requested
    if (groupByCategory) {
      const itemsByCategory = this.groupItemsByCategory(items);
      
      // Define category order for better organization
      const categoryOrder: IngredientCategory[] = [
        'fruits',
        'legumes', 
        'viande',
        'peche',
        'produits_laitiers',
        'epicerie',
        'autres'
      ];

      categoryOrder.forEach(category => {
        const categoryItems = itemsByCategory[category];
        if (categoryItems && categoryItems.length > 0) {
          text += `\n${this.getCategoryIcon(category)} ${this.getCategoryLabel(category).toUpperCase()}\n`;
          text += '─'.repeat(20) + '\n';

          categoryItems.forEach(item => {
            text += this.formatItem(item, format, includeNotes);
          });
        }
      });

      // Handle any remaining categories not in the predefined order
      Object.keys(itemsByCategory).forEach(category => {
        if (!categoryOrder.includes(category as IngredientCategory)) {
          const categoryItems = itemsByCategory[category as IngredientCategory];
          if (categoryItems && categoryItems.length > 0) {
            text += `\n🏪 ${category.toUpperCase()}\n`;
            text += '─'.repeat(20) + '\n';

            categoryItems.forEach(item => {
              text += this.formatItem(item, format, includeNotes);
            });
          }
        }
      });
    } else {
      // Simple list without grouping
      text += `\n📋 ARTICLES (${items.length})\n`;
      text += '─'.repeat(20) + '\n';
      
      items
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach(item => {
          text += this.formatItem(item, format, includeNotes);
        });
    }

    // Footer
    text += `\n\n📊 RÉSUMÉ\n`;
    text += '─'.repeat(15) + '\n';
    text += `• Total d'articles: ${items.length}\n`;
    
    if (includeCompletedItems) {
      const completedItems = shoppingList.items.filter(item => item.isCompleted);
      text += `• Articles cochés: ${completedItems.length}\n`;
      text += `• Articles restants: ${items.length - completedItems.length}\n`;
    }

    text += `\n🕒 Exportée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\n`;
    text += 'Générée par CookBookP 🍽️\n';

    return text;
  }

  /**
   * Format individual item for text export
   */
  private static formatItem(
    item: ShoppingListItem, 
    format: 'text' | 'checklist', 
    includeNotes: boolean
  ): string {
    let itemText = '';

    // Checkbox or bullet point
    const checkbox = format === 'checklist' 
      ? (item.isCompleted ? '✅' : '☐')
      : '•';

    // Item name
    const itemName = item.ingredient?.name || item.customName || 'Article sans nom';
    
    // Quantity and unit
    const quantity = item.quantity % 1 === 0 
      ? item.quantity.toString()
      : item.quantity.toFixed(1).replace(/\.0$/, '');
    
    itemText += `${checkbox} ${itemName} - ${quantity} ${item.unit}`;

    // Strike through completed items if in checklist format
    if (format === 'checklist' && item.isCompleted) {
      // Note: Text strikethrough isn't widely supported in plain text,
      // but we can add visual indicators
      itemText = `~~${itemText}~~`;
    }

    itemText += '\n';

    // Add notes if requested
    if (includeNotes && item.notes) {
      itemText += `    💬 ${item.notes}\n`;
    }

    return itemText;
  }

  /**
   * Group items by category
   */
  private static groupItemsByCategory(items: ShoppingListItem[]): Record<IngredientCategory, ShoppingListItem[]> {
    return items.reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<IngredientCategory, ShoppingListItem[]>);
  }

  /**
   * Get category label in French
   */
  private static getCategoryLabel(category: IngredientCategory): string {
    const labels: Record<IngredientCategory, string> = {
      fruits: 'Fruits',
      legumes: 'Légumes',
      viande: 'Viande & Charcuterie',
      peche: 'Poissons & Fruits de mer',
      produits_laitiers: 'Produits Laitiers',
      epicerie: 'Épicerie',
      autres: 'Autres'
    };
    return labels[category] || category;
  }

  /**
   * Get category icon
   */
  private static getCategoryIcon(category: IngredientCategory): string {
    const icons: Record<IngredientCategory, string> = {
      fruits: '🍎',
      legumes: '🥕',
      viande: '🥩',
      peche: '🐟',
      produits_laitiers: '🥛',
      epicerie: '🏪',
      autres: '📦'
    };
    return icons[category] || '📦';
  }

  /**
   * Sanitize filename for file system
   */
  private static sanitizeFileName(filename: string): string {
    return ValidationUtils.sanitizeString(filename)
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }

  /**
   * Clean up old export files
   */
  static async cleanupOldExports(maxAgeInDays: number = 7): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.EXPORTS_DIR);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(this.EXPORTS_DIR);
      const maxAge = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);

      for (const fileName of files) {
        const filePath = `${this.EXPORTS_DIR}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime && fileInfo.modificationTime < maxAge) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'cleanupOldExports' 
      });
    }
  }

  /**
   * Create a simple shopping list from text
   * This could be useful for quick list creation
   */
  static parseSimpleTextList(text: string, listName: string = 'Liste importée'): {
    name: string;
    items: Array<{
      customName: string;
      quantity: number;
      unit: string;
      category: IngredientCategory;
    }>;
  } {
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));

    const items = lines.map((line, index) => {
      // Try to parse quantity and unit from the line
      // Examples: "2 kg pommes de terre", "500g farine", "1 litre lait"
      const quantityMatch = line.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)\s*(.+)$/);
      
      if (quantityMatch) {
        const [, quantityStr, unit, itemName] = quantityMatch;
        return {
          customName: itemName.trim(),
          quantity: parseFloat(quantityStr),
          unit: unit || 'unité',
          category: 'epicerie' as IngredientCategory // Default category
        };
      } else {
        // No quantity found, assume 1 unit
        return {
          customName: line,
          quantity: 1,
          unit: 'unité',
          category: 'epicerie' as IngredientCategory
        };
      }
    });

    return {
      name: listName,
      items
    };
  }
}