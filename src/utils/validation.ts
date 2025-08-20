import { IngredientCategory } from '../types';

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
}