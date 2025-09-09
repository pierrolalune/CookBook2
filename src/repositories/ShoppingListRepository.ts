import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { 
  ShoppingList, 
  ShoppingListItem,
  ShoppingListFilters, 
  CreateShoppingListInput, 
  UpdateShoppingListInput,
  CreateShoppingListItemInput,
  ShoppingListRow,
  ShoppingListItemRow,
  Recipe,
  Ingredient
} from '../types';
import { ValidationUtils } from '../utils/validation';
import { SecureErrorHandler } from '../utils/errorHandler';
import uuid from 'react-native-uuid';

export class ShoppingListRepository {
  private db: SQLiteDatabase;

  constructor() {
    this.db = getDatabase();
  }

  async findAll(filters?: ShoppingListFilters): Promise<ShoppingList[]> {
    try {
      const sanitizedFilters = this.sanitizeFilters(filters);
      
      let query = `
        SELECT sl.* 
        FROM shopping_lists sl
      `;
      const params: (string | number)[] = [];
      const conditions: string[] = [];

      if (sanitizedFilters?.searchQuery) {
        const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(sanitizedFilters.searchQuery);
        if (sanitizedQuery) {
          conditions.push('(sl.name LIKE ? OR sl.description LIKE ?)');
          const searchParam = `%${sanitizedQuery}%`;
          params.push(searchParam, searchParam);
        }
      }

      if (sanitizedFilters?.completedOnly !== undefined) {
        conditions.push('sl.is_completed = ?');
        params.push(sanitizedFilters.completedOnly ? 1 : 0);
      }

      if (sanitizedFilters?.fromRecipesOnly !== undefined) {
        conditions.push('sl.created_from_recipes = ?');
        params.push(sanitizedFilters.fromRecipesOnly ? 1 : 0);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY sl.updated_at DESC';

      const rows = await this.db.getAllAsync(query, params) as ShoppingListRow[];
      
      // Load items for each shopping list
      const shoppingLists: ShoppingList[] = [];
      for (const row of rows) {
        const items = await this.getItemsForShoppingList(row.id);
        shoppingLists.push(this.mapRowToShoppingList(row, items));
      }

      return shoppingLists;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findAll',
        'shopping_lists'
      );
    }
  }

  async findById(id: string): Promise<ShoppingList | null> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid shopping list ID format');
      }

      const query = 'SELECT * FROM shopping_lists WHERE id = ?';
      const row = await this.db.getFirstAsync(query, [id]) as ShoppingListRow | null;

      if (!row) {
        return null;
      }

      const items = await this.getItemsForShoppingList(id);
      return this.mapRowToShoppingList(row, items);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findById',
        'shopping_lists'
      );
    }
  }

  async create(input: CreateShoppingListInput): Promise<ShoppingList> {
    try {
      const validation = ValidationUtils.validateCreateShoppingListInput(input);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const id = uuid.v4() as string;
      const now = new Date().toISOString();

      await this.db.execAsync('BEGIN TRANSACTION;');

      // Insert shopping list
      const query = `
        INSERT INTO shopping_lists (
          id, name, description, created_from_recipes, is_completed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.runAsync(query, [
        id,
        input.name,
        input.description || null,
        input.createdFromRecipes ? 1 : 0,
        0, // is_completed starts as false
        now,
        now
      ]);

      // Insert items if provided
      if (input.items && input.items.length > 0) {
        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          const itemId = uuid.v4() as string;
          
          const itemQuery = `
            INSERT INTO shopping_list_items (
              id, shopping_list_id, ingredient_id, ingredient_name, quantity, unit, 
              category, is_completed, notes, order_index, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          await this.db.runAsync(itemQuery, [
            itemId,
            id,
            item.ingredientId || null,
            item.ingredientName,
            item.quantity || null,
            item.unit || null,
            item.category,
            0, // is_completed starts as false
            item.notes || null,
            item.orderIndex || i,
            now
          ]);
        }
      }

      await this.db.execAsync('COMMIT;');

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to retrieve created shopping list');
      }

      return created;
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'create',
        'shopping_lists'
      );
    }
  }

  async update(input: UpdateShoppingListInput): Promise<ShoppingList> {
    try {
      const validation = ValidationUtils.validateUpdateShoppingListInput(input);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        params.push(input.name);
      }

      if (input.description !== undefined) {
        updates.push('description = ?');
        params.push(input.description);
      }

      if (input.isCompleted !== undefined) {
        updates.push('is_completed = ?');
        params.push(input.isCompleted ? 1 : 0);
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());

      params.push(input.id);

      const query = `UPDATE shopping_lists SET ${updates.join(', ')} WHERE id = ?`;
      await this.db.runAsync(query, params);

      const updated = await this.findById(input.id);
      if (!updated) {
        throw new Error('Shopping list not found after update');
      }

      return updated;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'update',
        'shopping_lists'
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid shopping list ID format');
      }

      const query = 'DELETE FROM shopping_lists WHERE id = ?';
      await this.db.runAsync(query, [id]);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'delete',
        'shopping_lists'
      );
    }
  }

  async generateFromRecipes(recipeIds: string[], listName?: string): Promise<ShoppingList> {
    try {
      // Validate recipe IDs
      for (const recipeId of recipeIds) {
        if (!ValidationUtils.isValidUUID(recipeId)) {
          throw new Error(`Invalid recipe ID format: ${recipeId}`);
        }
      }

      // Get all recipe ingredients
      const placeholders = recipeIds.map(() => '?').join(',');
      const query = `
        SELECT 
          ri.ingredient_id,
          ri.quantity,
          ri.unit,
          i.name as ingredient_name,
          i.category,
          r.name as recipe_name
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        JOIN recipes r ON ri.recipe_id = r.id
        WHERE ri.recipe_id IN (${placeholders})
        AND ri.optional = 0
        ORDER BY i.category, i.name
      `;

      const ingredients = await this.db.getAllAsync(query, recipeIds);

      // Consolidate duplicate ingredients
      const consolidatedItems = this.consolidateIngredients(ingredients);

      // Create shopping list
      const input: CreateShoppingListInput = {
        name: listName || `Liste de courses - ${new Date().toLocaleDateString('fr-FR')}`,
        description: `Générée à partir de ${recipeIds.length} recette(s)`,
        createdFromRecipes: true,
        items: consolidatedItems
      };

      return await this.create(input);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'generateFromRecipes',
        'shopping_lists'
      );
    }
  }

  async duplicate(id: string, newName?: string): Promise<ShoppingList> {
    try {
      const original = await this.findById(id);
      if (!original) {
        throw new Error('Shopping list not found');
      }

      const input: CreateShoppingListInput = {
        name: newName || `${original.name} (copie)`,
        description: original.description,
        createdFromRecipes: original.createdFromRecipes,
        items: original.items.map(item => ({
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          notes: item.notes,
          orderIndex: item.orderIndex
        }))
      };

      return await this.create(input);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'duplicate',
        'shopping_lists'
      );
    }
  }

  private async getItemsForShoppingList(shoppingListId: string): Promise<ShoppingListItem[]> {
    const query = `
      SELECT 
        sli.*,
        i.name as ingredient_full_name,
        i.category as ingredient_category
      FROM shopping_list_items sli
      LEFT JOIN ingredients i ON sli.ingredient_id = i.id
      WHERE sli.shopping_list_id = ?
      ORDER BY sli.order_index, sli.created_at
    `;

    const rows = await this.db.getAllAsync(query, [shoppingListId]) as (ShoppingListItemRow & {
      ingredient_full_name?: string;
      ingredient_category?: string;
    })[];

    return rows.map(row => ({
      id: row.id,
      shoppingListId: row.shopping_list_id,
      ingredientId: row.ingredient_id || undefined,
      ingredientName: row.ingredient_name,
      quantity: row.quantity || undefined,
      unit: row.unit || undefined,
      category: row.category,
      isCompleted: row.is_completed === 1,
      notes: row.notes || undefined,
      orderIndex: row.order_index,
      createdAt: new Date(row.created_at)
    }));
  }

  private consolidateIngredients(ingredients: any[]): CreateShoppingListItemInput[] {
    const consolidated = new Map<string, CreateShoppingListItemInput>();
    let orderIndex = 0;

    for (const ingredient of ingredients) {
      const key = `${ingredient.ingredient_id}-${ingredient.unit || 'pièce'}`;
      
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.quantity = (existing.quantity || 0) + (ingredient.quantity || 0);
      } else {
        consolidated.set(key, {
          ingredientId: ingredient.ingredient_id,
          ingredientName: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit || 'pièce',
          category: ingredient.category,
          orderIndex: orderIndex++
        });
      }
    }

    return Array.from(consolidated.values()).sort((a, b) => {
      // Sort by category, then by name
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.ingredientName.localeCompare(b.ingredientName);
    });
  }

  private mapRowToShoppingList(row: ShoppingListRow, items: ShoppingListItem[]): ShoppingList {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdFromRecipes: row.created_from_recipes === 1,
      isCompleted: row.is_completed === 1,
      items,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private sanitizeFilters(filters?: ShoppingListFilters): ShoppingListFilters | undefined {
    if (!filters) return undefined;

    return {
      searchQuery: filters.searchQuery ? ValidationUtils.sanitizeSearchQuery(filters.searchQuery) : undefined,
      completedOnly: filters.completedOnly,
      fromRecipesOnly: filters.fromRecipesOnly
    };
  }
}