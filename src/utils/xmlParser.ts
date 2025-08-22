import { 
  IngredientCategory, 
  Ingredient, 
  Recipe,
  RecipeCategory,
  RecipeDifficulty,
  CreateRecipeInput,
  CreateRecipeIngredientInput,
  CreateRecipeInstructionInput 
} from '../types';
import uuid from 'react-native-uuid';
import { Asset } from 'expo-asset';

interface XMLIngredient {
  name: string;
  subcategory: string;
  units: string[];
  seasonal?: {
    months: number[];
    peak_months: number[];
    season: string;
  };
}

interface XMLRecipeIngredient {
  ingredient_id: string;
  quantity: number;
  unit: string;
}

interface XMLRecipeInstruction {
  number: number;
  instruction: string;
}

interface XMLRecipe {
  id: string;
  name: string;
  description: string;
  preparation_time: number;
  cooking_time: number;
  servings: number;
  category_id: number;
  difficulty_level: string;
  created_at: string;
  updated_at: string;
  ingredients: XMLRecipeIngredient[];
  instructions: XMLRecipeInstruction[];
}

// Simple XML parser for ingredient data
export class XMLDataLoader {
  private parseXMLToJSON(xmlText: string): any {
    // Simple regex-based XML parser for our specific structure
    const categoryMatch = xmlText.match(/<category category="([^"]*)">/);
    const category = categoryMatch ? categoryMatch[1].toLowerCase() : 'autres';
    
    const ingredients: (XMLIngredient & { uuid?: string })[] = [];
    const ingredientRegex = /<ingredient name="([^"]*)"(?:\s+uuid="([^"]*)")?>([\s\S]*?)<\/ingredient>/g;
    
    let match;
    while ((match = ingredientRegex.exec(xmlText)) !== null) {
      const name = match[1];
      const uuid = match[2]; // Extract UUID from attribute if present
      const content = match[3];
      
      // Parse subcategory
      const subcategoryMatch = content.match(/<subcategory>([^<]*)<\/subcategory>/);
      const subcategory = subcategoryMatch ? subcategoryMatch[1] : 'Non classé';
      
      // Parse units
      const units: string[] = [];
      const unitsSection = content.match(/<units>([\s\S]*?)<\/units>/);
      if (unitsSection) {
        const unitRegex = /<unit>([^<]*)<\/unit>/g;
        let unitMatch;
        while ((unitMatch = unitRegex.exec(unitsSection[1])) !== null) {
          units.push(unitMatch[1]);
        }
      }
      
      // Parse seasonal data
      let seasonal;
      const seasonalSection = content.match(/<seasonal>([\s\S]*?)<\/seasonal>/);
      if (seasonalSection) {
        const monthsMatch = seasonalSection[1].match(/<months>([^<]*)<\/months>/);
        const peakMonthsMatch = seasonalSection[1].match(/<peak_months>([^<]*)<\/peak_months>/);
        const seasonMatch = seasonalSection[1].match(/<season>([^<]*)<\/season>/);
        
        if (monthsMatch && peakMonthsMatch && seasonMatch) {
          seasonal = {
            months: monthsMatch[1].split(',').map(m => parseInt(m.trim())),
            peak_months: peakMonthsMatch[1].split(',').map(m => parseInt(m.trim())),
            season: seasonMatch[1]
          };
        }
      }
      
      ingredients.push({
        name,
        subcategory,
        units,
        seasonal,
        uuid // Include UUID if present
      });
    }
    
    return { category, ingredients };
  }
  
  async loadIngredientsFromAssets(): Promise<Ingredient[]> {
    const ingredients: Ingredient[] = [];
    
    // Category mapping from XML filenames to our type system
    const categoryFiles = [
      { file: require('../../Data/fruits.xml'), category: 'fruits' as IngredientCategory },
      { file: require('../../Data/legumes.xml'), category: 'legumes' as IngredientCategory },
      { file: require('../../Data/viande.xml'), category: 'viande' as IngredientCategory },
      { file: require('../../Data/produits_laitiers.xml'), category: 'produits_laitiers' as IngredientCategory },
      { file: require('../../Data/epicerie.xml'), category: 'epicerie' as IngredientCategory },
      { file: require('../../Data/peche.xml'), category: 'peche' as IngredientCategory }
    ];
    
    try {
      console.log('Loading ingredients from XML files...');
      
      for (const categoryFile of categoryFiles) {
        try {
          // Load the asset and read its content
          const asset = Asset.fromModule(categoryFile.file);
          await asset.downloadAsync();
          
          // Read the XML content
          const response = await fetch(asset.localUri || asset.uri);
          const xmlContent = await response.text();
          
          // Parse the XML content using our existing parser
          const categoryIngredients = this.parseXMLContent(xmlContent, categoryFile.category);
          ingredients.push(...categoryIngredients);
          
          console.log(`Loaded ${categoryIngredients.length} ingredients from ${categoryFile.category}`);
        } catch (fileError) {
          console.error(`Error loading ${categoryFile.category} XML:`, fileError);
          // Continue with other files even if one fails
        }
      }
      
      console.log(`✅ Total ingredients loaded: ${ingredients.length}`);
      return ingredients;
    } catch (error) {
      console.error('Error loading ingredient data from XML:', error);
      return [];
    }
  }
  
  // Method to parse XML content once we have the file content
  parseXMLContent(xmlContent: string, category: IngredientCategory): Ingredient[] {
    const parsed = this.parseXMLToJSON(xmlContent);
    const ingredients: Ingredient[] = [];
    
    parsed.ingredients.forEach((xmlIngredient: XMLIngredient & { uuid?: string }) => {
      const ingredient: Ingredient = {
        id: xmlIngredient.uuid || uuid.v4(), // Use UUID from XML if available, otherwise generate new one
        name: xmlIngredient.name,
        category: category,
        subcategory: xmlIngredient.subcategory,
        units: xmlIngredient.units,
        seasonal: xmlIngredient.seasonal,
        isUserCreated: false,
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      ingredients.push(ingredient);
    });
    
    return ingredients;
  }
}

export const xmlDataLoader = new XMLDataLoader();

// XML parser specifically for recipe data
export class RecipeXMLParser {
  private mapCategoryToType(xmlCategory: string): RecipeCategory {
    switch (xmlCategory.toLowerCase()) {
      case 'entrées':
      case 'entrees':
        return 'entree';
      case 'plats principaux':
      case 'plats-principaux':
        return 'plats';
      case 'desserts':
        return 'dessert';
      default:
        return 'plats'; // Default fallback
    }
  }

  private mapDifficultyToType(xmlDifficulty: string): RecipeDifficulty {
    switch (xmlDifficulty.toLowerCase()) {
      case 'facile':
        return 'facile';
      case 'moyen':
        return 'moyen';
      case 'difficile':
        return 'difficile';
      default:
        return 'facile'; // Default fallback
    }
  }

  private parseXMLToRecipes(xmlText: string): { category: RecipeCategory; recipes: XMLRecipe[] } {
    // Extract category from root element
    const categoryMatch = xmlText.match(/<recipes category="([^"]*)">/);
    const categoryName = categoryMatch ? categoryMatch[1] : 'Plats';
    const category = this.mapCategoryToType(categoryName);
    
    const recipes: XMLRecipe[] = [];
    const recipeRegex = /<recipe>([\s\S]*?)<\/recipe>/g;
    
    let match;
    while ((match = recipeRegex.exec(xmlText)) !== null) {
      const recipeContent = match[1];
      
      // Parse basic recipe information
      const id = this.extractValue(recipeContent, 'id') || '';
      const name = this.extractValue(recipeContent, 'name') || '';
      const description = this.extractValue(recipeContent, 'description') || '';
      const preparationTime = parseInt(this.extractValue(recipeContent, 'preparation_time') || '0');
      const cookingTime = parseInt(this.extractValue(recipeContent, 'cooking_time') || '0');
      const servings = parseInt(this.extractValue(recipeContent, 'servings') || '0');
      const categoryId = parseInt(this.extractValue(recipeContent, 'category_id') || '1');
      const difficultyLevel = this.extractValue(recipeContent, 'difficulty_level') || 'facile';
      const createdAt = this.extractValue(recipeContent, 'created_at') || new Date().toISOString();
      const updatedAt = this.extractValue(recipeContent, 'updated_at') || new Date().toISOString();
      
      // Parse ingredients
      const ingredients = this.parseIngredients(recipeContent);
      
      // Parse instructions
      const instructions = this.parseInstructions(recipeContent);
      
      recipes.push({
        id,
        name,
        description,
        preparation_time: preparationTime,
        cooking_time: cookingTime,
        servings,
        category_id: categoryId,
        difficulty_level: difficultyLevel,
        created_at: createdAt,
        updated_at: updatedAt,
        ingredients,
        instructions
      });
    }
    
    return { category, recipes };
  }

  private extractValue(content: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`);
    const match = content.match(regex);
    return match ? match[1] : null;
  }

  private parseIngredients(recipeContent: string): XMLRecipeIngredient[] {
    const ingredients: XMLRecipeIngredient[] = [];
    const ingredientsSection = recipeContent.match(/<ingredients>([\s\S]*?)<\/ingredients>/);
    
    if (ingredientsSection) {
      const ingredientRegex = /<ingredient>([\s\S]*?)<\/ingredient>/g;
      let match;
      
      while ((match = ingredientRegex.exec(ingredientsSection[1])) !== null) {
        const ingredientContent = match[1];
        const ingredientId = this.extractValue(ingredientContent, 'ingredient_id') || '';
        const quantity = parseFloat(this.extractValue(ingredientContent, 'quantity') || '0');
        const unit = this.extractValue(ingredientContent, 'unit') || '';
        
        ingredients.push({
          ingredient_id: ingredientId,
          quantity,
          unit
        });
      }
    }
    
    return ingredients;
  }

  private parseInstructions(recipeContent: string): XMLRecipeInstruction[] {
    const instructions: XMLRecipeInstruction[] = [];
    const instructionsSection = recipeContent.match(/<instructions>([\s\S]*?)<\/instructions>/);
    
    if (instructionsSection) {
      const stepRegex = /<step number="(\d+)">([^<]*)<\/step>/g;
      let match;
      
      while ((match = stepRegex.exec(instructionsSection[1])) !== null) {
        const stepNumber = parseInt(match[1]);
        const instruction = match[2];
        
        instructions.push({
          number: stepNumber,
          instruction
        });
      }
    }
    
    return instructions;
  }

  async loadRecipesFromAssets(): Promise<CreateRecipeInput[]> {
    const recipes: CreateRecipeInput[] = [];
    
    // Recipe files mapping
    const recipeFiles = [
      { file: require('../../Data/Recipe/entrees.xml') },
      { file: require('../../Data/Recipe/plats-principaux.xml') }
    ];
    
    try {
      console.log('🍽️ Loading recipes from XML files...');
      
      for (const recipeFile of recipeFiles) {
        try {
          // Load the asset and read its content
          const asset = Asset.fromModule(recipeFile.file);
          await asset.downloadAsync();
          
          // Read the XML content
          const response = await fetch(asset.localUri || asset.uri);
          const xmlContent = await response.text();
          
          // Parse the XML content
          const parsedRecipes = this.parseXMLContent(xmlContent);
          recipes.push(...parsedRecipes);
          
          console.log(`✅ Loaded ${parsedRecipes.length} recipes from XML file`);
        } catch (fileError) {
          console.error(`❌ Error loading recipe XML file:`, fileError);
        }
      }
      
      console.log(`🎉 Total recipes loaded: ${recipes.length}`);
      return recipes;
    } catch (error) {
      console.error('💥 Error loading recipe data from XML:', error);
      return [];
    }
  }

  parseXMLContent(xmlContent: string): CreateRecipeInput[] {
    const parsed = this.parseXMLToRecipes(xmlContent);
    const recipes: CreateRecipeInput[] = [];
    
    parsed.recipes.forEach((xmlRecipe: XMLRecipe) => {
      // Convert XML recipe to CreateRecipeInput
      const recipe: CreateRecipeInput = {
        name: xmlRecipe.name,
        description: xmlRecipe.description,
        prepTime: xmlRecipe.preparation_time,
        cookTime: xmlRecipe.cooking_time,
        servings: xmlRecipe.servings,
        difficulty: this.mapDifficultyToType(xmlRecipe.difficulty_level),
        category: parsed.category,
        ingredients: xmlRecipe.ingredients.map((xmlIngredient, index) => ({
          ingredientId: xmlIngredient.ingredient_id,
          quantity: xmlIngredient.quantity,
          unit: xmlIngredient.unit,
          optional: false,
          orderIndex: index + 1
        })),
        instructions: xmlRecipe.instructions.map((xmlInstruction) => ({
          stepNumber: xmlInstruction.number,
          instruction: xmlInstruction.instruction
        }))
      };
      
      recipes.push(recipe);
    });
    
    return recipes;
  }
}

export const recipeXMLParser = new RecipeXMLParser();