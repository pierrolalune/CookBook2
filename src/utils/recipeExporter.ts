import RNPrint from 'react-native-print';
// import Share from 'react-native-share';
// import ViewShot from 'react-native-view-shot';

// Temporary fallback for react-native-share
const Share = {
  open: async (options: any) => {
    console.log('Share temporarily disabled - would share:', options.title);
    // For now, just log the action
    return Promise.resolve();
  }
};
import * as FileSystem from 'expo-file-system';
import { Recipe, RecipeIngredient, RecipeInstruction } from '../types';
import { SecureErrorHandler } from './errorHandler';
import { ValidationUtils } from './validation';

export interface ExportOptions {
  includePhotos?: boolean;
  includeInstructions?: boolean;
  includeIngredients?: boolean;
  format?: 'pdf' | 'text' | 'json';
  paperSize?: 'A4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
  type?: string;
  filename?: string;
}

export class RecipeExporter {
  private static readonly EXPORTS_DIR = `${FileSystem.documentDirectory}recipe-exports/`;

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
   * Export recipe as PDF
   */
  static async exportToPDF(recipe: Recipe, options: ExportOptions = {}): Promise<string> {
    try {
      await this.initializeExportDirectory();

      const htmlContent = this.generateRecipeHTML(recipe, options);
      const fileName = `recipe_${this.sanitizeFileName(recipe.name)}_${Date.now()}.pdf`;
      const filePath = `${this.EXPORTS_DIR}${fileName}`;

      const pdfOptions = {
        html: htmlContent,
        fileName: fileName,
        directory: 'Documents/recipe-exports',
        width: options.paperSize === 'letter' ? 612 : 595,
        height: options.paperSize === 'letter' ? 792 : 842,
        base64: false,
        orientation: options.orientation || 'portrait'
      };

      await RNPrint.print(pdfOptions);
      
      return filePath;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'exportToPDF',
        recipeId: recipe.id 
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'export',
        'recipe PDF'
      );
    }
  }

  /**
   * Export recipe as text
   */
  static async exportToText(recipe: Recipe, options: ExportOptions = {}): Promise<string> {
    try {
      await this.initializeExportDirectory();

      const textContent = this.generateRecipeText(recipe, options);
      const fileName = `recipe_${this.sanitizeFileName(recipe.name)}_${Date.now()}.txt`;
      const filePath = `${this.EXPORTS_DIR}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, textContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return filePath;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'exportToText',
        recipeId: recipe.id 
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'export',
        'recipe text'
      );
    }
  }

  /**
   * Export recipe as JSON
   */
  static async exportToJSON(recipe: Recipe): Promise<string> {
    try {
      await this.initializeExportDirectory();

      // Create clean export data (remove sensitive info if any)
      const exportData = {
        name: recipe.name,
        description: recipe.description,
        category: recipe.category,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.ingredient.name,
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional,
          orderIndex: ing.orderIndex
        })),
        instructions: recipe.instructions.map(inst => ({
          stepNumber: inst.stepNumber,
          instruction: inst.instruction,
          estimatedTime: inst.estimatedTime,
          temperature: inst.temperature,
          notes: inst.notes
        })),
        exportedAt: new Date().toISOString(),
        exportedBy: 'CookBookP App'
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const fileName = `recipe_${this.sanitizeFileName(recipe.name)}_${Date.now()}.json`;
      const filePath = `${this.EXPORTS_DIR}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return filePath;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'exportToJSON',
        recipeId: recipe.id 
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'export',
        'recipe JSON'
      );
    }
  }

  /**
   * Generate shopping list from recipe
   */
  static async generateShoppingList(recipes: Recipe[]): Promise<string> {
    try {
      await this.initializeExportDirectory();

      // Consolidate ingredients across recipes
      const consolidatedIngredients = new Map<string, {
        name: string;
        totalQuantity: number;
        unit: string;
        recipes: string[];
        category: string;
      }>();

      recipes.forEach(recipe => {
        recipe.ingredients.forEach(recipeIngredient => {
          const key = `${recipeIngredient.ingredient.name}_${recipeIngredient.unit}`;
          const existing = consolidatedIngredients.get(key);
          
          if (existing) {
            existing.totalQuantity += recipeIngredient.quantity;
            if (!existing.recipes.includes(recipe.name)) {
              existing.recipes.push(recipe.name);
            }
          } else {
            consolidatedIngredients.set(key, {
              name: recipeIngredient.ingredient.name,
              totalQuantity: recipeIngredient.quantity,
              unit: recipeIngredient.unit,
              recipes: [recipe.name],
              category: recipeIngredient.ingredient.category
            });
          }
        });
      });

      // Generate shopping list text
      let listContent = '🛒 LISTE DE COURSES\n';
      listContent += '=' .repeat(50) + '\n\n';
      
      if (recipes.length === 1) {
        listContent += `Pour la recette: ${recipes[0].name}\n\n`;
      } else {
        listContent += 'Pour les recettes:\n';
        recipes.forEach(recipe => {
          listContent += `- ${recipe.name}\n`;
        });
        listContent += '\n';
      }

      // Group by category
      const categorizedIngredients = new Map<string, typeof consolidatedIngredients>();
      consolidatedIngredients.forEach((ingredient, key) => {
        const category = ingredient.category;
        if (!categorizedIngredients.has(category)) {
          categorizedIngredients.set(category, new Map());
        }
        categorizedIngredients.get(category)!.set(key, ingredient);
      });

      // Generate list by category
      const categoryOrder = ['Fruits', 'Légumes', 'Viande', 'Produits laitiers', 'Pêche', 'Épicerie'];
      
      categoryOrder.forEach(category => {
        const categoryIngredients = categorizedIngredients.get(category);
        if (categoryIngredients && categoryIngredients.size > 0) {
          listContent += `📂 ${category.toUpperCase()}\n`;
          listContent += '-'.repeat(20) + '\n';
          
          Array.from(categoryIngredients.values()).forEach(ingredient => {
            const quantity = ingredient.totalQuantity % 1 === 0 
              ? ingredient.totalQuantity.toString()
              : ingredient.totalQuantity.toFixed(1).replace(/\.0$/, '');
            
            listContent += `□ ${ingredient.name} - ${quantity} ${ingredient.unit}\n`;
            
            if (recipes.length > 1) {
              listContent += `  (pour: ${ingredient.recipes.join(', ')})\n`;
            }
          });
          
          listContent += '\n';
        }
      });

      listContent += `Généré le ${new Date().toLocaleDateString('fr-FR')} par CookBookP\n`;

      const fileName = `liste_courses_${Date.now()}.txt`;
      const filePath = `${this.EXPORTS_DIR}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, listContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return filePath;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'generateShoppingList'
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'generate',
        'shopping list'
      );
    }
  }

  /**
   * Share recipe using native share
   */
  static async shareRecipe(recipe: Recipe, format: 'text' | 'pdf' | 'json' = 'text'): Promise<void> {
    try {
      let filePath: string;
      let mimeType: string;
      
      switch (format) {
        case 'pdf':
          filePath = await this.exportToPDF(recipe);
          mimeType = 'application/pdf';
          break;
        case 'json':
          filePath = await this.exportToJSON(recipe);
          mimeType = 'application/json';
          break;
        default:
          filePath = await this.exportToText(recipe);
          mimeType = 'text/plain';
      }

      const shareOptions: ShareOptions = {
        title: `Recette: ${recipe.name}`,
        message: `Voici la recette "${recipe.name}" partagée depuis CookBookP`,
        url: `file://${filePath}`,
        type: mimeType,
        filename: filePath.split('/').pop()
      };

      await Share.open(shareOptions);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'shareRecipe',
        recipeId: recipe.id
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'share',
        'recipe'
      );
    }
  }

  /**
   * Share shopping list
   */
  static async shareShoppingList(recipes: Recipe[]): Promise<void> {
    try {
      const filePath = await this.generateShoppingList(recipes);
      
      const recipeNames = recipes.length === 1 
        ? recipes[0].name 
        : `${recipes.length} recettes`;

      const shareOptions: ShareOptions = {
        title: `Liste de courses pour ${recipeNames}`,
        message: `Voici votre liste de courses générée depuis CookBookP`,
        url: `file://${filePath}`,
        type: 'text/plain',
        filename: filePath.split('/').pop()
      };

      await Share.open(shareOptions);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'shareShoppingList'
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'share',
        'shopping list'
      );
    }
  }

  /**
   * Generate HTML content for PDF export
   */
  private static generateRecipeHTML(recipe: Recipe, options: ExportOptions): string {
    const {
      includePhotos = true,
      includeIngredients = true,
      includeInstructions = true
    } = options;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${ValidationUtils.sanitizeString(recipe.name)}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .recipe-title {
            font-size: 28px;
            color: #667eea;
            margin-bottom: 10px;
          }
          .recipe-meta {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin: 15px 0;
          }
          .meta-item {
            background: #f8f9fa;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 14px;
          }
          .section {
            margin: 30px 0;
          }
          .section-title {
            font-size: 20px;
            color: #667eea;
            border-left: 4px solid #667eea;
            padding-left: 10px;
            margin-bottom: 15px;
          }
          .ingredients-list {
            list-style: none;
            padding: 0;
          }
          .ingredient-item {
            background: #f8f9fa;
            margin: 5px 0;
            padding: 8px 12px;
            border-radius: 5px;
            border-left: 3px solid #667eea;
          }
          .ingredient-optional {
            border-left-color: #999;
            opacity: 0.7;
          }
          .instructions-list {
            list-style: none;
            padding: 0;
          }
          .instruction-item {
            margin: 15px 0;
            padding: 15px;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
          }
          .instruction-number {
            font-weight: bold;
            color: #667eea;
            font-size: 18px;
            margin-bottom: 5px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="recipe-title">${ValidationUtils.sanitizeString(recipe.name)}</h1>
          ${recipe.description ? `<p>${ValidationUtils.sanitizeString(recipe.description)}</p>` : ''}
          
          <div class="recipe-meta">
            <span class="meta-item">📂 ${this.getCategoryLabel(recipe.category)}</span>
            ${recipe.difficulty ? `<span class="meta-item">⭐ ${this.getDifficultyLabel(recipe.difficulty)}</span>` : ''}
            ${recipe.prepTime ? `<span class="meta-item">⏱️ Préparation: ${recipe.prepTime}min</span>` : ''}
            ${recipe.cookTime ? `<span class="meta-item">🔥 Cuisson: ${recipe.cookTime}min</span>` : ''}
            ${recipe.servings ? `<span class="meta-item">👥 ${recipe.servings} personne${recipe.servings > 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
    `;

    // Ingredients section
    if (includeIngredients && recipe.ingredients.length > 0) {
      html += `
        <div class="section">
          <h2 class="section-title">🥕 Ingrédients (${recipe.ingredients.length})</h2>
          <ul class="ingredients-list">
      `;
      
      recipe.ingredients
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach(ingredient => {
          const quantity = ingredient.quantity % 1 === 0 
            ? ingredient.quantity.toString()
            : ingredient.quantity.toFixed(1).replace(/\.0$/, '');
          
          html += `
            <li class="ingredient-item ${ingredient.optional ? 'ingredient-optional' : ''}">
              ${ValidationUtils.sanitizeString(ingredient.ingredient.name)} - 
              ${quantity} ${ValidationUtils.sanitizeString(ingredient.unit)}
              ${ingredient.optional ? ' (optionnel)' : ''}
            </li>
          `;
        });
      
      html += `
          </ul>
        </div>
      `;
    }

    // Instructions section
    if (includeInstructions && recipe.instructions.length > 0) {
      html += `
        <div class="section">
          <h2 class="section-title">👨‍🍳 Instructions</h2>
          <ol class="instructions-list">
      `;
      
      recipe.instructions
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .forEach(instruction => {
          html += `
            <li class="instruction-item">
              <div class="instruction-number">Étape ${instruction.stepNumber}</div>
              <div>${ValidationUtils.sanitizeString(instruction.instruction)}</div>
              ${instruction.estimatedTime ? `<div style="color: #666; font-size: 14px; margin-top: 5px;">⏱️ Temps estimé: ${instruction.estimatedTime}min</div>` : ''}
              ${instruction.temperature ? `<div style="color: #666; font-size: 14px;">🌡️ Température: ${instruction.temperature}°C</div>` : ''}
              ${instruction.notes ? `<div style="color: #666; font-size: 14px; font-style: italic;">📝 ${ValidationUtils.sanitizeString(instruction.notes)}</div>` : ''}
            </li>
          `;
        });
      
      html += `
          </ol>
        </div>
      `;
    }

    html += `
        <div class="footer">
          <p>Recette générée le ${new Date().toLocaleDateString('fr-FR')} par CookBookP</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate text content for text export
   */
  private static generateRecipeText(recipe: Recipe, options: ExportOptions): string {
    const {
      includeIngredients = true,
      includeInstructions = true
    } = options;

    let text = '';
    text += '🍽️ ' + recipe.name.toUpperCase() + '\n';
    text += '=' .repeat(recipe.name.length + 4) + '\n\n';

    if (recipe.description) {
      text += recipe.description + '\n\n';
    }

    // Recipe metadata
    text += '📋 INFORMATIONS\n';
    text += '-'.repeat(20) + '\n';
    text += `📂 Catégorie: ${this.getCategoryLabel(recipe.category)}\n`;
    if (recipe.difficulty) text += `⭐ Difficulté: ${this.getDifficultyLabel(recipe.difficulty)}\n`;
    if (recipe.prepTime) text += `⏱️ Temps de préparation: ${recipe.prepTime} minutes\n`;
    if (recipe.cookTime) text += `🔥 Temps de cuisson: ${recipe.cookTime} minutes\n`;
    if (recipe.servings) text += `👥 Portions: ${recipe.servings} personne${recipe.servings > 1 ? 's' : ''}\n`;
    text += '\n';

    // Ingredients
    if (includeIngredients && recipe.ingredients.length > 0) {
      text += `🥕 INGRÉDIENTS (${recipe.ingredients.length})\n`;
      text += '-'.repeat(20) + '\n';
      
      recipe.ingredients
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach(ingredient => {
          const quantity = ingredient.quantity % 1 === 0 
            ? ingredient.quantity.toString()
            : ingredient.quantity.toFixed(1).replace(/\.0$/, '');
          
          text += `• ${ingredient.ingredient.name} - ${quantity} ${ingredient.unit}`;
          if (ingredient.optional) text += ' (optionnel)';
          text += '\n';
        });
      text += '\n';
    }

    // Instructions
    if (includeInstructions && recipe.instructions.length > 0) {
      text += '👨‍🍳 INSTRUCTIONS\n';
      text += '-'.repeat(20) + '\n';
      
      recipe.instructions
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .forEach(instruction => {
          text += `${instruction.stepNumber}. ${instruction.instruction}\n`;
          if (instruction.estimatedTime) text += `   ⏱️ Temps estimé: ${instruction.estimatedTime} minutes\n`;
          if (instruction.temperature) text += `   🌡️ Température: ${instruction.temperature}°C\n`;
          if (instruction.notes) text += `   📝 Note: ${instruction.notes}\n`;
          text += '\n';
        });
    }

    text += `Recette générée le ${new Date().toLocaleDateString('fr-FR')} par CookBookP\n`;

    return text;
  }

  /**
   * Get category label in French
   */
  private static getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      entree: 'Entrées',
      plats: 'Plats',
      dessert: 'Desserts'
    };
    return labels[category] || category;
  }

  /**
   * Get difficulty label in French
   */
  private static getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      facile: 'Facile',
      moyen: 'Moyen',
      difficile: 'Difficile'
    };
    return labels[difficulty] || difficulty;
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
}