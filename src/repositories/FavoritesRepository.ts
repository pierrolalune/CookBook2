import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { FavoriteRow, CountRow } from '../types';
import { ValidationUtils } from '../utils/validation';
import { SecureErrorHandler } from '../utils/errorHandler';
import uuid from 'react-native-uuid';

export interface FavoriteIngredient {
  id: string;
  ingredient_id: string;
  created_at: Date;
}

export class FavoritesRepository {
  private db: SQLiteDatabase;

  constructor() {
    this.db = getDatabase();
  }

  async addFavorite(ingredientId: string): Promise<void> {
    try {
      // Validate ingredient ID
      if (!ValidationUtils.isValidUUID(ingredientId)) {
        throw new Error('Invalid ingredient ID format');
      }

      const id = uuid.v4();
      const now = new Date().toISOString();
      
      await this.db.runAsync(
        'INSERT OR IGNORE INTO favorites (id, ingredient_id, created_at) VALUES (?, ?, ?)',
        [id, ingredientId, now]
      );
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'addFavorite',
        'favorite'
      );
    }
  }

  async removeFavorite(ingredientId: string): Promise<void> {
    try {
      // Validate ingredient ID
      if (!ValidationUtils.isValidUUID(ingredientId)) {
        throw new Error('Invalid ingredient ID format');
      }

      await this.db.runAsync(
        'DELETE FROM favorites WHERE ingredient_id = ?',
        [ingredientId]
      );
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'removeFavorite',
        'favorite'
      );
    }
  }

  async toggleFavorite(ingredientId: string): Promise<boolean> {
    try {
      const isFavorite = await this.isFavorite(ingredientId);
      
      if (isFavorite) {
        await this.removeFavorite(ingredientId);
        return false;
      } else {
        await this.addFavorite(ingredientId);
        return true;
      }
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'toggleFavorite',
        'favorite'
      );
    }
  }

  async isFavorite(ingredientId: string): Promise<boolean> {
    try {
      const result = await this.db.getFirstAsync(
        'SELECT id FROM favorites WHERE ingredient_id = ?',
        [ingredientId]
      );
      return result !== null;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'isFavorite',
        'favorite'
      );
    }
  }

  async getFavoriteIds(): Promise<string[]> {
    try {
      const results = await this.db.getAllAsync(
        'SELECT ingredient_id FROM favorites ORDER BY created_at DESC'
      ) as Pick<FavoriteRow, 'ingredient_id'>[];
      return results.map(row => row.ingredient_id);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getFavoriteIds',
        'favorites'
      );
    }
  }

  async getFavorites(): Promise<FavoriteIngredient[]> {
    try {
      const results = await this.db.getAllAsync(
        'SELECT * FROM favorites ORDER BY created_at DESC'
      ) as FavoriteRow[];
      
      return results.map(row => ({
        id: row.id,
        ingredient_id: row.ingredient_id,
        created_at: new Date(row.created_at)
      }));
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getFavorites',
        'favorites'
      );
    }
  }

  async getFavoriteCount(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM favorites'
      ) as CountRow | null;
      return result?.count || 0;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getFavoriteCount',
        'favorites'
      );
    }
  }

  async clearAllFavorites(): Promise<void> {
    try {
      await this.db.runAsync('DELETE FROM favorites');
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'clearAllFavorites',
        'favorites'
      );
    }
  }
}