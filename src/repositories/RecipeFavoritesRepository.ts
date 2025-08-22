import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { CountRow } from '../types';
import { ValidationUtils } from '../utils/validation';
import { SecureErrorHandler } from '../utils/errorHandler';
import uuid from 'react-native-uuid';

export interface FavoriteRecipe {
  id: string;
  recipe_id: string;
  created_at: Date;
}

interface RecipeFavoriteRow {
  id: string;
  recipe_id: string;
  created_at: string;
}

export class RecipeFavoritesRepository {
  private db: SQLiteDatabase;

  constructor() {
    this.db = getDatabase();
  }

  async addFavorite(recipeId: string): Promise<void> {
    try {
      // Validate recipe ID
      if (!ValidationUtils.isValidUUID(recipeId)) {
        throw new Error('Invalid recipe ID format');
      }

      const id = uuid.v4();
      const now = new Date().toISOString();
      
      await this.db.runAsync(
        'INSERT OR IGNORE INTO recipe_favorites (id, recipe_id, created_at) VALUES (?, ?, ?)',
        [id, recipeId, now]
      );
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'addFavorite',
        'recipe_favorite'
      );
    }
  }

  async removeFavorite(recipeId: string): Promise<void> {
    try {
      // Validate recipe ID
      if (!ValidationUtils.isValidUUID(recipeId)) {
        throw new Error('Invalid recipe ID format');
      }

      await this.db.runAsync(
        'DELETE FROM recipe_favorites WHERE recipe_id = ?',
        [recipeId]
      );
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'removeFavorite',
        'recipe_favorite'
      );
    }
  }

  async toggleFavorite(recipeId: string): Promise<boolean> {
    try {
      const isFavorite = await this.isFavorite(recipeId);
      
      if (isFavorite) {
        await this.removeFavorite(recipeId);
        return false;
      } else {
        await this.addFavorite(recipeId);
        return true;
      }
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'toggleFavorite',
        'recipe_favorite'
      );
    }
  }

  async isFavorite(recipeId: string): Promise<boolean> {
    try {
      const result = await this.db.getFirstAsync(
        'SELECT id FROM recipe_favorites WHERE recipe_id = ?',
        [recipeId]
      );
      return result !== null;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'isFavorite',
        'recipe_favorite'
      );
    }
  }

  async getFavoriteIds(): Promise<string[]> {
    try {
      const results = await this.db.getAllAsync(
        'SELECT recipe_id FROM recipe_favorites ORDER BY created_at DESC'
      ) as Pick<RecipeFavoriteRow, 'recipe_id'>[];
      return results.map(row => row.recipe_id);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getFavoriteIds',
        'recipe_favorites'
      );
    }
  }

  async getFavorites(): Promise<FavoriteRecipe[]> {
    try {
      const results = await this.db.getAllAsync(
        'SELECT * FROM recipe_favorites ORDER BY created_at DESC'
      ) as RecipeFavoriteRow[];
      
      return results.map(row => ({
        id: row.id,
        recipe_id: row.recipe_id,
        created_at: new Date(row.created_at)
      }));
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getFavorites',
        'recipe_favorites'
      );
    }
  }

  async getFavoriteCount(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM recipe_favorites'
      ) as CountRow | null;
      return result?.count || 0;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getFavoriteCount',
        'recipe_favorites'
      );
    }
  }

  async clearAllFavorites(): Promise<void> {
    try {
      await this.db.runAsync('DELETE FROM recipe_favorites');
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'clearAllFavorites',
        'recipe_favorites'
      );
    }
  }
}