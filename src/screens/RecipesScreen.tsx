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
import { router } from 'expo-router';
import { Recipe, RecipeCategory } from '../types';
import { colors, spacing, typography } from '../styles';
import { useRecipes, useRecipeCategories } from '../hooks/useRecipes';
import { useRecipeBulkSharing } from '../hooks/useRecipeSharing';
import { SearchBar } from '../components/common/SearchBar';
import { CategoryChips } from '../components/common/CategoryChips';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { ShareModal } from '../components/recipe/ShareModal';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';

interface RecipeCategoryChip {
  id: string;
  label: string;
  icon: string;
  count?: number;
  value: RecipeCategory | 'all';
}

export const RecipesScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalMode, setShareModalMode] = useState<'multiple' | 'shopping-list'>('multiple');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const { recipes, loading, error, actions } = useRecipes();
  const { categories, loading: categoriesLoading } = useRecipeCategories();
  const bulkSharing = useRecipeBulkSharing();

  // Create category chips
  const categoryChips: RecipeCategoryChip[] = useMemo(() => {
    const categoryIcons = {
      entree: '🥗',
      plats: '🍽️', 
      dessert: '🍰',
      all: '📋'
    };
    
    const chips: RecipeCategoryChip[] = [
      { id: 'all', label: 'Toutes', icon: categoryIcons.all, value: 'all' }
    ];

    categories.forEach(cat => {
      chips.push({
        id: cat.category,
        label: cat.label,
        icon: categoryIcons[cat.category as keyof typeof categoryIcons] || '📝',
        count: cat.count,
        value: cat.category
      });
    });

    return chips;
  }, [categories]);

  // Filter recipes based on search and filters
  const filteredRecipes = useMemo(() => {
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
      filtered = filtered.filter(recipe => recipe.category === selectedCategory);
    }

    return filtered;
  }, [recipes, searchQuery, selectedCategory]);

  // Group recipes by category for display
  const groupedRecipes = useMemo(() => {
    if (selectedCategory !== 'all') {
      return [{ category: selectedCategory, recipes: filteredRecipes }];
    }

    const groups: { category: RecipeCategory | 'all', recipes: Recipe[] }[] = [];
    const categoryOrder: (RecipeCategory | 'all')[] = ['entree', 'plats', 'dessert'];

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
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId as RecipeCategory | 'all');
  }, []);

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
    Alert.alert(
      'Supprimer la recette',
      `Êtes-vous sûr de vouloir supprimer "${recipe.name}" ? Cette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deleteRecipe(recipe.id);
              Alert.alert('Succès', 'Recette supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la recette');
            }
          }
        }
      ]
    );
  }, [actions]);

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
    setShareModalMode('multiple');
    setShareModalVisible(true);
  }, [bulkSharing.selectedCount]);

  const handleBulkShoppingList = useCallback(() => {
    if (bulkSharing.selectedCount === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
      return;
    }
    setShareModalMode('shopping-list');
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

  const renderCategorySection = ({ item }: { item: { category: RecipeCategory | 'all', recipes: Recipe[] } }) => {
    const categoryLabels = {
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
        
        {!isCollapsed && item.recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={handleRecipePress}
            onLongPress={handleRecipeLongPress}
            showUsageStats={true}
            selectionMode={selectionMode}
            selected={bulkSharing.selectedRecipes.some(r => r.id === recipe.id)}
          />
        ))}
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
        {/* Header */}
        <View style={styles.header}>
          {selectionMode ? (
            <>
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
                    style={styles.selectionActionButton}
                    onPress={handleBulkShare}
                  >
                    <Text style={styles.selectionActionText}>📤 Partager</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.selectionActionButton}
                    onPress={handleBulkShoppingList}
                  >
                    <Text style={styles.selectionActionText}>🛒 Liste courses</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.titleRow}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>Mes Recettes</Text>
                  <Text style={styles.subtitle}>
                    {recipes.length} recette{recipes.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.selectionModeButton}
                  onPress={toggleSelectionMode}
                >
                  <Text style={styles.selectionModeText}>Sélectionner</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Search and Filters Section */}
        <View style={styles.searchAndFiltersSection}>
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Rechercher une recette..."
            />
          </View>

          <View style={styles.filtersContainer}>
            <CategoryChips
              categories={categoryChips}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              loading={categoriesLoading}
            />
          </View>
        </View>

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
          mode={shareModalMode}
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

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  title: {
    ...typography.styles.h1,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },

  searchAndFiltersSection: {
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  searchContainer: {
    marginBottom: spacing.md,
  },

  filtersContainer: {
    // Container now just holds the CategoryChips
  },


  content: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100, // Space for floating button
  },

  categorySection: {
    marginBottom: spacing.lg,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleContainer: {
    flex: 1,
  },

  selectionModeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
  },

  selectionModeText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

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
});