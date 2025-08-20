import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { 
  Ingredient, 
  IngredientFilters, 
  CreateIngredientInput, 
  UpdateIngredientInput,
  IngredientCategory,
  IngredientRow,
  FindAllParams
} from '../types';
import { ValidationUtils } from '../utils/validation';
import { SecureErrorHandler } from '../utils/errorHandler';
import uuid from 'react-native-uuid';

export class IngredientRepository {
  private db: SQLiteDatabase;

  constructor() {
    this.db = getDatabase();
  }

  async findAll(filters?: IngredientFilters): Promise<Ingredient[]> {
    try {
      // Validate and sanitize inputs
      const sanitizedFilters = this.sanitizeFilters(filters);
      
      let query = `
        SELECT 
          i.*,
          CASE WHEN f.ingredient_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
        FROM ingredients i
        LEFT JOIN favorites f ON i.id = f.ingredient_id
      `;
      const params: (string | number)[] = [];
      const conditions: string[] = [];

      // Apply filters with proper validation
      if (sanitizedFilters?.category && 
          sanitizedFilters.category !== 'favoris' && 
          sanitizedFilters.category !== 'myproduct' && 
          sanitizedFilters.category !== 'saison') {
        conditions.push('i.category = ?');
        params.push(sanitizedFilters.category);
      }

      if (sanitizedFilters?.searchQuery) {
        const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(sanitizedFilters.searchQuery);
        if (sanitizedQuery) {
          conditions.push('i.name LIKE ? OR i.subcategory LIKE ? OR i.description LIKE ?');
          const searchTerm = `%${sanitizedQuery}%`;
          params.push(searchTerm, searchTerm, searchTerm);
        }
      }

      if (sanitizedFilters?.favoritesOnly) {
        conditions.push('f.ingredient_id IS NOT NULL');
      }

      if (sanitizedFilters?.userCreatedOnly) {
        conditions.push('i.is_user_created = 1');
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY i.name ASC';

      const result = await this.db.getAllAsync(query, params) as IngredientRow[];
      return result.map(row => this.mapRowToIngredient(row));
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findAll',
        'ingredients'
      );
    }
  }

  private sanitizeFilters(filters?: IngredientFilters): IngredientFilters | undefined {
    if (!filters) return undefined;

    return {
      ...filters,
      searchQuery: filters.searchQuery ? ValidationUtils.sanitizeSearchQuery(filters.searchQuery) : undefined
    };
  }

  async findById(id: string): Promise<Ingredient | null> {
    try {
      // Validate UUID
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid ingredient ID format');
      }

      const query = `
        SELECT 
          i.*,
          CASE WHEN f.ingredient_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
        FROM ingredients i
        LEFT JOIN favorites f ON i.id = f.ingredient_id
        WHERE i.id = ?
      `;
      const result = await this.db.getFirstAsync(query, [id]) as IngredientRow | null;
      return result ? this.mapRowToIngredient(result) : null;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findById',
        'ingredient'
      );
    }
  }

  async create(input: CreateIngredientInput): Promise<Ingredient> {
    try {
      // Validate input data
      const validation = ValidationUtils.validateCreateIngredientInput(input);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const id = uuid.v4();
      const now = new Date().toISOString();
      
      await this.db.runAsync(
        `INSERT INTO ingredients (
          id, name, category, subcategory, units, 
          seasonal_months, seasonal_peak_months, seasonal_season,
          is_user_created, description, tags, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.name.trim(),
          input.category,
          input.subcategory.trim(),
          JSON.stringify(input.units),
          input.seasonal ? JSON.stringify(input.seasonal.months) : null,
          input.seasonal ? JSON.stringify(input.seasonal.peak_months) : null,
          input.seasonal ? input.seasonal.season : null,
          1, // User created
          input.description?.trim() || null,
          input.tags ? JSON.stringify(input.tags) : null,
          input.notes?.trim() || null,
          now,
          now
        ]
      );

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to create ingredient');
      }
      return created;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'create',
        'ingredient'
      );
    }
  }

  async update(input: UpdateIngredientInput): Promise<Ingredient> {
    try {
      // Validate ID
      if (!ValidationUtils.isValidUUID(input.id)) {
        throw new Error('Invalid ingredient ID format');
      }

      const updateFields: string[] = [];
      const params: (string | number | null)[] = [];

      if (input.name) {
        updateFields.push('name = ?');
        params.push(input.name);
      }
      if (input.category) {
        updateFields.push('category = ?');
        params.push(input.category);
      }
      if (input.subcategory) {
        updateFields.push('subcategory = ?');
        params.push(input.subcategory);
      }
      if (input.units) {
        updateFields.push('units = ?');
        params.push(JSON.stringify(input.units));
      }
      if (input.seasonal !== undefined) {
        updateFields.push('seasonal_months = ?, seasonal_peak_months = ?, seasonal_season = ?');
        if (input.seasonal) {
          params.push(
            JSON.stringify(input.seasonal.months),
            JSON.stringify(input.seasonal.peak_months),
            input.seasonal.season
          );
        } else {
          params.push(null, null, null);
        }
      }
      if (input.description !== undefined) {
        updateFields.push('description = ?');
        params.push(input.description);
      }
      if (input.tags !== undefined) {
        updateFields.push('tags = ?');
        params.push(input.tags ? JSON.stringify(input.tags) : null);
      }
      if (input.notes !== undefined) {
        updateFields.push('notes = ?');
        params.push(input.notes);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(input.id);
      const query = `UPDATE ingredients SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await this.db.runAsync(query, params);
      
      const updated = await this.findById(input.id);
      if (!updated) {
        throw new Error('Failed to update ingredient');
      }
      return updated;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'update',
        'ingredient'
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Validate ID
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid ingredient ID format');
      }

      await this.db.runAsync('DELETE FROM ingredients WHERE id = ?', [id]);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'delete',
        'ingredient'
      );
    }
  }

  async search(query: string): Promise<Ingredient[]> {
    return this.findAll({ searchQuery: query });
  }

  async findByCategory(category: IngredientCategory): Promise<Ingredient[]> {
    return this.findAll({ category });
  }

  async findFavorites(): Promise<Ingredient[]> {
    return this.findAll({ favoritesOnly: true });
  }

  async findUserCreated(): Promise<Ingredient[]> {
    return this.findAll({ userCreatedOnly: true });
  }

  async bulkInsert(ingredients: Ingredient[]): Promise<void> {
    try {
      await this.db.withTransactionAsync(async () => {
        for (const ingredient of ingredients) {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO ingredients (
              id, name, category, subcategory, units, 
              seasonal_months, seasonal_peak_months, seasonal_season,
              is_user_created, description, tags, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ingredient.id,
              ingredient.name,
              ingredient.category,
              ingredient.subcategory,
              JSON.stringify(ingredient.units),
              ingredient.seasonal ? JSON.stringify(ingredient.seasonal.months) : null,
              ingredient.seasonal ? JSON.stringify(ingredient.seasonal.peak_months) : null,
              ingredient.seasonal ? ingredient.seasonal.season : null,
              ingredient.isUserCreated ? 1 : 0,
              ingredient.description || null,
              ingredient.tags ? JSON.stringify(ingredient.tags) : null,
              ingredient.notes || null,
              ingredient.createdAt.toISOString(),
              ingredient.updatedAt.toISOString()
            ]
          );
        }
      });
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'bulkInsert',
        'ingredients'
      );
    }
  }

  private mapRowToIngredient(row: IngredientRow): Ingredient {
    return {
      id: row.id,
      name: row.name,
      category: row.category as IngredientCategory,
      subcategory: row.subcategory,
      units: JSON.parse(row.units),
      seasonal: row.seasonal_months && row.seasonal_season ? {
        months: JSON.parse(row.seasonal_months),
        peak_months: JSON.parse(row.seasonal_peak_months || '[]'),
        season: row.seasonal_season
      } : undefined,
      isUserCreated: row.is_user_created === 1,
      isFavorite: row.is_favorite === 1,
      description: row.description || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      notes: row.notes || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}