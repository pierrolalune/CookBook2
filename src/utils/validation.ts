import { IngredientCategory, RecipeCategory, RecipeDifficulty, CreateRecipeInput, CreateRecipeIngredientInput, CreateRecipeInstructionInput } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  errorMessage: string;
}

/**
 * Secure input validation utilities
 */
export class ValidationUtils {
  // String validation
  static validateString(
    value: string, 
    rules: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      customValidator?: (value: string) => boolean;
    } = {}
  ): ValidationResult {
    const errors: string[] = [];
    const trimmedValue = value?.trim() || '';

    if (rules.required && !trimmedValue) {
      errors.push('Ce champ est requis');
    }

    if (trimmedValue && rules.minLength && trimmedValue.length < rules.minLength) {
      errors.push(`Minimum ${rules.minLength} caractères requis`);
    }

    if (trimmedValue && rules.maxLength && trimmedValue.length > rules.maxLength) {
      errors.push(`Maximum ${rules.maxLength} caractères autorisés`);
    }

    if (trimmedValue && rules.pattern && !rules.pattern.test(trimmedValue)) {
      errors.push('Format invalide');
    }

    if (trimmedValue && rules.customValidator && !rules.customValidator(trimmedValue)) {
      errors.push('Valeur invalide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Array validation
  static validateArray<T>(
    value: T[],
    rules: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      itemValidator?: (item: T) => boolean;
    } = {}
  ): ValidationResult {
    const errors: string[] = [];
    const array = Array.isArray(value) ? value : [];

    if (rules.required && array.length === 0) {
      errors.push('Au moins un élément est requis');
    }

    if (array.length > 0) {
      if (rules.minLength && array.length < rules.minLength) {
        errors.push(`Minimum ${rules.minLength} éléments requis`);
      }

      if (rules.maxLength && array.length > rules.maxLength) {
        errors.push(`Maximum ${rules.maxLength} éléments autorisés`);
      }

      if (rules.itemValidator) {
        const invalidItems = array.filter(item => !rules.itemValidator!(item));
        if (invalidItems.length > 0) {
          errors.push('Certains éléments sont invalides');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Number validation
  static validateNumber(
    value: number,
    rules: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
    } = {}
  ): ValidationResult {
    const errors: string[] = [];

    if (rules.required && (value === null || value === undefined || isNaN(value))) {
      errors.push('Ce champ est requis');
    }

    if (!isNaN(value)) {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`La valeur doit être supérieure ou égale à ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`La valeur doit être inférieure ou égale à ${rules.max}`);
      }

      if (rules.integer && !Number.isInteger(value)) {
        errors.push('La valeur doit être un entier');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Ingredient-specific validations
  static validateIngredientName(name: string): ValidationResult {
    return this.validateString(name, {
      required: true,
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-ZÀ-ÿ0-9\s\-'.,()]+$/,
    });
  }

  static validateIngredientCategory(category: string): ValidationResult {
    const validCategories: IngredientCategory[] = [
      'fruits', 'legumes', 'viande', 'produits_laitiers', 'epicerie', 'peche', 'autres'
    ];
    
    const errors: string[] = [];
    if (!category) {
      errors.push('La catégorie est requise');
    } else if (!validCategories.includes(category as IngredientCategory)) {
      errors.push('Catégorie invalide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateSeasonalMonths(months: number[]): ValidationResult {
    return this.validateArray(months, {
      required: false,
      minLength: 1,
      maxLength: 12,
      itemValidator: (month) => Number.isInteger(month) && month >= 1 && month <= 12
    });
  }

  static validateTags(tags: string[]): ValidationResult {
    return this.validateArray(tags, {
      required: false,
      maxLength: 10,
      itemValidator: (tag) => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 50
    });
  }

  // String sanitization
  static sanitizeString(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters but keep accented characters
    const sanitized = value
      .trim()
      .replace(/[<>"/\\&'`;(){}[\]]/g, '') // Remove dangerous characters
      .substring(0, 1000); // Limit length for general strings

    return sanitized;
  }

  // Search query sanitization
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters but keep accented characters
    const sanitized = query
      .trim()
      .replace(/[<>"/\\&'`;(){}[\]]/g, '') // Remove dangerous characters
      .substring(0, 100); // Limit length

    return sanitized;
  }

  // SQL injection prevention helpers
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && uuidRegex.test(uuid);
  }

  static validateSortColumn(column: string, allowedColumns: string[]): boolean {
    return typeof column === 'string' && allowedColumns.includes(column);
  }

  static validateSortDirection(direction: string): boolean {
    return direction === 'ASC' || direction === 'DESC';
  }

  // XSS prevention
  static escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match as keyof typeof htmlEscapes]);
  }

  // Combined ingredient validation
  static validateCreateIngredientInput(input: {
    name?: string;
    category?: string;
    subcategory?: string;
    units?: string[];
    seasonal?: {
      months?: number[];
      peak_months?: number[];
      season?: string;
    };
    description?: string;
    tags?: string[];
    notes?: string;
  }): ValidationResult {
    const errors: string[] = [];

    // Validate name
    const nameValidation = this.validateIngredientName(input.name || '');
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    }

    // Validate category
    const categoryValidation = this.validateIngredientCategory(input.category || '');
    if (!categoryValidation.isValid) {
      errors.push(...categoryValidation.errors);
    }

    // Validate subcategory
    const subcategoryValidation = this.validateString(input.subcategory || '', {
      required: true,
      maxLength: 100
    });
    if (!subcategoryValidation.isValid) {
      errors.push(...subcategoryValidation.errors);
    }

    // Validate units
    const unitsValidation = this.validateArray(input.units || [], {
      required: true,
      minLength: 1,
      maxLength: 20,
      itemValidator: (unit) => typeof unit === 'string' && unit.trim().length > 0
    });
    if (!unitsValidation.isValid) {
      errors.push(...unitsValidation.errors);
    }

    // Validate seasonal data if present
    if (input.seasonal) {
      const monthsValidation = this.validateSeasonalMonths(input.seasonal.months || []);
      if (!monthsValidation.isValid) {
        errors.push(...monthsValidation.errors);
      }

      const peakMonthsValidation = this.validateSeasonalMonths(input.seasonal.peak_months || []);
      if (!peakMonthsValidation.isValid) {
        errors.push(...peakMonthsValidation.errors);
      }
    }

    // Validate optional fields
    if (input.description) {
      const descValidation = this.validateString(input.description, { maxLength: 500 });
      if (!descValidation.isValid) {
        errors.push(...descValidation.errors);
      }
    }

    if (input.notes) {
      const notesValidation = this.validateString(input.notes, { maxLength: 1000 });
      if (!notesValidation.isValid) {
        errors.push(...notesValidation.errors);
      }
    }

    if (input.tags) {
      const tagsValidation = this.validateTags(input.tags);
      if (!tagsValidation.isValid) {
        errors.push(...tagsValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Recipe-specific validations
  static validateRecipeName(name: string): ValidationResult {
    return this.validateString(name, {
      required: true,
      minLength: 1,
      maxLength: 200,
      pattern: /^[a-zA-ZÀ-ÿ0-9\s\-'.,()!&]+$/,
    });
  }

  static validateRecipeCategory(category: string): ValidationResult {
    const validCategories: RecipeCategory[] = ['entree', 'plats', 'dessert'];
    
    const errors: string[] = [];
    if (!category) {
      errors.push('La catégorie est requise');
    } else if (!validCategories.includes(category as RecipeCategory)) {
      errors.push('Catégorie invalide (entree, plats, dessert)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRecipeDifficulty(difficulty: string): ValidationResult {
    const validDifficulties: RecipeDifficulty[] = ['facile', 'moyen', 'difficile'];
    
    const errors: string[] = [];
    if (difficulty && !validDifficulties.includes(difficulty as RecipeDifficulty)) {
      errors.push('Difficulté invalide (facile, moyen, difficile)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRecipeTime(time: number, fieldName: string): ValidationResult {
    return this.validateNumber(time, {
      required: false,
      min: 1,
      max: 1440, // 24 hours max
      integer: true
    });
  }

  static validateRecipeServings(servings: number): ValidationResult {
    return this.validateNumber(servings, {
      required: false,
      min: 1,
      max: 100,
      integer: true
    });
  }

  static validatePhotoUri(uri: string): ValidationResult {
    if (!uri) {
      return { isValid: true, errors: [] }; // Optional field
    }

    const errors: string[] = [];
    
    // Basic URI validation
    const uriValidation = this.validateString(uri, {
      maxLength: 2000
    });
    
    if (!uriValidation.isValid) {
      errors.push(...uriValidation.errors);
    }

    // Check for basic URI format (file://, http://, https://, or asset relative paths)
    const uriPattern = /^(file:\/\/|https?:\/\/|[a-zA-Z0-9._/-]+\.(jpg|jpeg|png|gif|webp))$/i;
    if (uri && !uriPattern.test(uri)) {
      errors.push('Format d\'image invalide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRecipeIngredient(ingredient: CreateRecipeIngredientInput): ValidationResult {
    const errors: string[] = [];

    // Validate ingredient ID
    if (!ingredient.ingredientId || !this.isValidUUID(ingredient.ingredientId)) {
      errors.push('ID d\'ingrédient invalide');
    }

    // Validate quantity
    const quantityValidation = this.validateNumber(ingredient.quantity, {
      required: true,
      min: 0.001, // Allow very small quantities
      max: 10000
    });
    if (!quantityValidation.isValid) {
      errors.push(`Quantité: ${quantityValidation.errors.join(', ')}`);
    }

    // Validate unit
    const unitValidation = this.validateString(ingredient.unit, {
      required: true,
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-zA-ZÀ-ÿ0-9\s\-.,()]+$/
    });
    if (!unitValidation.isValid) {
      errors.push(`Unité: ${unitValidation.errors.join(', ')}`);
    }

    // Validate order index if provided
    if (ingredient.orderIndex !== undefined) {
      const orderValidation = this.validateNumber(ingredient.orderIndex, {
        min: 0,
        max: 1000,
        integer: true
      });
      if (!orderValidation.isValid) {
        errors.push(`Ordre: ${orderValidation.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRecipeInstruction(instruction: CreateRecipeInstructionInput): ValidationResult {
    const errors: string[] = [];

    // Validate step number
    const stepValidation = this.validateNumber(instruction.stepNumber, {
      required: true,
      min: 1,
      max: 1000,
      integer: true
    });
    if (!stepValidation.isValid) {
      errors.push(`Numéro d'étape: ${stepValidation.errors.join(', ')}`);
    }

    // Validate instruction text
    const textValidation = this.validateString(instruction.instruction, {
      required: true,
      minLength: 3,
      maxLength: 2000
    });
    if (!textValidation.isValid) {
      errors.push(`Instructions: ${textValidation.errors.join(', ')}`);
    }

    // Validate duration if provided
    if (instruction.duration !== undefined) {
      const durationValidation = this.validateRecipeTime(instruction.duration, 'durée');
      if (!durationValidation.isValid) {
        errors.push(`Durée: ${durationValidation.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Combined recipe validation
  static validateCreateRecipeInput(input: CreateRecipeInput): ValidationResult {
    const errors: string[] = [];

    // Validate name
    const nameValidation = this.validateRecipeName(input.name);
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors.map(err => `Nom: ${err}`));
    }

    // Validate category
    const categoryValidation = this.validateRecipeCategory(input.category);
    if (!categoryValidation.isValid) {
      errors.push(...categoryValidation.errors);
    }

    // Validate optional fields
    if (input.description) {
      const descValidation = this.validateString(input.description, { maxLength: 1000 });
      if (!descValidation.isValid) {
        errors.push(...descValidation.errors.map(err => `Description: ${err}`));
      }
    }

    if (input.difficulty) {
      const difficultyValidation = this.validateRecipeDifficulty(input.difficulty);
      if (!difficultyValidation.isValid) {
        errors.push(...difficultyValidation.errors);
      }
    }

    if (input.prepTime !== undefined) {
      const prepTimeValidation = this.validateRecipeTime(input.prepTime, 'temps de préparation');
      if (!prepTimeValidation.isValid) {
        errors.push(...prepTimeValidation.errors.map(err => `Temps de préparation: ${err}`));
      }
    }

    if (input.cookTime !== undefined) {
      const cookTimeValidation = this.validateRecipeTime(input.cookTime, 'temps de cuisson');
      if (!cookTimeValidation.isValid) {
        errors.push(...cookTimeValidation.errors.map(err => `Temps de cuisson: ${err}`));
      }
    }

    if (input.servings !== undefined) {
      const servingsValidation = this.validateRecipeServings(input.servings);
      if (!servingsValidation.isValid) {
        errors.push(...servingsValidation.errors.map(err => `Portions: ${err}`));
      }
    }

    if (input.photoUri) {
      const photoValidation = this.validatePhotoUri(input.photoUri);
      if (!photoValidation.isValid) {
        errors.push(...photoValidation.errors.map(err => `Photo: ${err}`));
      }
    }

    // Validate ingredients
    const ingredientsValidation = this.validateArray(input.ingredients, {
      required: true,
      minLength: 1,
      maxLength: 100
    });
    if (!ingredientsValidation.isValid) {
      errors.push(...ingredientsValidation.errors.map(err => `Ingrédients: ${err}`));
    } else {
      // Validate each ingredient
      input.ingredients.forEach((ingredient, index) => {
        const ingredientValidation = this.validateRecipeIngredient(ingredient);
        if (!ingredientValidation.isValid) {
          errors.push(`Ingrédient ${index + 1}: ${ingredientValidation.errors.join(', ')}`);
        }
      });

      // Check for duplicate ingredients
      const ingredientIds = input.ingredients.map(ing => ing.ingredientId);
      const duplicates = ingredientIds.filter((id, index) => ingredientIds.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push('Ingrédients dupliqués détectés');
      }
    }

    // Validate instructions
    const instructionsValidation = this.validateArray(input.instructions, {
      required: true,
      minLength: 1,
      maxLength: 100
    });
    if (!instructionsValidation.isValid) {
      errors.push(...instructionsValidation.errors.map(err => `Instructions: ${err}`));
    } else {
      // Validate each instruction
      input.instructions.forEach((instruction, index) => {
        const instructionValidation = this.validateRecipeInstruction(instruction);
        if (!instructionValidation.isValid) {
          errors.push(`Étape ${index + 1}: ${instructionValidation.errors.join(', ')}`);
        }
      });

      // Check for duplicate step numbers
      const stepNumbers = input.instructions.map(inst => inst.stepNumber);
      const duplicateSteps = stepNumbers.filter((step, index) => stepNumbers.indexOf(step) !== index);
      if (duplicateSteps.length > 0) {
        errors.push('Numéros d\'étapes dupliqués détectés');
      }

      // Check step number sequence
      const sortedSteps = [...stepNumbers].sort((a, b) => a - b);
      const expectedSteps = Array.from({ length: stepNumbers.length }, (_, i) => i + 1);
      const isSequential = JSON.stringify(sortedSteps) === JSON.stringify(expectedSteps);
      if (!isSequential) {
        errors.push('Les numéros d\'étapes doivent être séquentiels (1, 2, 3, ...)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}