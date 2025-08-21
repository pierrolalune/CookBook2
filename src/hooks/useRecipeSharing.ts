import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { Recipe } from '../types';
import { RecipeExporter, ExportOptions } from '../utils/recipeExporter';
import { SecureErrorHandler } from '../utils/errorHandler';

interface UseRecipeSharingState {
  loading: boolean;
  error: string | null;
  lastExportPath?: string;
}

interface UseRecipeSharingActions {
  shareRecipe: (recipe: Recipe, format?: 'text' | 'pdf' | 'json') => Promise<void>;
  shareMultipleRecipes: (recipes: Recipe[], format?: 'text' | 'json') => Promise<void>;
  shareShoppingList: (recipes: Recipe[]) => Promise<void>;
  exportRecipe: (recipe: Recipe, format?: 'text' | 'pdf' | 'json', options?: ExportOptions) => Promise<string>;
  exportMultipleRecipes: (recipes: Recipe[], format?: 'text' | 'json') => Promise<string[]>;
  generateShoppingList: (recipes: Recipe[]) => Promise<string>;
  cleanupOldExports: (maxAgeInDays?: number) => Promise<void>;
  initializeExportSystem: () => Promise<void>;
}

interface UseRecipeSharingReturn {
  loading: boolean;
  error: string | null;
  lastExportPath?: string;
  actions: UseRecipeSharingActions;
}

export const useRecipeSharing = (): UseRecipeSharingReturn => {
  const [state, setState] = useState<UseRecipeSharingState>({
    loading: false,
    error: null
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<UseRecipeSharingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Share a single recipe
  const shareRecipe = useCallback(async (recipe: Recipe, format: 'text' | 'pdf' | 'json' = 'text'): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      await RecipeExporter.shareRecipe(recipe, format);
      
      updateState({ loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      Alert.alert(
        'Erreur de partage',
        `Impossible de partager la recette "${recipe.name}". ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, [updateState]);

  // Share multiple recipes (not yet implemented in RecipeExporter)
  const shareMultipleRecipes = useCallback(async (recipes: Recipe[], format: 'text' | 'json' = 'text'): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      // For now, share each recipe individually
      // TODO: Implement bulk recipe sharing
      for (const recipe of recipes) {
        await RecipeExporter.shareRecipe(recipe, format);
      }
      
      updateState({ loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      Alert.alert(
        'Erreur de partage',
        `Impossible de partager les recettes. ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, [updateState]);

  // Share shopping list
  const shareShoppingList = useCallback(async (recipes: Recipe[]): Promise<void> => {
    if (recipes.length === 0) {
      Alert.alert('Erreur', 'Aucune recette sélectionnée pour la liste de courses');
      return;
    }

    try {
      updateState({ loading: true, error: null });
      
      await RecipeExporter.shareShoppingList(recipes);
      
      updateState({ loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      Alert.alert(
        'Erreur de partage',
        `Impossible de partager la liste de courses. ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, [updateState]);

  // Export a single recipe
  const exportRecipe = useCallback(async (
    recipe: Recipe, 
    format: 'text' | 'pdf' | 'json' = 'text',
    options: ExportOptions = {}
  ): Promise<string> => {
    try {
      updateState({ loading: true, error: null });
      
      let filePath: string;
      
      switch (format) {
        case 'pdf':
          filePath = await RecipeExporter.exportToPDF(recipe, options);
          break;
        case 'json':
          filePath = await RecipeExporter.exportToJSON(recipe);
          break;
        default:
          filePath = await RecipeExporter.exportToText(recipe, options);
      }
      
      updateState({ loading: false, lastExportPath: filePath });
      
      return filePath;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      Alert.alert(
        'Erreur d\'export',
        `Impossible d'exporter la recette "${recipe.name}". ${errorMessage}`,
        [{ text: 'OK' }]
      );
      
      throw error;
    }
  }, [updateState]);

  // Export multiple recipes
  const exportMultipleRecipes = useCallback(async (
    recipes: Recipe[],
    format: 'text' | 'json' = 'text'
  ): Promise<string[]> => {
    if (recipes.length === 0) {
      Alert.alert('Erreur', 'Aucune recette sélectionnée pour l\'export');
      return [];
    }

    try {
      updateState({ loading: true, error: null });
      
      const exportedPaths: string[] = [];
      
      for (const recipe of recipes) {
        try {
          let filePath: string;
          
          switch (format) {
            case 'json':
              filePath = await RecipeExporter.exportToJSON(recipe);
              break;
            default:
              filePath = await RecipeExporter.exportToText(recipe);
          }
          
          exportedPaths.push(filePath);
        } catch (error) {
          SecureErrorHandler.logError(error as Error, { 
            action: 'exportMultipleRecipes', 
            recipeId: recipe.id 
          });
          // Continue with other recipes
        }
      }
      
      updateState({ loading: false });
      
      if (exportedPaths.length === 0) {
        throw new Error('Aucune recette n\'a pu être exportée');
      }
      
      if (exportedPaths.length < recipes.length) {
        Alert.alert(
          'Export partiel',
          `${exportedPaths.length}/${recipes.length} recettes exportées avec succès`,
          [{ text: 'OK' }]
        );
      }
      
      return exportedPaths;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      Alert.alert(
        'Erreur d\'export',
        `Impossible d'exporter les recettes. ${errorMessage}`,
        [{ text: 'OK' }]
      );
      
      throw error;
    }
  }, [updateState]);

  // Generate shopping list
  const generateShoppingList = useCallback(async (recipes: Recipe[]): Promise<string> => {
    if (recipes.length === 0) {
      Alert.alert('Erreur', 'Aucune recette sélectionnée pour la liste de courses');
      throw new Error('No recipes selected');
    }

    try {
      updateState({ loading: true, error: null });
      
      const filePath = await RecipeExporter.generateShoppingList(recipes);
      
      updateState({ loading: false, lastExportPath: filePath });
      
      return filePath;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      Alert.alert(
        'Erreur de génération',
        `Impossible de générer la liste de courses. ${errorMessage}`,
        [{ text: 'OK' }]
      );
      
      throw error;
    }
  }, [updateState]);

  // Clean up old export files
  const cleanupOldExports = useCallback(async (maxAgeInDays: number = 7): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      await RecipeExporter.cleanupOldExports(maxAgeInDays);
      
      updateState({ loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      SecureErrorHandler.logError(error as Error, { action: 'cleanupOldExports' });
      // Don't show alert for cleanup errors
    }
  }, [updateState]);

  // Initialize export system
  const initializeExportSystem = useCallback(async (): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      await RecipeExporter.initializeExportDirectory();
      
      updateState({ loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      
      SecureErrorHandler.logError(error as Error, { action: 'initializeExportSystem' });
    }
  }, [updateState]);

  const actions: UseRecipeSharingActions = useMemo(() => ({
    shareRecipe,
    shareMultipleRecipes,
    shareShoppingList,
    exportRecipe,
    exportMultipleRecipes,
    generateShoppingList,
    cleanupOldExports,
    initializeExportSystem
  }), [
    shareRecipe,
    shareMultipleRecipes,
    shareShoppingList,
    exportRecipe,
    exportMultipleRecipes,
    generateShoppingList,
    cleanupOldExports,
    initializeExportSystem
  ]);

  return {
    loading: state.loading,
    error: state.error,
    lastExportPath: state.lastExportPath,
    actions
  };
};

// Hook for batch operations
export const useRecipeBulkSharing = () => {
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const sharing = useRecipeSharing();

  const addRecipe = useCallback((recipe: Recipe) => {
    setSelectedRecipes(prev => {
      if (prev.find(r => r.id === recipe.id)) {
        return prev; // Already selected
      }
      return [...prev, recipe];
    });
  }, []);

  const removeRecipe = useCallback((recipeId: string) => {
    setSelectedRecipes(prev => prev.filter(r => r.id !== recipeId));
  }, []);

  const toggleRecipe = useCallback((recipe: Recipe) => {
    setSelectedRecipes(prev => {
      const exists = prev.find(r => r.id === recipe.id);
      if (exists) {
        return prev.filter(r => r.id !== recipe.id);
      } else {
        return [...prev, recipe];
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRecipes([]);
  }, []);

  const shareSelected = useCallback(async (format: 'text' | 'json' = 'text') => {
    if (selectedRecipes.length === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
      return;
    }

    await sharing.actions.shareMultipleRecipes(selectedRecipes, format);
  }, [selectedRecipes, sharing.actions]);

  const exportSelected = useCallback(async (format: 'text' | 'json' = 'text') => {
    if (selectedRecipes.length === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
      return [];
    }

    return sharing.actions.exportMultipleRecipes(selectedRecipes, format);
  }, [selectedRecipes, sharing.actions]);

  const generateShoppingListForSelected = useCallback(async () => {
    if (selectedRecipes.length === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
      return '';
    }

    return sharing.actions.generateShoppingList(selectedRecipes);
  }, [selectedRecipes, sharing.actions]);

  const actions = useMemo(() => ({
    addRecipe,
    removeRecipe,
    toggleRecipe,
    clearSelection,
    shareSelected,
    exportSelected,
    generateShoppingListForSelected,
    ...sharing.actions
  }), [
    addRecipe,
    removeRecipe,
    toggleRecipe,
    clearSelection,
    shareSelected,
    exportSelected,
    generateShoppingListForSelected,
    sharing.actions
  ]);

  return {
    selectedRecipes,
    selectedCount: selectedRecipes.length,
    loading: sharing.loading,
    error: sharing.error,
    actions
  };
};