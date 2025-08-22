import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { 
  Recipe, 
  RecipeFilters, 
  CreateRecipeInput, 
  UpdateRecipeInput,
  RecipeCategory,
  RecipeDifficulty,
  RecipeRow,
  RecipeIngredientRow,
  RecipeInstructionRow,
  RecipeUsageRow,
  RecipeIngredient,
  RecipeInstruction,
  RecipeUsage,
  RecipeUsageStats,
  IngredientUsageStats,
  CreateRecipeIngredientInput,
  CreateRecipeInstructionInput
} from '../types';
import { ValidationUtils } from '../utils/validation';
import { SecureErrorHandler } from '../utils/errorHandler';
import uuid from 'react-native-uuid';
import { IngredientRepository } from './IngredientRepository';
import { RecipeFavoritesRepository } from './RecipeFavoritesRepository';

export class RecipeRepository {
  private db: SQLiteDatabase;
  private ingredientRepository: IngredientRepository;
  private favoritesRepository: RecipeFavoritesRepository;

  constructor() {
    this.db = getDatabase();
    this.ingredientRepository = new IngredientRepository();
    this.favoritesRepository = new RecipeFavoritesRepository();
  }

  async findAll(filters?: RecipeFilters): Promise<Recipe[]> {
    try {
      // Validate and sanitize inputs
      const sanitizedFilters = this.sanitizeFilters(filters);
      
      let query = `
        SELECT DISTINCT r.*
        FROM recipes r
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      `;
      const params: (string | number)[] = [];
      const conditions: string[] = [];

      // Apply filters with proper validation
      if (sanitizedFilters?.category) {
        conditions.push('r.category = ?');
        params.push(sanitizedFilters.category);
      }

      if (sanitizedFilters?.difficulty) {
        conditions.push('r.difficulty = ?');
        params.push(sanitizedFilters.difficulty);
      }

      if (sanitizedFilters?.searchQuery) {
        const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(sanitizedFilters.searchQuery);
        if (sanitizedQuery) {
          conditions.push('(r.name LIKE ? OR r.description LIKE ? OR i.name LIKE ?)');
          const searchTerm = `%${sanitizedQuery}%`;
          params.push(searchTerm, searchTerm, searchTerm);
        }
      }

      if (sanitizedFilters?.maxPrepTime) {
        conditions.push('(r.prep_time IS NULL OR r.prep_time <= ?)');
        params.push(sanitizedFilters.maxPrepTime);
      }

      if (sanitizedFilters?.maxCookTime) {
        conditions.push('(r.cook_time IS NULL OR r.cook_time <= ?)');
        params.push(sanitizedFilters.maxCookTime);
      }

      if (sanitizedFilters?.ingredientIds && sanitizedFilters.ingredientIds.length > 0) {
        const placeholders = sanitizedFilters.ingredientIds.map(() => '?').join(',');
        conditions.push(`ri.ingredient_id IN (${placeholders})`);
        params.push(...sanitizedFilters.ingredientIds);
      }

      // Handle favorites filter
      if (sanitizedFilters?.favoritesOnly) {
        query = `
          SELECT DISTINCT r.*
          FROM recipes r
          INNER JOIN recipe_favorites rf ON r.id = rf.recipe_id
          LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
          LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        `;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY r.name ASC';

      const result = await this.db.getAllAsync(query, params) as RecipeRow[];
      
      // Load full recipe data including ingredients and instructions
      const recipes = await Promise.all(
        result.map(row => this.loadFullRecipe(row))
      );

      return recipes;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findAll',
        'recipes'
      );
    }
  }

  private sanitizeFilters(filters?: RecipeFilters): RecipeFilters | undefined {
    if (!filters) return undefined;

    return {
      ...filters,
      searchQuery: filters.searchQuery ? ValidationUtils.sanitizeSearchQuery(filters.searchQuery) : undefined,
      ingredientIds: filters.ingredientIds?.filter(id => ValidationUtils.isValidUUID(id))
    };
  }

  async findById(id: string): Promise<Recipe | null> {
    try {
      // Validate UUID
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid recipe ID format');
      }

      const query = 'SELECT * FROM recipes WHERE id = ?';
      const result = await this.db.getFirstAsync(query, [id]) as RecipeRow | null;
      
      if (!result) {
        return null;
      }

      return await this.loadFullRecipe(result);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'findById',
        'recipe'
      );
    }
  }

  async create(input: CreateRecipeInput): Promise<Recipe> {
    try {
      // Validate input data
      const validation = ValidationUtils.validateCreateRecipeInput(input);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const recipeId = uuid.v4();
      const now = new Date().toISOString();
      
      await this.db.withTransactionAsync(async () => {
        // Create recipe
        await this.db.runAsync(
          `INSERT INTO recipes (
            id, name, description, prep_time, cook_time, servings, 
            difficulty, category, photo_uri, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recipeId,
            input.name.trim(),
            input.description?.trim() || null,
            input.prepTime || null,
            input.cookTime || null,
            input.servings || null,
            input.difficulty || null,
            input.category,
            input.photoUri?.trim() || null,
            now,
            now
          ]
        );

        // Create recipe ingredients
        for (let i = 0; i < input.ingredients.length; i++) {
          const ingredient = input.ingredients[i];
          const ingredientId = uuid.v4();
          
          await this.db.runAsync(
            `INSERT INTO recipe_ingredients (
              id, recipe_id, ingredient_id, quantity, unit, optional, order_index, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ingredientId,
              recipeId,
              ingredient.ingredientId,
              ingredient.quantity,
              ingredient.unit.trim(),
              ingredient.optional ? 1 : 0,
              ingredient.orderIndex ?? i,
              now
            ]
          );
        }

        // Create recipe instructions
        for (const instruction of input.instructions) {
          const instructionId = uuid.v4();
          
          await this.db.runAsync(
            `INSERT INTO recipe_instructions (
              id, recipe_id, step_number, instruction, duration, estimated_time, temperature, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              instructionId,
              recipeId,
              instruction.stepNumber,
              instruction.instruction.trim(),
              instruction.duration || null,
              instruction.estimatedTime || null,
              instruction.temperature || null,
              instruction.notes || null,
              now
            ]
          );
        }
      });

      const created = await this.findById(recipeId);
      if (!created) {
        throw new Error('Failed to create recipe');
      }
      
      return created;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'create',
        'recipe'
      );
    }
  }

  async bulkCreate(inputs: CreateRecipeInput[]): Promise<Recipe[]> {
    try {
      // Validate all inputs first
      for (let i = 0; i < inputs.length; i++) {
        const validation = ValidationUtils.validateCreateRecipeInput(inputs[i]);
        if (!validation.isValid) {
          throw new Error(`Validation failed for recipe ${i + 1}: ${validation.errors.join(', ')}`);
        }
      }

      const createdRecipeIds: string[] = [];
      
      await this.db.withTransactionAsync(async () => {
        for (const input of inputs) {
          const recipeId = uuid.v4();
          const now = new Date().toISOString();
          
          // Create recipe
          await this.db.runAsync(
            `INSERT INTO recipes (
              id, name, description, prep_time, cook_time, servings, 
              difficulty, category, photo_uri, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              recipeId,
              input.name.trim(),
              input.description?.trim() || null,
              input.prepTime || null,
              input.cookTime || null,
              input.servings || null,
              input.difficulty || null,
              input.category,
              input.photoUri?.trim() || null,
              now,
              now
            ]
          );

          // Create recipe ingredients
          for (let i = 0; i < input.ingredients.length; i++) {
            const ingredient = input.ingredients[i];
            const ingredientId = uuid.v4();
            
            // Verify ingredient exists before inserting
            const ingredientExists = await this.db.getFirstAsync(
              'SELECT id FROM ingredients WHERE id = ?',
              [ingredient.ingredientId]
            );
            
            if (ingredientExists) {
              await this.db.runAsync(
                `INSERT INTO recipe_ingredients (
                  id, recipe_id, ingredient_id, quantity, unit, optional, order_index, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  ingredientId,
                  recipeId,
                  ingredient.ingredientId,
                  ingredient.quantity,
                  ingredient.unit.trim(),
                  ingredient.optional ? 1 : 0,
                  ingredient.orderIndex ?? i,
                  now
                ]
              );
            } else {
              console.warn(`⚠️ [Repository] Ingredient ${ingredient.ingredientId} not found for recipe ${input.name}`);
            }
          }

          // Create recipe instructions
          for (const instruction of input.instructions) {
            const instructionId = uuid.v4();
            
            await this.db.runAsync(
              `INSERT INTO recipe_instructions (
                id, recipe_id, step_number, instruction, duration, estimated_time, temperature, notes, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                instructionId,
                recipeId,
                instruction.stepNumber,
                instruction.instruction.trim(),
                instruction.duration || null,
                instruction.estimatedTime || null,
                instruction.temperature || null,
                instruction.notes || null,
                now
              ]
            );
          }
          
          createdRecipeIds.push(recipeId);
        }
      });

      // Load and return all created recipes
      const createdRecipes = await Promise.all(
        createdRecipeIds.map(id => this.findById(id))
      );
      
      // Filter out any nulls (shouldn't happen but safety first)
      const validRecipes = createdRecipes.filter((recipe): recipe is Recipe => recipe !== null);
      
      if (validRecipes.length !== inputs.length) {
        throw new Error('Failed to create some recipes');
      }
      
      return validRecipes;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'bulkCreate',
        'recipes'
      );
    }
  }

  async update(input: UpdateRecipeInput): Promise<Recipe> {
    try {
      // Validate ID
      if (!ValidationUtils.isValidUUID(input.id)) {
        throw new Error('Invalid recipe ID format');
      }

      await this.db.withTransactionAsync(async () => {
        // Update recipe basic info
        const updateFields: string[] = [];
        const params: (string | number | null)[] = [];

        if (input.name) {
          updateFields.push('name = ?');
          params.push(input.name.trim());
        }
        if (input.description !== undefined) {
          updateFields.push('description = ?');
          params.push(input.description?.trim() || null);
        }
        if (input.prepTime !== undefined) {
          updateFields.push('prep_time = ?');
          params.push(input.prepTime);
        }
        if (input.cookTime !== undefined) {
          updateFields.push('cook_time = ?');
          params.push(input.cookTime);
        }
        if (input.servings !== undefined) {
          updateFields.push('servings = ?');
          params.push(input.servings);
        }
        if (input.difficulty !== undefined) {
          updateFields.push('difficulty = ?');
          params.push(input.difficulty);
        }
        if (input.category) {
          updateFields.push('category = ?');
          params.push(input.category);
        }
        if (input.photoUri !== undefined) {
          updateFields.push('photo_uri = ?');
          params.push(input.photoUri?.trim() || null);
        }

        if (updateFields.length > 0) {
          params.push(input.id);
          const query = `UPDATE recipes SET ${updateFields.join(', ')} WHERE id = ?`;
          await this.db.runAsync(query, params);
        }

        // Update ingredients if provided
        if (input.ingredients) {
          // Delete existing ingredients
          await this.db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [input.id]);
          
          // Insert new ingredients
          const now = new Date().toISOString();
          for (let i = 0; i < input.ingredients.length; i++) {
            const ingredient = input.ingredients[i];
            const ingredientId = uuid.v4();
            
            await this.db.runAsync(
              `INSERT INTO recipe_ingredients (
                id, recipe_id, ingredient_id, quantity, unit, optional, order_index, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                ingredientId,
                input.id,
                ingredient.ingredientId,
                ingredient.quantity,
                ingredient.unit.trim(),
                ingredient.optional ? 1 : 0,
                ingredient.orderIndex ?? i,
                now
              ]
            );
          }
        }

        // Update instructions if provided
        if (input.instructions) {
          // Delete existing instructions
          await this.db.runAsync('DELETE FROM recipe_instructions WHERE recipe_id = ?', [input.id]);
          
          // Insert new instructions
          const now = new Date().toISOString();
          for (const instruction of input.instructions) {
            const instructionId = uuid.v4();
            
            await this.db.runAsync(
              `INSERT INTO recipe_instructions (
                id, recipe_id, step_number, instruction, duration, estimated_time, temperature, notes, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                instructionId,
                input.id,
                instruction.stepNumber,
                instruction.instruction.trim(),
                instruction.duration || null,
                instruction.estimatedTime || null,
                instruction.temperature || null,
                instruction.notes || null,
                now
              ]
            );
          }
        }
      });
      
      const updated = await this.findById(input.id);
      if (!updated) {
        throw new Error('Failed to update recipe');
      }
      return updated;
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'update',
        'recipe'
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Validate ID
      if (!ValidationUtils.isValidUUID(id)) {
        throw new Error('Invalid recipe ID format');
      }

      await this.db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'delete',
        'recipe'
      );
    }
  }

  async duplicate(id: string, newName?: string): Promise<Recipe> {
    try {
      const originalRecipe = await this.findById(id);
      if (!originalRecipe) {
        throw new Error('Recipe not found');
      }

      const createInput: CreateRecipeInput = {
        name: newName || `${originalRecipe.name} (Copie)`,
        description: originalRecipe.description,
        prepTime: originalRecipe.prepTime,
        cookTime: originalRecipe.cookTime,
        servings: originalRecipe.servings,
        difficulty: originalRecipe.difficulty,
        category: originalRecipe.category,
        photoUri: originalRecipe.photoUri,
        ingredients: originalRecipe.ingredients.map(ing => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional,
          orderIndex: ing.orderIndex
        })),
        instructions: originalRecipe.instructions.map(inst => ({
          stepNumber: inst.stepNumber,
          instruction: inst.instruction,
          duration: inst.duration,
          estimatedTime: inst.estimatedTime,
          temperature: inst.temperature,
          notes: inst.notes
        }))
      };

      return await this.create(createInput);
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'duplicate',
        'recipe'
      );
    }
  }

  async findByCategory(category: RecipeCategory): Promise<Recipe[]> {
    return this.findAll({ category });
  }

  async findByDifficulty(difficulty: RecipeDifficulty): Promise<Recipe[]> {
    return this.findAll({ difficulty });
  }

  async search(query: string): Promise<Recipe[]> {
    return this.findAll({ searchQuery: query });
  }

  async findByIngredients(ingredientIds: string[]): Promise<Recipe[]> {
    return this.findAll({ ingredientIds });
  }

  async recordUsage(recipeId: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidUUID(recipeId)) {
        throw new Error('Invalid recipe ID format');
      }

      const usageId = uuid.v4();
      const now = new Date().toISOString();

      await this.db.runAsync(
        'INSERT INTO recipe_usage (id, recipe_id, used_at) VALUES (?, ?, ?)',
        [usageId, recipeId, now]
      );
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'recordUsage',
        'recipe'
      );
    }
  }

  async getRecipeUsageStats(recipeId: string): Promise<RecipeUsageStats | null> {
    try {
      if (!ValidationUtils.isValidUUID(recipeId)) {
        throw new Error('Invalid recipe ID format');
      }

      const query = `
        SELECT 
          recipe_id,
          COUNT(*) as total_uses,
          MAX(used_at) as last_used,
          CAST(COUNT(*) AS REAL) / 
            (CAST(julianday('now') - julianday(MIN(used_at)) AS REAL) / 30.44) as avg_uses_per_month
        FROM recipe_usage 
        WHERE recipe_id = ?
        GROUP BY recipe_id
      `;

      const result = await this.db.getFirstAsync(query, [recipeId]) as any;
      
      if (!result) {
        return null;
      }

      return {
        recipeId: result.recipe_id,
        totalUses: result.total_uses,
        lastUsed: result.last_used ? new Date(result.last_used) : undefined,
        averageUsesPerMonth: result.avg_uses_per_month || 0
      };
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getRecipeUsageStats',
        'recipe'
      );
    }
  }

  async getIngredientUsageStats(ingredientId: string): Promise<IngredientUsageStats | null> {
    try {
      if (!ValidationUtils.isValidUUID(ingredientId)) {
        throw new Error('Invalid ingredient ID format');
      }

      const query = `
        SELECT 
          ri.ingredient_id,
          COUNT(ru.id) as total_uses_in_recipes,
          COUNT(DISTINCT ri.recipe_id) as recipe_count,
          MAX(ru.used_at) as last_used_in_recipe
        FROM recipe_ingredients ri
        LEFT JOIN recipe_usage ru ON ri.recipe_id = ru.recipe_id
        WHERE ri.ingredient_id = ?
        GROUP BY ri.ingredient_id
      `;

      const result = await this.db.getFirstAsync(query, [ingredientId]) as any;
      
      if (!result) {
        return null;
      }

      return {
        ingredientId: result.ingredient_id,
        totalUsesInRecipes: result.total_uses_in_recipes || 0,
        recipeCount: result.recipe_count || 0,
        lastUsedInRecipe: result.last_used_in_recipe ? new Date(result.last_used_in_recipe) : undefined
      };
    } catch (error) {
      SecureErrorHandler.handleDatabaseError(
        error as Error,
        'getIngredientUsageStats',
        'ingredient'
      );
    }
  }

  private async loadFullRecipe(recipeRow: RecipeRow): Promise<Recipe> {
    // Load recipe ingredients
    const ingredientsQuery = `
      SELECT ri.*, i.name as ingredient_name, i.category as ingredient_category
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
      ORDER BY ri.order_index ASC
    `;
    
    const ingredientRows = await this.db.getAllAsync(ingredientsQuery, [recipeRow.id]) as (RecipeIngredientRow & { ingredient_name: string, ingredient_category: string })[];
    
    const recipeIngredients = await Promise.all(
      ingredientRows.map(async (row) => {
        const ingredient = await this.ingredientRepository.findById(row.ingredient_id);
        if (!ingredient) {
          throw new Error(`Ingredient not found: ${row.ingredient_id}`);
        }

        return this.mapRowToRecipeIngredient(row, ingredient);
      })
    );

    // Load recipe instructions
    const instructionsQuery = `
      SELECT * FROM recipe_instructions 
      WHERE recipe_id = ? 
      ORDER BY step_number ASC
    `;
    
    const instructionRows = await this.db.getAllAsync(instructionsQuery, [recipeRow.id]) as RecipeInstructionRow[];
    const recipeInstructions = instructionRows.map(row => this.mapRowToRecipeInstruction(row));

    // Check if recipe is favorite
    const isFavorite = await this.favoritesRepository.isFavorite(recipeRow.id);

    return this.mapRowToRecipe(recipeRow, recipeIngredients, recipeInstructions, isFavorite);
  }

  private mapRowToRecipe(
    row: RecipeRow, 
    ingredients: RecipeIngredient[], 
    instructions: RecipeInstruction[],
    isFavorite: boolean
  ): Recipe {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      prepTime: row.prep_time || undefined,
      cookTime: row.cook_time || undefined,
      servings: row.servings || undefined,
      difficulty: row.difficulty as RecipeDifficulty || undefined,
      category: row.category as RecipeCategory,
      photoUri: row.photo_uri || undefined,
      isFavorite,
      ingredients,
      instructions,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToRecipeIngredient(row: RecipeIngredientRow, ingredient: any): RecipeIngredient {
    return {
      id: row.id,
      recipeId: row.recipe_id,
      ingredientId: row.ingredient_id,
      ingredient,
      quantity: row.quantity,
      unit: row.unit,
      optional: row.optional === 1,
      orderIndex: row.order_index,
      createdAt: new Date(row.created_at)
    };
  }

  private mapRowToRecipeInstruction(row: RecipeInstructionRow): RecipeInstruction {
    return {
      id: row.id,
      recipeId: row.recipe_id,
      stepNumber: row.step_number,
      instruction: row.instruction,
      duration: row.duration || undefined,
      estimatedTime: row.estimated_time || undefined,
      temperature: row.temperature || undefined,
      notes: row.notes || undefined,
      createdAt: new Date(row.created_at)
    };
  }
}