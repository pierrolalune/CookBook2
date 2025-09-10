import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { 
  ShoppingListItem,
  CreateShoppingListItemInput, 
  UpdateShoppingListItemInput,
  ShoppingListItemRow,
  Ingredient,
  IngredientCategory
} from '../types';
import { ValidationUtils, ValidationResult } from '../utils/validation';
import { SecureErrorHandler } from '../utils/errorHandler';
import uuid from 'react-native-uuid';

export class ShoppingListItemRepository {
  private db: SQLiteDatabase;

  constructor() {
    this.db = getDatabase();
  }

  async findByShoppingListId(shoppingListId: string): Promise<ShoppingListItem[]> {
    try {
      if (!ValidationUtils.isValidUUID(shoppingListId)) {
        throw new Error('Invalid shopping list ID format');
      }

      const query = `
        SELECT 
          sli.*,
          i.name as ingredient_full_name,
          i.category as ingredient_category,
          i.units as ingredient_units
        FROM shopping_list_items sli
        LEFT JOIN ingredients i ON sli.ingredient_id = i.id
        WHERE sli.shopping_list_id = ?
        ORDER BY sli.order_index, sli.created_at
      `;

      const rows = await this.db.getAllAsync(query, [shoppingListId]) as (ShoppingListItemRow & {
        ingredient_full_name?: string;
        ingredient_category?: string;
        ingredient_units?: string;
      })[];

      return rows.map(this.mapRowToShoppingListItem);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findByShoppingListId',
        'shopping_list_items'
      );
    }
  }

  async findById(id: string): Promise<ShoppingListItem | null> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid item ID format');
      }

      const query = `
        SELECT 
          sli.*,
          i.name as ingredient_full_name,
          i.category as ingredient_category,
          i.units as ingredient_units
        FROM shopping_list_items sli
        LEFT JOIN ingredients i ON sli.ingredient_id = i.id
        WHERE sli.id = ?
      `;

      const row = await this.db.getFirstAsync(query, [id]) as (ShoppingListItemRow & {
        ingredient_full_name?: string;
        ingredient_category?: string;
        ingredient_units?: string;
      }) | null;

      return row ? this.mapRowToShoppingListItem(row) : null;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findById',
        'shopping_list_items'
      );
    }
  }

  async create(shoppingListId: string, input: CreateShoppingListItemInput): Promise<ShoppingListItem> {
    try {
      if (!ValidationUtils.isValidUUID(shoppingListId)) {
        throw new Error('Invalid shopping list ID format');
      }

      const validation = ValidationUtils.validateCreateShoppingListItemInput(input);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const id = uuid.v4() as string;
      const now = new Date().toISOString();

      const query = `
        INSERT INTO shopping_list_items (
          id, shopping_list_id, ingredient_id, ingredient_name, quantity, unit, 
          category, is_completed, notes, order_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.runAsync(query, [
        id,
        shoppingListId,
        input.ingredientId || null,
        input.ingredientName,
        input.quantity || null,
        input.unit || null,
        input.category,
        0, // is_completed starts as false
        input.notes || null,
        input.orderIndex || 0,
        now
      ]);

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to retrieve created shopping list item');
      }

      return created;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'create',
        'shopping_list_items'
      );
    }
  }

  async update(input: UpdateShoppingListItemInput): Promise<ShoppingListItem> {
    try {
      const validation = this.validateUpdateShoppingListItemInput(input);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (input.ingredientName !== undefined) {
        updates.push('ingredient_name = ?');
        params.push(input.ingredientName);
      }

      if (input.quantity !== undefined) {
        updates.push('quantity = ?');
        params.push(input.quantity);
      }

      if (input.unit !== undefined) {
        updates.push('unit = ?');
        params.push(input.unit);
      }

      if (input.category !== undefined) {
        updates.push('category = ?');
        params.push(input.category);
      }

      if (input.isCompleted !== undefined) {
        updates.push('is_completed = ?');
        params.push(input.isCompleted ? 1 : 0);
      }

      if (input.notes !== undefined) {
        updates.push('notes = ?');
        params.push(input.notes);
      }

      if (input.orderIndex !== undefined) {
        updates.push('order_index = ?');
        params.push(input.orderIndex);
      }

      if (updates.length === 0) {
        // No updates provided, just return the current item
        const existing = await this.findById(input.id);
        if (!existing) {
          throw new Error('Shopping list item not found');
        }
        return existing;
      }

      params.push(input.id);

      const query = `UPDATE shopping_list_items SET ${updates.join(', ')} WHERE id = ?`;
      await this.db.runAsync(query, params);

      const updated = await this.findById(input.id);
      if (!updated) {
        throw new Error('Shopping list item not found after update');
      }

      return updated;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'update',
        'shopping_list_items'
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid item ID format');
      }

      const query = 'DELETE FROM shopping_list_items WHERE id = ?';
      await this.db.runAsync(query, [id]);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'delete',
        'shopping_list_items'
      );
    }
  }

  async toggleCompleted(id: string): Promise<ShoppingListItem> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid item ID format');
      }

      const current = await this.findById(id);
      if (!current) {
        throw new Error('Shopping list item not found');
      }

      return await this.update({
        id,
        isCompleted: !current.isCompleted
      });
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'toggleCompleted',
        'shopping_list_items'
      );
    }
  }

  async bulkUpdateCompleted(ids: string[], isCompleted: boolean): Promise<void> {
    try {
      // Validate all IDs
      for (const id of ids) {
        if (!ValidationUtils.isValidUUID(id)) {
          throw new Error(`Invalid item ID format: ${id}`);
        }
      }

      if (ids.length === 0) {
        return;
      }

      const placeholders = ids.map(() => '?').join(',');
      const query = `UPDATE shopping_list_items SET is_completed = ? WHERE id IN (${placeholders})`;
      const params = [isCompleted ? 1 : 0, ...ids];

      await this.db.runAsync(query, params);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'bulkUpdateCompleted',
        'shopping_list_items'
      );
    }
  }

  async clearCompleted(shoppingListId: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(shoppingListId)) {
        throw new Error('Invalid shopping list ID format');
      }

      const query = 'DELETE FROM shopping_list_items WHERE shopping_list_id = ? AND is_completed = 1';
      await this.db.runAsync(query, [shoppingListId]);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'clearCompleted',
        'shopping_list_items'
      );
    }
  }

  async reorderItems(shoppingListId: string, itemIds: string[]): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(shoppingListId)) {
        throw new Error('Invalid shopping list ID format');
      }

      // Validate all item IDs
      for (const id of itemIds) {
        if (!ValidationUtils.isValidUUID(id)) {
          throw new Error(`Invalid item ID format: ${id}`);
        }
      }

      await this.db.execAsync('BEGIN TRANSACTION;');

      for (let i = 0; i < itemIds.length; i++) {
        const query = 'UPDATE shopping_list_items SET order_index = ? WHERE id = ? AND shopping_list_id = ?';
        await this.db.runAsync(query, [i, itemIds[i], shoppingListId]);
      }

      await this.db.execAsync('COMMIT;');
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'reorderItems',
        'shopping_list_items'
      );
    }
  }

  async getItemsByCategory(shoppingListId: string): Promise<{ [category: string]: ShoppingListItem[] }> {
    try {
      const items = await this.findByShoppingListId(shoppingListId);
      
      const grouped: { [category: string]: ShoppingListItem[] } = {};
      
      for (const item of items) {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      }

      return grouped;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getItemsByCategory',
        'shopping_list_items'
      );
    }
  }

  async getCompletionStats(shoppingListId: string): Promise<{
    totalItems: number;
    completedItems: number;
    completionPercentage: number;
    hasCompletedItems: boolean;
  }> {
    try {
      if (!ValidationUtils.isValidUUID(shoppingListId)) {
        throw new Error('Invalid shopping list ID format');
      }

      const query = `
        SELECT 
          COUNT(*) as total_items,
          SUM(is_completed) as completed_items
        FROM shopping_list_items 
        WHERE shopping_list_id = ?
      `;

      const result = await this.db.getFirstAsync(query, [shoppingListId]) as {
        total_items: number;
        completed_items: number;
      } | null;

      if (!result) {
        return {
          totalItems: 0,
          completedItems: 0,
          completionPercentage: 0,
          hasCompletedItems: false
        };
      }

      const totalItems = result.total_items || 0;
      const completedItems = result.completed_items || 0;
      const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        totalItems,
        completedItems,
        completionPercentage,
        hasCompletedItems: completedItems > 0
      };
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getCompletionStats',
        'shopping_list_items'
      );
    }
  }

  private mapRowToShoppingListItem(row: ShoppingListItemRow & {
    ingredient_full_name?: string;
    ingredient_category?: string;
    ingredient_units?: string;
  }): ShoppingListItem {
    // Parse available units from JSON if they exist
    let availableUnits: string[] | undefined;
    if (row.ingredient_units) {
      try {
        availableUnits = JSON.parse(row.ingredient_units);
      } catch (e) {
        availableUnits = undefined;
      }
    }

    return {
      id: row.id,
      shoppingListId: row.shopping_list_id,
      ingredientId: row.ingredient_id || undefined,
      ingredientName: row.ingredient_name,
      quantity: row.quantity || undefined,
      unit: row.unit || undefined,
      availableUnits,
      category: row.category,
      isCompleted: row.is_completed === 1,
      notes: row.notes || undefined,
      orderIndex: row.order_index,
      createdAt: new Date(row.created_at)
    };
  }

  private validateUpdateShoppingListItemInput(input: UpdateShoppingListItemInput): ValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (!ValidationUtils.isValidUUID(input.id)) {
      errors.push('ID invalide');
    }

    // Validate ingredient name if provided
    if (input.ingredientName !== undefined) {
      const nameValidation = ValidationUtils.validateString(input.ingredientName, {
        required: true,
        minLength: 1,
        maxLength: 200
      });
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors.map(e => `Nom de l'ingrédient: ${e}`));
      }
    }

    // Validate category if provided
    if (input.category !== undefined) {
      const categoryValidation = ValidationUtils.validateString(input.category, {
        required: true,
        minLength: 1,
        maxLength: 100
      });
      if (!categoryValidation.isValid) {
        errors.push(...categoryValidation.errors.map(e => `Catégorie: ${e}`));
      }
    }

    // Validate quantity if provided
    if (input.quantity !== undefined && input.quantity !== null) {
      const quantityValidation = ValidationUtils.validateNumber(input.quantity, {
        min: 0,
        max: 10000
      });
      if (!quantityValidation.isValid) {
        errors.push(...quantityValidation.errors.map(e => `Quantité: ${e}`));
      }
    }

    // Validate unit if provided
    if (input.unit !== undefined && input.unit) {
      const unitValidation = ValidationUtils.validateString(input.unit, {
        maxLength: 50
      });
      if (!unitValidation.isValid) {
        errors.push(...unitValidation.errors.map(e => `Unité: ${e}`));
      }
    }

    // Validate notes if provided
    if (input.notes !== undefined && input.notes) {
      const notesValidation = ValidationUtils.validateString(input.notes, {
        maxLength: 500
      });
      if (!notesValidation.isValid) {
        errors.push(...notesValidation.errors.map(e => `Notes: ${e}`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

