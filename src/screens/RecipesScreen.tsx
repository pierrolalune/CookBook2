import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Recipe, RecipeCategory } from '../types';
import { colors, spacing, typography } from '../styles';
import { useRecipes, useRecipeCategories } from '../hooks/useRecipes';
import { useRecipeBulkSharing } from '../hooks/useRecipeSharing';
import { useRecipeFavorites } from '../hooks/useRecipeFavorites';
import { useAdvancedRecipeSearch, useWhatCanIMake } from '../hooks/useAdvancedRecipeSearch';
import { useIngredients } from '../hooks/useIngredients';
import { GradientHeader } from '../components/common/GradientHeader';
import { CategoryChips } from '../components/common/CategoryChips';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { ShareModal } from '../components/recipe/ShareModal';
import { AdvancedSearchModal } from '../components/recipe/AdvancedSearchModal';
import { MakeableRecipesModal } from '../components/recipe/MakeableRecipesModal';
import { RecipeMatchAnalyzer } from '../components/recipe/RecipeMatchAnalyzer';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { AdvancedSearchFilters, RecipeMatchResult } from '../utils/recipeSearchUtils';

interface RecipeCategoryChip {
  id: string;
  label: string;
  icon: string;
  count?: number;
  value: RecipeCategory | 'favoris' | 'all';
}

export const RecipesScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'favoris' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // Advanced search state
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
  const [makeableModalVisible, setMakeableModalVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced' | 'makeable'>('basic');
  
  // Set search mode
  const loggedSetSearchMode = useCallback((mode: 'basic' | 'advanced' | 'makeable') => {
    setSearchMode(mode);
  }, []);
  const [showMatchAnalysis, setShowMatchAnalysis] = useState(false);

  const { recipes, loading, error, actions } = useRecipes();
  const { categories, loading: categoriesLoading, refresh: refreshCategories } = useRecipeCategories();
  const bulkSharing = useRecipeBulkSharing();
  
  // Get available ingredients for advanced search
  const { ingredients: availableIngredients } = useIngredients();
  
  // Advanced search functionality
  const advancedSearch = useAdvancedRecipeSearch({
    recipes,
    availableIngredients,
    onSearchComplete: (results) => {
      if (results.length === 0) {
        Alert.alert('Aucun résultat', 'Aucune recette ne correspond à vos critères de recherche.');
      }
    }
  });
  
  // "What can I make?" functionality
  const whatCanIMake = useWhatCanIMake(recipes, availableIngredients);
  
  // Create fast update callback for favorites
  const handleFavoriteChange = useCallback((recipeId: string, isFavorite: boolean) => {
    // Fast update: Update recipe in memory immediately
    actions.updateRecipeFavoriteStatus(recipeId, isFavorite);
    // Refresh categories to update favorite count (this is lightweight)
    refreshCategories();
  }, [actions, refreshCategories]);

  // Create main category pills for the gradient header (avoid duplicate favoris)
  const mainFilterPills = useMemo(() => {
    const pills = [
      { id: 'all', label: 'Toutes', icon: '📋' }
    ];
    
    // Add categories from the hook (which includes favoris)
    categories.forEach(cat => {
      const categoryIcons = {
        favoris: '❤️',
        entree: '🥗',
        plats: '🍽️', 
        dessert: '🍰'
      };
      
      pills.push({
        id: cat.category,
        label: cat.label,
        icon: categoryIcons[cat.category as keyof typeof categoryIcons] || '📝'
      });
    });
    
    return pills;
  }, [categories]);
  
  // Create secondary pills for advanced search
  const secondaryPills = useMemo(() => {
    const pills = [];
    
    // Advanced search pill
    pills.push({
      id: 'advanced',
      label: 'Recherche avancée',
      icon: '🔍'
    });
    
    // What can I make pill
    if (availableIngredients.length > 0) {
      pills.push({
        id: 'makeable',
        label: whatCanIMake.isManualMode 
          ? (whatCanIMake.selectedIngredientIds.length === 0 && whatCanIMake.excludedIngredientIds.length > 0 
             ? 'Exclusions' 
             : 'Mes ingrédients')
          : 'Réalisable',
        icon: whatCanIMake.isManualMode ? '🍽️' : '✅'
      });
    }
    
    // Reset button when advanced modes are active
    if (searchMode !== 'basic') {
      pills.push({
        id: 'reset',
        label: 'Effacer',
        icon: '❌'
      });
    }
    
    return pills;
  }, [availableIngredients.length, whatCanIMake.isManualMode, whatCanIMake.selectedIngredientIds.length, whatCanIMake.excludedIngredientIds.length, searchMode]);

  // Enhanced filtering logic with advanced search support
  const filteredRecipes = useMemo(() => {
    // Advanced search mode - use search results directly
    if (searchMode === 'advanced' && advancedSearch.state.hasSearched) {
      return advancedSearch.state.results.map(result => result.recipe);
    }
    
    // "What can I make?" mode - use makeable recipes
    if (searchMode === 'makeable') {
      return whatCanIMake.makeableRecipes.map(result => result.recipe);
    }
    
    // Basic search mode - original logic
    let filtered = recipes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe =>
        recipe.name.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => 
          ing.ingredient.name.toLowerCase().includes(query)
        )
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favoris') {
        filtered = filtered.filter(recipe => recipe.isFavorite);
      } else {
        filtered = filtered.filter(recipe => recipe.category === selectedCategory);
      }
    }

    return filtered;
  }, [recipes, searchQuery, selectedCategory, searchMode, advancedSearch.state.hasSearched, advancedSearch.state.results, whatCanIMake.makeableRecipes]);
  
  // Get match results for display when in advanced mode
  const matchResults = useMemo(() => {
    if (searchMode === 'advanced' && advancedSearch.state.hasSearched) {
      return advancedSearch.state.results;
    }
    if (searchMode === 'makeable') {
      return whatCanIMake.makeableRecipes;
    }
    return [];
  }, [searchMode, advancedSearch.state.hasSearched, advancedSearch.state.results, whatCanIMake.makeableRecipes]);

  // Group recipes by category for display
  const groupedRecipes = useMemo(() => {
    if (selectedCategory !== 'all') {
      return [{ category: selectedCategory, recipes: filteredRecipes }];
    }

    const groups: { category: RecipeCategory | 'favoris' | 'all', recipes: Recipe[] }[] = [];
    const categoryOrder: (RecipeCategory | 'favoris' | 'all')[] = ['entree', 'plats', 'dessert'];

    categoryOrder.forEach(category => {
      const categoryRecipes = filteredRecipes.filter(recipe => recipe.category === category);
      if (categoryRecipes.length > 0) {
        groups.push({ category, recipes: categoryRecipes });
      }
    });

    return groups;
  }, [filteredRecipes, selectedCategory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await actions.refreshRecipes();
    } catch (error) {
      console.error('Error refreshing recipes:', error);
    } finally {
      setRefreshing(false);
    }
  }, [actions]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Temporarily disable automatic reset to basic search
    // if (searchMode !== 'basic') {
    //   loggedSetSearchMode('basic');
    //   setShowMatchAnalysis(false);
    // }
  }, [searchMode, loggedSetSearchMode]);
  
  // Advanced search handlers
  const handleAdvancedSearch = useCallback((filters: AdvancedSearchFilters) => {
    console.log('Starting advanced search with filters:', filters);
    loggedSetSearchMode('advanced');
    setShowMatchAnalysis(true);
    advancedSearch.actions.performSearch(filters);
  }, [advancedSearch.actions, loggedSetSearchMode]);
  
  const handleWhatCanIMake = useCallback(() => {
    // Open ingredient selection modal instead of automatic mode
    setMakeableModalVisible(true);
  }, []);

  // Handle ingredient selection from makeable modal
  const handleMakeableSearch = useCallback((selectedIngredientIds: string[], matchThreshold: number, excludedIngredients?: string[]) => {
    loggedSetSearchMode('makeable');
    setShowMatchAnalysis(true);
    // Use the enhanced hook with manual selection
    whatCanIMake.findRecipesWithSelection(selectedIngredientIds, matchThreshold, excludedIngredients);
  }, [loggedSetSearchMode, whatCanIMake]);
  
  const handleResetSearch = useCallback(async () => {
    loggedSetSearchMode('basic');
    setShowMatchAnalysis(false);
    setSearchQuery('');
    setSelectedCategory('all');
    advancedSearch.actions.clearResults();
    // Also reset the "What Can I Make" filter to clear selected/excluded ingredients
    await whatCanIMake.resetToAutoMode();
  }, [advancedSearch.actions, loggedSetSearchMode, whatCanIMake]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId as RecipeCategory | 'favoris' | 'all');
  }, []);
  
  const handleMainFilterPill = useCallback((pillId: string) => {
    handleCategorySelect(pillId);
  }, [handleCategorySelect]);
  
  const handleSecondaryPill = useCallback((pillId: string) => {
    if (pillId === 'advanced') {
      setAdvancedSearchVisible(true);
    } else if (pillId === 'makeable') {
      handleWhatCanIMake();
    } else if (pillId === 'reset') {
      handleResetSearch();
    }
  }, [handleWhatCanIMake, handleResetSearch]);

  const handleRecipePress = useCallback((recipe: Recipe) => {
    if (selectionMode) {
      bulkSharing.actions.toggleRecipe(recipe);
    } else {
      router.push({
        pathname: '/recipe/[id]',
        params: { id: recipe.id }
      });
    }
  }, [selectionMode, bulkSharing.actions]);

  const handleRecipeLongPress = useCallback((recipe: Recipe) => {
    if (selectionMode) {
      return; // No long press in selection mode
    }
    
    Alert.alert(
      recipe.name,
      'Que souhaitez-vous faire ?',
      [
        {
          text: 'Voir',
          onPress: () => handleRecipePress(recipe)
        },
        {
          text: 'Modifier',
          onPress: () => router.push({
            pathname: '/recipe/[id]/edit',
            params: { id: recipe.id }
          })
        },
        {
          text: 'Dupliquer',
          onPress: () => handleDuplicateRecipe(recipe)
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => handleDeleteRecipe(recipe)
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  }, [handleRecipePress]);

  const handleDuplicateRecipe = useCallback(async (recipe: Recipe) => {
    try {
      await actions.duplicateRecipe(recipe.id, `${recipe.name} (Copie)`);
      Alert.alert('Succès', 'Recette dupliquée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de dupliquer la recette');
    }
  }, [actions]);

  const handleDeleteRecipe = useCallback(async (recipe: Recipe) => {
    try {
      await actions.deleteRecipe(recipe.id);
      Alert.alert('Succès', 'Recette supprimée');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer la recette');
    }
  }, [actions]);

  const handleEditRecipe = useCallback((recipe: Recipe) => {
    router.push({
      pathname: '/recipe/[id]/edit',
      params: { id: recipe.id }
    });
  }, []);

  const handleAddRecipe = useCallback(() => {
    router.push('/add-recipe');
  }, []);

  // Selection mode handlers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode, clear selection
        bulkSharing.actions.clearSelection();
      }
      return !prev;
    });
  }, [bulkSharing.actions]);

  const handleSelectAll = useCallback(() => {
    filteredRecipes.forEach(recipe => {
      if (!bulkSharing.selectedRecipes.find(r => r.id === recipe.id)) {
        bulkSharing.actions.addRecipe(recipe);
      }
    });
  }, [filteredRecipes, bulkSharing.selectedRecipes, bulkSharing.actions]);

  const handleBulkShare = useCallback(() => {
    if (bulkSharing.selectedCount === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
      return;
    }
    setShareModalVisible(true);
  }, [bulkSharing.selectedCount]);


  // Toggle category collapse
  const toggleCategoryCollapse = useCallback((category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // Render recipe with match analysis if in advanced mode
  const renderRecipeItem = useCallback((recipe: Recipe, matchResult?: RecipeMatchResult) => {
    const commonProps = {
      recipe,
      onPress: handleRecipePress,
      onLongPress: handleRecipeLongPress,
      onEdit: handleEditRecipe,
      onDelete: handleDeleteRecipe,
      showUsageStats: true,
      selectionMode,
      selected: bulkSharing.selectedRecipes.some(r => r.id === recipe.id),
      onFavoriteChange: handleFavoriteChange
    };
    
    if (showMatchAnalysis && matchResult) {
      // Check if we're in exclusion-only mode
      const exclusionOnlyMode = searchMode === 'makeable' && 
        whatCanIMake.selectedIngredientIds.length === 0 && 
        whatCanIMake.excludedIngredientIds.length > 0;
        
      return (
        <RecipeMatchAnalyzer
          key={`match-${recipe.id}`}
          matchResult={matchResult}
          onRecipePress={(recipeId) => {
            router.push({
              pathname: '/recipe/[id]',
              params: { id: recipeId }
            });
          }}
          showDetails={true}
          exclusionOnlyMode={exclusionOnlyMode}
        />
      );
    }
    
    return <RecipeCard key={recipe.id} {...commonProps} />;
  }, [handleRecipePress, handleRecipeLongPress, handleEditRecipe, handleDeleteRecipe, selectionMode, bulkSharing.selectedRecipes, handleFavoriteChange, showMatchAnalysis, router, searchMode, whatCanIMake.selectedIngredientIds, whatCanIMake.excludedIngredientIds]);
  
  const renderCategorySection = ({ item }: { item: { category: RecipeCategory | 'favoris' | 'all', recipes: Recipe[] } }) => {
    const categoryLabels = {
      favoris: 'Favoris',
      entree: 'Entrées',
      plats: 'Plats',
      dessert: 'Desserts',
      all: 'Toutes les recettes'
    };

    const categoryKey = item.category;
    const isCollapsed = collapsedCategories.has(categoryKey);

    return (
      <View style={styles.categorySection}>
        {selectedCategory === 'all' && (
          <TouchableOpacity 
            style={styles.categoryHeader}
            onPress={() => toggleCategoryCollapse(categoryKey)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryTitle}>
              {categoryLabels[item.category]} ({item.recipes.length})
            </Text>
            <Ionicons 
              name={isCollapsed ? 'chevron-down' : 'chevron-up'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        
        {!isCollapsed && item.recipes.map((recipe) => {
          const matchResult = matchResults.find(mr => mr.recipe.id === recipe.id);
          return renderRecipeItem(recipe, matchResult);
        })}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🍽️</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Essayez avec d\'autres mots-clés'
          : 'Commencez par créer votre première recette'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddRecipe}>
          <Text style={styles.emptyButtonText}>Créer une recette</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Erreur de chargement</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  if (error && !recipes.length) {
    return (
      <ScreenErrorBoundary>
        <View style={styles.container}>
          {renderErrorState()}
        </View>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
      <View style={styles.container}>
        {selectionMode ? (
          // Selection Mode Header
          <View style={styles.selectionModeHeader}>
            <View style={styles.selectionHeader}>
              <TouchableOpacity
                style={styles.cancelSelectionButton}
                onPress={toggleSelectionMode}
              >
                <Text style={styles.cancelSelectionText}>Annuler</Text>
              </TouchableOpacity>
              
              <Text style={styles.selectionTitle}>
                {bulkSharing.selectedCount} sélectionnée{bulkSharing.selectedCount > 1 ? 's' : ''}
              </Text>
              
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={handleSelectAll}
              >
                <Text style={styles.selectAllText}>Tout</Text>
              </TouchableOpacity>
            </View>
            
            {bulkSharing.selectedCount > 0 && (
              <View style={styles.selectionActions}>
                <TouchableOpacity
                  style={[styles.selectionActionButton, styles.singleActionButton]}
                  onPress={handleBulkShare}
                >
                  <Text style={styles.selectionActionText}>📤 Partager</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Modern Gradient Header with Secondary Pills
          <GradientHeader
            title="Mes Recettes"
            searchValue={searchQuery}
            onSearchChange={handleSearch}
            onSearch={handleSearch}
            searchPlaceholder="Rechercher une recette..."
            pills={mainFilterPills}
            activePillId={selectedCategory}
            onPillPress={handleMainFilterPill}
            secondaryPills={secondaryPills}
            activeSecondaryPillId={searchMode === 'basic' ? undefined : searchMode}
            onSecondaryPillPress={handleSecondaryPill}
          />
        )}
        
        {/* Search Status Section - only show when not in basic mode */}
        {!selectionMode && searchMode !== 'basic' && (
          <View style={styles.searchStatusSection}>
            {searchMode === 'advanced' && (
              <View style={styles.statusItem}>
                <Ionicons name="search" size={16} color={colors.primary} />
                <Text style={styles.statusText}>
                  {advancedSearch.state.loading ? 'Recherche avancée en cours...' : 
                   `${advancedSearch.state.totalResults} résultat${advancedSearch.state.totalResults !== 1 ? 's' : ''} trouvé${advancedSearch.state.totalResults !== 1 ? 's' : ''}`
                  }
                </Text>
                <TouchableOpacity
                  style={styles.resetStatusButton}
                  onPress={handleResetSearch}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                  <Text style={styles.resetButtonText}>Effacer</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {searchMode === 'makeable' && (
              <View style={styles.statusItem}>
                <Ionicons name="restaurant" size={16} color={colors.success} />
                <Text style={styles.statusText}>
                  {whatCanIMake.loading ? 'Analyse des ingrédients...' : 
                   whatCanIMake.selectedIngredientIds.length === 0 && whatCanIMake.excludedIngredientIds.length > 0
                     ? `${whatCanIMake.totalMakeable} recette${whatCanIMake.totalMakeable !== 1 ? 's' : ''} sans ingrédients exclus`
                     : `${whatCanIMake.totalMakeable} recette${whatCanIMake.totalMakeable !== 1 ? 's' : ''} réalisable${whatCanIMake.totalMakeable !== 1 ? 's' : ''}`
                  }
                </Text>
                <TouchableOpacity
                  style={styles.resetStatusButton}
                  onPress={handleResetSearch}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                  <Text style={styles.resetButtonText}>Effacer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )
        }

        {/* Recipes List */}
        <View style={styles.content}>
          {groupedRecipes.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={groupedRecipes}
              renderItem={renderCategorySection}
              keyExtractor={(item, index) => `${item.category}_${index}`}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        {/* Floating Add Button */}
        {!selectionMode && (
          <FloatingAddButton onPress={handleAddRecipe} />
        )}

        {/* Share Modal */}
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          recipes={bulkSharing.selectedRecipes}
          mode="multiple"
        />
        
        {/* Advanced Search Modal */}
        <AdvancedSearchModal
          visible={advancedSearchVisible}
          onClose={() => setAdvancedSearchVisible(false)}
          onSearch={handleAdvancedSearch}
          availableIngredients={availableIngredients}
          initialFilters={advancedSearch.state.filters}
        />
        
        <MakeableRecipesModal
          visible={makeableModalVisible}
          onClose={() => setMakeableModalVisible(false)}
          onSearch={handleMakeableSearch}
          availableIngredients={availableIngredients}
          initialSelectedIds={whatCanIMake.selectedIngredientIds}
          initialExcludedIds={whatCanIMake.excludedIngredientIds}
        />
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Selection Mode Header Styles
  selectionModeHeader: {
    backgroundColor: colors.backgroundLight,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Search Status Section
  searchStatusSection: {
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    ...colors.shadow.small,
  },

  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  statusText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    flex: 1,
  },

  resetStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },

  resetButtonText: {
    ...typography.styles.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },


  // Selection Toggle Container


  content: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 12, // Much smaller horizontal padding
    paddingTop: 4, // Very small top padding
    paddingBottom: 100, // Space for floating button
  },

  categorySection: {
    marginBottom: 8, // Very small margin between sections
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },

  categoryTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
    opacity: 0.5,
  },

  emptyTitle: {
    ...typography.styles.h2,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  emptySubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },

  emptyButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },

  errorTitle: {
    ...typography.styles.h2,
    fontWeight: typography.weights.semibold,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  errorSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },

  retryButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  // Selection mode styles

  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  cancelSelectionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  cancelSelectionText: {
    ...typography.styles.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  selectionTitle: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    flex: 1,
    textAlign: 'center',
  },

  selectAllButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  selectAllText: {
    ...typography.styles.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  selectionActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },

  selectionActionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    flex: 1,
    alignItems: 'center',
  },

  selectionActionText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  singleActionButton: {
    flex: 0,
    minWidth: 120,
  },
});