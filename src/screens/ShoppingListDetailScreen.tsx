import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { ShoppingListItemCard } from '../components/shoppingList/ShoppingListItemCard';
import { useShoppingListItems } from '../hooks/useShoppingListItems';
import { useShoppingLists } from '../hooks/useShoppingLists';
import { ShoppingListExporter } from '../utils/shoppingListExporter';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { ShoppingList, IngredientCategory } from '../types';

const ShoppingListDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  const { shoppingLists } = useShoppingLists();
  const {
    items,
    loading,
    error,
    completedItemsCount,
    totalItemsCount,
    hasCompletedItems,
    allItemsCompleted,
    itemsByCategory,
    actions: {
      loadItems,
      toggleItemCompletion,
      deleteItem,
      clearCompletedItems,
      clearError
    }
  } = useShoppingListItems();

  // Load shopping list details
  useEffect(() => {
    if (id && shoppingLists.length > 0) {
      const list = shoppingLists.find(sl => sl.id === id);
      if (list) {
        setShoppingList(list);
        loadItems(id);
      }
    }
  }, [id, shoppingLists]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    
    setRefreshing(true);
    try {
      await loadItems(id);
    } finally {
      setRefreshing(false);
    }
  }, [id, loadItems]);

  const handleToggleItemCompletion = useCallback(async (itemId: string) => {
    try {
      await toggleItemCompletion(itemId);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier l\'état de l\'article');
    }
  }, [toggleItemCompletion]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      await deleteItem(itemId);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer l\'article');
    }
  }, [deleteItem]);

  const handleClearCompleted = useCallback(async () => {
    if (!id || !hasCompletedItems) return;

    Alert.alert(
      'Effacer les articles cochés',
      `Voulez-vous supprimer les ${completedItemsCount} article${completedItemsCount > 1 ? 's' : ''} coché${completedItemsCount > 1 ? 's' : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCompletedItems(id);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'effacer les articles cochés');
            }
          }
        }
      ]
    );
  }, [id, hasCompletedItems, completedItemsCount, clearCompletedItems]);

  const handleShareList = useCallback(async () => {
    if (!shoppingList || !id) return;

    try {
      // Ensure the shopping list has items
      const listWithItems: ShoppingList = {
        ...shoppingList,
        items
      };

      await ShoppingListExporter.shareShoppingList(listWithItems, {
        includeCompletedItems: true,
        includeNotes: true,
        groupByCategory: true,
        format: 'checklist'
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager la liste');
    }
  }, [shoppingList, items, id]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {shoppingList?.name || 'Liste de courses'}
        </Text>
        <TouchableOpacity onPress={handleShareList} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {shoppingList?.description && (
        <Text style={styles.description}>{shoppingList.description}</Text>
      )}

      <View style={styles.stats}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {completedItemsCount}/{totalItemsCount} articles cochés
          </Text>
          {totalItemsCount > 0 && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill,
                  { width: `${(completedItemsCount / totalItemsCount) * 100}%` },
                  allItemsCompleted && styles.progressBarComplete
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {hasCompletedItems && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearCompleted}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={styles.clearButtonText}>Effacer cochés</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <Ionicons 
              name={showCompleted ? "eye" : "eye-off"} 
              size={20} 
              color={colors.textSecondary} 
            />
            <Text style={styles.filterButtonText}>
              {showCompleted ? 'Tout' : 'Actifs'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCategorySection = (category: IngredientCategory, categoryItems: typeof items) => {
    const visibleItems = showCompleted 
      ? categoryItems 
      : categoryItems.filter(item => !item.isCompleted);

    if (visibleItems.length === 0) return null;

    const getCategoryLabel = (cat: IngredientCategory) => {
      const labels: Record<IngredientCategory, string> = {
        fruits: 'Fruits',
        legumes: 'Légumes',
        viande: 'Viande & Charcuterie',
        peche: 'Poissons & Fruits de mer',
        produits_laitiers: 'Produits Laitiers',
        epicerie: 'Épicerie',
        autres: 'Autres'
      };
      return labels[cat] || cat;
    };

    const getCategoryIcon = (cat: IngredientCategory) => {
      const icons: Record<IngredientCategory, string> = {
        fruits: '🍎',
        legumes: '🥕',
        viande: '🥩',
        peche: '🐟',
        produits_laitiers: '🥛',
        epicerie: '🏪',
        autres: '📦'
      };
      return icons[cat] || '📦';
    };

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryIcon}>{getCategoryIcon(category)}</Text>
          <Text style={styles.categoryTitle}>{getCategoryLabel(category)}</Text>
          <Text style={styles.categoryCount}>({visibleItems.length})</Text>
        </View>
        
        {visibleItems.map(item => (
          <ShoppingListItemCard
            key={item.id}
            item={item}
            onToggleCompletion={handleToggleItemCompletion}
            onDelete={handleDeleteItem}
          />
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de la liste...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              if (id) loadItems(id);
            }}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (totalItemsCount === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={80} color={colors.textLight} />
          <Text style={styles.emptyTitle}>Liste vide</Text>
          <Text style={styles.emptySubtitle}>
            Cette liste ne contient aucun article pour le moment
          </Text>
        </View>
      );
    }

    // Define category order
    const categoryOrder: IngredientCategory[] = [
      'fruits',
      'legumes',
      'viande',
      'peche',
      'produits_laitiers',
      'epicerie',
      'autres'
    ];

    return (
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {categoryOrder.map(category => {
          const categoryItems = itemsByCategory[category];
          if (categoryItems && categoryItems.length > 0) {
            return renderCategorySection(category, categoryItems);
          }
          return null;
        })}
        
        {/* Add padding at bottom */}
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  };

  if (!shoppingList && !loading) {
    return (
      <ScreenErrorBoundary>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Liste non trouvée</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
      <View style={styles.container}>
        {renderHeader()}
        {renderContent()}
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    backgroundColor: colors.backgroundLight,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  backButton: {
    padding: 4,
    marginRight: 12
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary
  },
  shareButton: {
    padding: 4,
    marginLeft: 12
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20
  },
  stats: {
    marginTop: 8
  },
  progressContainer: {
    marginBottom: 12
  },
  progressText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 8
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3
  },
  progressBarComplete: {
    backgroundColor: colors.success
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.errorLight
  },
  clearButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.error,
    marginLeft: 6
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  filterButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginLeft: 6
  },
  listContainer: {
    flex: 1,
    padding: 20
  },
  categorySection: {
    marginBottom: 24
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8
  },
  categoryTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1
  },
  categoryCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: 12
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.error,
    marginTop: 20,
    marginBottom: 10
  },
  errorMessage: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textWhite
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22
  }
});

export default ShoppingListDetailScreen;