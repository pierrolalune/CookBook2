import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShoppingList, ShoppingListItem, Ingredient } from '../types';
import { useShoppingLists } from '../hooks/useShoppingLists';
import { useShoppingListItems } from '../hooks/useShoppingListItems';
import { CategorySection } from '../components/shoppingList/CategorySection';
import { ShareShoppingListModal } from '../components/shoppingList/ShareShoppingListModal';
import { IngredientSelectorModal } from '../components/recipe/IngredientSelectorModal';
import { ShoppingListProgressBar } from '../components/shoppingList/ShoppingListProgressBar';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { ShoppingListUtils } from '../utils/shoppingListUtils';
import { ShoppingListItemRepository } from '../repositories/ShoppingListItemRepository';

const ShoppingListDetailScreenComponent: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { actions: listActions } = useShoppingLists();
  const {
    items,
    loading,
    error,
    completedItemsCount,
    totalItemsCount,
    hasCompletedItems,
    allItemsCompleted,
    itemsByCategory,
    actions: itemActions
  } = useShoppingListItems();

  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [ingredientSelectorVisible, setIngredientSelectorVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  // Load shopping list and items on mount
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        Alert.alert('Erreur', 'ID de liste manquant');
        router.back();
        return;
      }

      try {
        setLoadingList(true);

        // Load shopping list details directly from repository
        const { ShoppingListRepository } = await import('../repositories/ShoppingListRepository');
        const repository = new ShoppingListRepository();

        console.log('Loading shopping list with ID:', id);
        const list = await repository.findById(id);

        if (!list) {
          console.error('Shopping list not found for ID:', id);
          Alert.alert('Erreur', `Liste de courses introuvable (ID: ${id})`);
          router.back();
          return;
        }

        console.log('Shopping list loaded successfully:', list.name);

        setShoppingList(list);

        // Load items
        console.log('Loading items for shopping list ID:', id);
        await itemActions.loadItems(id);
        console.log('Items loaded successfully');
      } catch (error) {
        console.error('Error loading shopping list:', error);
        Alert.alert('Erreur', 'Impossible de charger la liste de courses');
      } finally {
        setLoadingList(false);
      }
    };

    loadData();
  }, [id]);

  // Filter items based on search query
  const filteredItems = searchQuery.trim()
    ? ShoppingListUtils.searchItems(items, searchQuery)
    : items;

  // Debug logging
  console.log('ShoppingListDetailScreen - Debug Info:', {
    shoppingListId: id,
    totalItems: items.length,
    filteredItems: filteredItems.length,
    searchQuery,
    itemsData: items.slice(0, 3) // Show first 3 items for debugging
  });

  // Group filtered items by category
  const groupedItems = ShoppingListUtils.groupItemsByCategory(filteredItems);

  // Get sorted categories
  const sortedCategories = Object.keys(groupedItems).sort((a, b) =>
    ShoppingListUtils.getCategoryOrder(a) - ShoppingListUtils.getCategoryOrder(b)
  );

  const handleItemToggle = useCallback(async (item: ShoppingListItem) => {
    try {
      await itemActions.toggleItemCompletion(item.id);

      // Update shopping list completion status if needed
      const stats = ShoppingListUtils.getCompletionStats(items);
      if (shoppingList && shoppingList.isCompleted !== stats.allItemsCompleted) {
        await listActions.updateShoppingList({
          id: shoppingList.id,
          isCompleted: stats.allItemsCompleted
        });
        setShoppingList(prev => prev ? { ...prev, isCompleted: stats.allItemsCompleted } : null);
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      Alert.alert('Erreur', 'Impossible de modifier cet article');
    }
  }, [items, shoppingList, itemActions, listActions]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;

    setRefreshing(true);
    try {
      await itemActions.loadItems(id);

      // Refresh shopping list data
      await listActions.loadShoppingLists();
      const updatedList = listActions.getShoppingListById(id);
      if (updatedList) {
        setShoppingList(updatedList);
      }
    } finally {
      setRefreshing(false);
    }
  }, [id, itemActions, listActions]);

  const handleShare = useCallback(() => {
    if (shoppingList) {
      setShareModalVisible(true);
    }
  }, [shoppingList]);

  const handleClearCompleted = useCallback(() => {
    if (!shoppingList || !hasCompletedItems) return;

    Alert.alert(
      'Supprimer les articles terminés',
      `Supprimer les ${completedItemsCount} articles cochés de cette liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await itemActions.clearCompletedItems(shoppingList.id);
              Alert.alert('✅', 'Articles terminés supprimés');
            } catch (error) {
              console.error('Error clearing completed items:', error);
              Alert.alert('Erreur', 'Impossible de supprimer les articles');
            }
          }
        }
      ]
    );
  }, [shoppingList, hasCompletedItems, completedItemsCount, itemActions]);

  const handleUncheckAll = useCallback(() => {
    if (!shoppingList || !hasCompletedItems) return;

    Alert.alert(
      'Décocher tous les articles',
      `Décocher les ${completedItemsCount} articles terminés de cette liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Décocher',
          onPress: async () => {
            try {
              await itemActions.uncheckAllItems(shoppingList.id);
              Alert.alert('✅', 'Articles décochés');
            } catch (error) {
              console.error('Error unchecking all items:', error);
              Alert.alert('Erreur', 'Impossible de décocher les articles');
            }
          }
        }
      ]
    );
  }, [shoppingList, hasCompletedItems, completedItemsCount, itemActions]);

  const handleAddIngredient = useCallback(async (ingredient: Ingredient, quantity: number, unit: string) => {
    if (!shoppingList) return;

    try {
      const itemRepository = new ShoppingListItemRepository();

      await itemRepository.create(shoppingList.id, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: quantity,
        unit: unit,
        category: ingredient.category
      });

      // Refresh the items list
      await itemActions.loadItems(shoppingList.id);

      Alert.alert('✅', `"${ingredient.name}" ajouté à la liste !`);
      setIngredientSelectorVisible(false);
    } catch (error) {
      console.error('Error adding ingredient to shopping list:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'ingrédient à la liste');
    }
  }, [shoppingList, itemActions]);

  const handleUpdateItemQuantity = useCallback(async (item: ShoppingListItem, quantity: number, unit: string) => {
    if (!shoppingList) return;

    try {
      await itemActions.updateItem({
        id: item.id,
        quantity: quantity,
        unit: unit
      });
    } catch (error) {
      console.error('Error updating item quantity:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la quantité');
    }
  }, [shoppingList, itemActions]);

  const renderHeader = useCallback(() => {
    if (!shoppingList) return null;

    const stats = ShoppingListUtils.getCompletionStats(items);
    const timeEstimate = ShoppingListUtils.estimateShoppingTime(items);

    return (
      <View style={styles.header}>
        <Text style={styles.title}>{shoppingList.name}</Text>

        {shoppingList.description && (
          <Text style={styles.description}>{shoppingList.description}</Text>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${stats.completionPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stats.completedItems}/{stats.totalItems} articles • {stats.completionPercentage}%
            </Text>
          </View>

          <Text style={styles.timeEstimate}>
            ⏱️ {timeEstimate.estimatedTimeText}
          </Text>
        </View>

        <View style={styles.badges}>
          {shoppingList.createdFromRecipes && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🍽️ Recettes</Text>
            </View>
          )}

          {stats.allItemsCompleted && (
            <View style={[styles.badge, styles.completedBadge]}>
              <Text style={styles.completedBadgeText}>✅ Terminé</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Text style={styles.actionButtonText}>📤 Partager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.addIngredientButton]}
            onPress={() => setIngredientSelectorVisible(true)}
          >
            <Text style={styles.addIngredientButtonText}>➕ Ajouter</Text>
          </TouchableOpacity>

          {hasCompletedItems && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.uncheckButton]}
                onPress={handleUncheckAll}
              >
                <Text style={styles.uncheckButtonText}>↩️ Décocher</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={handleClearCompleted}
              >
                <Text style={styles.clearButtonText}>🗑️ Nettoyer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }, [shoppingList, items, handleShare, handleClearCompleted, handleUncheckAll, hasCompletedItems]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📋</Text>
      <Text style={styles.emptyStateTitle}>Liste vide</Text>
      <Text style={styles.emptyStateDescription}>
        Cette liste de courses ne contient aucun article.
      </Text>
    </View>
  ), []);

  const renderError = useCallback(() => (
    <View style={styles.errorState}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Erreur de chargement</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRefresh}
      >
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  ), [error, handleRefresh]);

  if (loadingList) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement de la liste...</Text>
      </View>
    );
  }

  if (!shoppingList) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Liste introuvable</Text>
        <Text style={styles.errorDescription}>
          Cette liste de courses n'existe plus ou a été supprimée.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Modern Gradient Header with Back Button and Recipe Info */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >


        {/* Recipe Info Card */}
        {shoppingList && (
          <View style={styles.recipeInfoCard}>
            <Text style={styles.recipeTitle}>{shoppingList.name}</Text>
            {shoppingList.description && (
              <Text style={styles.recipeSubtitle}>{shoppingList.description}</Text>
            )}

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <ShoppingListProgressBar
                completed={completedItemsCount}
                total={totalItemsCount}
                showLabel={true}
                showPercentage={true}
                size="medium"
              />
            </View>

            {/* Meta Information */}
            <View style={styles.recipeMetaSection}>
              {/* Empty - removed time estimate and recipe button */}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.shareBtn]}
                onPress={handleShare}
              >
                <Text style={styles.actionIcon}>📤</Text>
                <Text style={styles.actionText}>Partager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.addBtn]}
                onPress={() => setIngredientSelectorVisible(true)}
              >
                <Text style={styles.actionIcon}>➕</Text>
                <Text style={styles.actionText}>Ajouter</Text>
              </TouchableOpacity>

              {hasCompletedItems && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.uncheckBtn]}
                  onPress={handleUncheckAll}
                >
                  <Text style={styles.actionIcon}>↻</Text>
                  <Text style={styles.actionText}>Décocher</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {error ? (
          renderError()
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#667eea']}
                tintColor="#667eea"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {loading && items.length === 0 ? (
              <View style={styles.loadingItems}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.loadingItemsText}>Chargement des articles...</Text>
              </View>
            ) : sortedCategories.length === 0 ? (
              renderEmptyState()
            ) : (
              <View style={styles.categoriesContainer}>
                {sortedCategories.map(category => (
                  <CategorySection
                    key={category}
                    category={category}
                    items={groupedItems[category]}
                    onToggleItemComplete={handleItemToggle}
                    onUpdateItemQuantity={handleUpdateItemQuantity}
                    searchQuery={searchQuery}
                    initialExpanded={true}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <ShareShoppingListModal
        visible={shareModalVisible}
        shoppingList={shoppingList}
        onClose={() => setShareModalVisible(false)}
      />

      <IngredientSelectorModal
        visible={ingredientSelectorVisible}
        onClose={() => setIngredientSelectorVisible(false)}
        onAddIngredient={handleAddIngredient}
        excludeIngredientIds={items.map(item => item.ingredientId).filter(Boolean) as string[]}
      />
    </View>
  );
};

export const ShoppingListDetailScreen: React.FC = () => (
  <ScreenErrorBoundary>
    <ShoppingListDetailScreenComponent />
  </ScreenErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  // Header Styles
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },

  backButton: {
    marginRight: 15,
    padding: 5,
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },

  recipeInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },

  recipeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },

  recipeSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 15,
    fontStyle: 'italic',
  },

  progressSection: {
    marginBottom: 5,
  },

  recipeMetaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  metaIcon: {
    fontSize: 10,
  },

  metaText: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '500',
  },

  recipeLink: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  shareBtn: {
    backgroundColor: '#e8f0fe',
  },

  addBtn: {
    backgroundColor: '#e8f5e9',
  },

  uncheckBtn: {
    backgroundColor: '#fff3e0',
  },

  actionIcon: {
    fontSize: 14,
  },

  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Search Section
  searchSection: {
    padding: 20,
    backgroundColor: '#f5f7fa',
    position: 'relative',
  },

  searchIcon: {
    position: 'absolute',
    left: 35,
    top: '50%',
    marginTop: -10,
    fontSize: 16,
    color: '#95a5a6',
    zIndex: 1,
  },

  searchInput: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 15,
    fontSize: 16,
    color: '#2c3e50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  scrollView: {
    flex: 1,
  },

  categoriesContainer: {
    paddingHorizontal: 0,
    paddingBottom: 30,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#95a5a6',
    fontWeight: '500',
  },

  loadingItems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },

  loadingItemsText: {
    fontSize: 14,
    color: '#95a5a6',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },

  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.3,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },

  emptyStateDescription: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 24,
  },

  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 8,
    textAlign: 'center',
  },

  errorDescription: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 24,
  },

  retryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
