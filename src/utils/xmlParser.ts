import { IngredientCategory, Ingredient } from '../types';
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

// Simple XML parser for ingredient data
export class XMLDataLoader {
  private parseXMLToJSON(xmlText: string): any {
    // Simple regex-based XML parser for our specific structure
    const categoryMatch = xmlText.match(/<category category="([^"]*)">/);
    const category = categoryMatch ? categoryMatch[1].toLowerCase() : 'autres';
    
    const ingredients: XMLIngredient[] = [];
    const ingredientRegex = /<ingredient name="([^"]*)">([\s\S]*?)<\/ingredient>/g;
    
    let match;
    while ((match = ingredientRegex.exec(xmlText)) !== null) {
      const name = match[1];
      const content = match[2];
      
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
        seasonal
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
    
    parsed.ingredients.forEach((xmlIngredient: XMLIngredient) => {
      const ingredient: Ingredient = {
        id: uuid.v4(),
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