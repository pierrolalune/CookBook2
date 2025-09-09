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
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShoppingList, ShoppingListItem } from '../types';
import { useShoppingLists } from '../hooks/useShoppingLists';
import { useShoppingListItems } from '../hooks/useShoppingListItems';
import { CategorySection } from '../components/shoppingList/CategorySection';
import { ShareShoppingListModal } from '../components/shoppingList/ShareShoppingListModal';
import { SearchBar } from '../components/common/SearchBar';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { ShoppingListUtils } from '../utils/shoppingListUtils';

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
        await itemActions.loadItems(id);
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
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Rechercher un article..."
        style={styles.searchBar}
      />

      {error ? (
        renderError()
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          
          {loading && items.length === 0 ? (
            <View style={styles.loadingItems}>
              <ActivityIndicator size="small" color="#3B82F6" />
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
                  initialExpanded={true}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <ShareShoppingListModal
        visible={shareModalVisible}
        shoppingList={shoppingList}
        onClose={() => setShareModalVisible(false)}
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
    backgroundColor: '#F3F4F6',
  },
  searchBar: {
    margin: 16,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeEstimate: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
  },
  completedBadgeText: {
    color: '#059669',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#EF4444',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uncheckButton: {
    backgroundColor: '#F59E0B',
  },
  uncheckButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingItems: {
    alignItems: 'center',
    padding: 32,
  },
  loadingItemsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
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
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});