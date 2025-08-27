import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { ValidationUtils } from '../utils/validation';
import { SecureErrorHandler } from '../utils/errorHandler';
import uuid from 'react-native-uuid';
import {
  ShoppingList,
  ShoppingListItem,
  CreateShoppingListInput,
  UpdateShoppingListInput,
  CreateShoppingListItemInput,
  UpdateShoppingListItemInput,
  ShoppingListFilters,
  ShoppingListRow,
  ShoppingListItemRow,
  Ingredient
} from '../types';

export class ShoppingListRepository {
  private db: SQLiteDatabase;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get all shopping lists with their items
   */
  async findAll(filters: ShoppingListFilters = {}): Promise<ShoppingList[]> {
    try {
      const { searchQuery } = filters;

      let query = `
        SELECT 
          sl.id,
          sl.name,
          sl.description,
          sl.created_at,
          sl.updated_at
        FROM shopping_lists sl
      `;

      const params: any[] = [];

      if (searchQuery) {
        const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(searchQuery);
        query += ' WHERE sl.name LIKE ?';
        params.push(`%${sanitizedQuery}%`);
      }

      query += ' ORDER BY sl.updated_at DESC';

      const listRows = await this.db.getAllAsync(query, params) as ShoppingListRow[];

      const shoppingLists: ShoppingList[] = [];

      for (const listRow of listRows) {
        const items = await this.findItemsByListId(listRow.id);
        
        shoppingLists.push({
          id: listRow.id,
          name: listRow.name,
          description: listRow.description || undefined,
          items,
          createdAt: new Date(listRow.created_at),
          updatedAt: new Date(listRow.updated_at)
        });
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

  /**
   * Find shopping list by ID with items
   */
  async findById(id: string): Promise<ShoppingList | null> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        SecureErrorHandler.handleValidationError('Invalid shopping list ID format');
      }

      const query = `
        SELECT 
          id,
          name,
          description,
          created_at,
          updated_at
        FROM shopping_lists 
        WHERE id = ?
      `;

      const row = await this.db.getFirstAsync(query, [id]) as ShoppingListRow | null;

      if (!row) {
        return null;
      }

      const items = await this.findItemsByListId(id);

      return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        items,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findById',
        'shopping_lists'
      );
    }
  }

  /**
   * Find shopping list items by list ID
   */
  async findItemsByListId(listId: string, filters: ShoppingListFilters = {}): Promise<ShoppingListItem[]> {
    try {
      if (!ValidationUtils.isValidUUID(listId)) {
        SecureErrorHandler.handleValidationError('Invalid list ID format');
      }

      const { completedItemsOnly, activeItemsOnly } = filters;

      let query = `
        SELECT 
          sli.id,
          sli.list_id,
          sli.ingredient_id,
          sli.custom_name,
          sli.quantity,
          sli.unit,
          sli.is_completed,
          sli.category,
          sli.notes,
          sli.order_index,
          sli.created_at,
          i.name as ingredient_name,
          i.category as ingredient_category,
          i.subcategory as ingredient_subcategory,
          i.units as ingredient_units,
          i.seasonal_months,
          i.seasonal_peak_months,
          i.seasonal_season,
          i.is_user_created,
          i.description as ingredient_description,
          i.tags as ingredient_tags,
          i.notes as ingredient_notes,
          i.created_at as ingredient_created_at,
          i.updated_at as ingredient_updated_at
        FROM shopping_list_items sli
        LEFT JOIN ingredients i ON sli.ingredient_id = i.id
        WHERE sli.list_id = ?
      `;

      const params: any[] = [listId];

      if (completedItemsOnly) {
        query += ' AND sli.is_completed = 1';
      } else if (activeItemsOnly) {
        query += ' AND sli.is_completed = 0';
      }

      query += ' ORDER BY sli.order_index ASC, sli.created_at ASC';

      const rows = await this.db.getAllAsync(query, params) as any[];

      return rows.map(row => {
        const item: ShoppingListItem = {
          id: row.id,
          listId: row.list_id,
          quantity: row.quantity,
          unit: row.unit,
          isCompleted: row.is_completed === 1,
          category: row.category,
          notes: row.notes || undefined,
          orderIndex: row.order_index,
          createdAt: new Date(row.created_at)
        };

        if (row.ingredient_id) {
          item.ingredientId = row.ingredient_id;
          item.ingredient = {
            id: row.ingredient_id,
            name: row.ingredient_name,
            category: row.ingredient_category,
            subcategory: row.ingredient_subcategory,
            units: JSON.parse(row.ingredient_units || '[]'),
            seasonal: (row.seasonal_months || row.seasonal_peak_months || row.seasonal_season) ? {
              months: JSON.parse(row.seasonal_months || '[]'),
              peak_months: JSON.parse(row.seasonal_peak_months || '[]'),
              season: row.seasonal_season
            } : undefined,
            isUserCreated: row.is_user_created === 1,
            isFavorite: false, // We'll handle favorites separately if needed
            description: row.ingredient_description || undefined,
            tags: row.ingredient_tags ? JSON.parse(row.ingredient_tags) : undefined,
            notes: row.ingredient_notes || undefined,
            createdAt: new Date(row.ingredient_created_at),
            updatedAt: new Date(row.ingredient_updated_at)
          };
        } else {
          item.customName = row.custom_name;
        }

        return item;
      });
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findItemsByListId',
        'shopping_list_items'
      );
    }
  }

  /**
   * Create a new shopping list with items
   */
  async create(input: CreateShoppingListInput): Promise<ShoppingList> {
    try {
      const validation = ValidationUtils.validateString(input.name, {
        minLength: 1,
        maxLength: 100,
        required: true
      });

      if (!validation.isValid) {
        SecureErrorHandler.handleValidationError(
          `Shopping list name validation failed: ${validation.errors.join(', ')}`
        );
      }

      const listId = uuid.v4() as string;
      const now = new Date().toISOString();

      await this.db.execAsync('BEGIN TRANSACTION;');

      try {
        // Create the shopping list
        await this.db.runAsync(`
          INSERT INTO shopping_lists (
            id, name, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          listId,
          input.name,
          input.description || null,
          now,
          now
        ]);

        // Create the items
        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          await this.createItem(listId, { ...item, orderIndex: i });
        }

        await this.db.execAsync('COMMIT;');

        const createdList = await this.findById(listId);
        if (!createdList) {
          throw new Error('Failed to retrieve created shopping list');
        }

        return createdList;
      } catch (error) {
        await this.db.execAsync('ROLLBACK;');
        throw error;
      }
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'create',
        'shopping_lists'
      );
    }
  }

  /**
   * Update a shopping list
   */
  async update(input: UpdateShoppingListInput): Promise<ShoppingList> {
    try {
      if (!ValidationUtils.isValidUUID(input.id)) {
        SecureErrorHandler.handleValidationError('Invalid shopping list ID format');
      }

      const existing = await this.findById(input.id);
      if (!existing) {
        throw new Error('Shopping list not found');
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (input.name !== undefined) {
        const validation = ValidationUtils.validateString(input.name, {
          minLength: 1,
          maxLength: 100,
          required: true
        });

        if (!validation.isValid) {
          SecureErrorHandler.handleValidationError(
            `Shopping list name validation failed: ${validation.errors.join(', ')}`
          );
        }

        updates.push('name = ?');
        params.push(input.name);
      }

      if (input.description !== undefined) {
        updates.push('description = ?');
        params.push(input.description || null);
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(input.id);

        await this.db.runAsync(
          `UPDATE shopping_lists SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      // Handle items update if provided
      if (input.items) {
        await this.db.execAsync('BEGIN TRANSACTION;');
        try {
          // Delete existing items
          await this.db.runAsync('DELETE FROM shopping_list_items WHERE list_id = ?', [input.id]);

          // Create new items
          for (let i = 0; i < input.items.length; i++) {
            const item = input.items[i];
            await this.createItem(input.id, { ...item, orderIndex: i });
          }

          await this.db.execAsync('COMMIT;');
        } catch (error) {
          await this.db.execAsync('ROLLBACK;');
          throw error;
        }
      }

      const updatedList = await this.findById(input.id);
      if (!updatedList) {
        throw new Error('Failed to retrieve updated shopping list');
      }

      return updatedList;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'update',
        'shopping_lists'
      );
    }
  }

  /**
   * Delete a shopping list and all its items
   */
  async delete(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        SecureErrorHandler.handleValidationError('Invalid shopping list ID format');
      }

      const result = await this.db.runAsync('DELETE FROM shopping_lists WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error('Shopping list not found');
      }
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'delete',
        'shopping_lists'
      );
    }
  }

  /**
   * Create a shopping list item
   */
  private async createItem(listId: string, input: CreateShoppingListItemInput): Promise<void> {
    const itemId = uuid.v4() as string;
    const now = new Date().toISOString();

    // Validate that either ingredientId or customName is provided
    if (!input.ingredientId && !input.customName) {
      SecureErrorHandler.handleValidationError('Either ingredientId or customName must be provided');
    }

    if (input.ingredientId && !ValidationUtils.isValidUUID(input.ingredientId)) {
      SecureErrorHandler.handleValidationError('Invalid ingredient ID format');
    }

    if (input.customName) {
      const validation = ValidationUtils.validateString(input.customName, {
        minLength: 1,
        maxLength: 100,
        required: true
      });

      if (!validation.isValid) {
        SecureErrorHandler.handleValidationError(
          `Custom name validation failed: ${validation.errors.join(', ')}`
        );
      }
    }

    await this.db.runAsync(`
      INSERT INTO shopping_list_items (
        id, list_id, ingredient_id, custom_name, quantity, unit,
        is_completed, category, notes, order_index, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      itemId,
      listId,
      input.ingredientId || null,
      input.customName || null,
      input.quantity,
      input.unit,
      0, // Always start as not completed
      input.category,
      input.notes || null,
      input.orderIndex || 0,
      now
    ]);
  }

  /**
   * Update a shopping list item
   */
  async updateItem(input: UpdateShoppingListItemInput): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(input.id)) {
        SecureErrorHandler.handleValidationError('Invalid shopping list item ID format');
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (input.quantity !== undefined) {
        updates.push('quantity = ?');
        params.push(input.quantity);
      }

      if (input.unit !== undefined) {
        updates.push('unit = ?');
        params.push(input.unit);
      }

      if (input.isCompleted !== undefined) {
        updates.push('is_completed = ?');
        params.push(input.isCompleted ? 1 : 0);
      }

      if (input.notes !== undefined) {
        updates.push('notes = ?');
        params.push(input.notes || null);
      }

      if (input.orderIndex !== undefined) {
        updates.push('order_index = ?');
        params.push(input.orderIndex);
      }

      if (updates.length > 0) {
        params.push(input.id);

        const result = await this.db.runAsync(
          `UPDATE shopping_list_items SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        if (result.changes === 0) {
          throw new Error('Shopping list item not found');
        }
      }
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'updateItem',
        'shopping_list_items'
      );
    }
  }

  /**
   * Delete a shopping list item
   */
  async deleteItem(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        SecureErrorHandler.handleValidationError('Invalid shopping list item ID format');
      }

      const result = await this.db.runAsync('DELETE FROM shopping_list_items WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error('Shopping list item not found');
      }
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'deleteItem',
        'shopping_list_items'
      );
    }
  }

  /**
   * Toggle completion status of a shopping list item
   */
  async toggleItemCompletion(id: string): Promise<boolean> {
    try {
      if (!ValidationUtils.isValidUUID(id)) {
        SecureErrorHandler.handleValidationError('Invalid shopping list item ID format');
      }

      // Get current status
      const currentItem = await this.db.getFirstAsync(
        'SELECT is_completed FROM shopping_list_items WHERE id = ?',
        [id]
      ) as { is_completed: number } | null;

      if (!currentItem) {
        throw new Error('Shopping list item not found');
      }

      const newStatus = currentItem.is_completed === 0 ? 1 : 0;

      await this.db.runAsync(
        'UPDATE shopping_list_items SET is_completed = ? WHERE id = ?',
        [newStatus, id]
      );

      return newStatus === 1;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'toggleItemCompletion',
        'shopping_list_items'
      );
    }
  }

  /**
   * Clear completed items from a shopping list
   */
  async clearCompletedItems(listId: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(listId)) {
        SecureErrorHandler.handleValidationError('Invalid list ID format');
      }

      await this.db.runAsync(
        'DELETE FROM shopping_list_items WHERE list_id = ? AND is_completed = 1',
        [listId]
      );

      // Update the list's updated_at timestamp
      await this.db.runAsync(
        'UPDATE shopping_lists SET updated_at = ? WHERE id = ?',
        [new Date().toISOString(), listId]
      );
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'clearCompletedItems',
        'shopping_list_items'
      );
    }
  }
}