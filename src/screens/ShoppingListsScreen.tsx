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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ShoppingList } from '../types';
import { useShoppingLists } from '../hooks/useShoppingLists';
import { ShoppingListCard } from '../components/shoppingList/ShoppingListCard';
import { ShareShoppingListModal } from '../components/shoppingList/ShareShoppingListModal';
import { SearchBar } from '../components/common/SearchBar';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';

const ShoppingListsScreenComponent: React.FC = () => {
  const router = useRouter();
  const { shoppingLists, loading, error, actions } = useShoppingLists();
  const [searchQuery, setSearchQuery] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load shopping lists on mount and when screen comes into focus
  useEffect(() => {
    actions.loadShoppingLists();
  }, []);

  // Refresh shopping lists when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      actions.refreshShoppingLists();
    }, [actions])
  );

  // Filter shopping lists based on search query
  const filteredLists = shoppingLists.filter(list => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      list.name.toLowerCase().includes(query) ||
      (list.description && list.description.toLowerCase().includes(query)) ||
      list.items.some(item => 
        item.ingredientName.toLowerCase().includes(query)
      )
    );
  });

  const handleListPress = useCallback((list: ShoppingList) => {
    router.push(`/shopping-list/${list.id}`);
  }, [router]);

  const handleListLongPress = useCallback((list: ShoppingList) => {
    Alert.alert(
      list.name,
      'Que souhaitez-vous faire avec cette liste ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Partager', 
          onPress: () => {
            setSelectedList(list);
            setShareModalVisible(true);
          }
        },
        { 
          text: 'Dupliquer', 
          onPress: () => handleDuplicate(list) 
        },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => handleDelete(list)
        },
      ]
    );
  }, []);

  const handleDuplicate = useCallback(async (list: ShoppingList) => {
    try {
      await actions.duplicateShoppingList(list.id, `${list.name} (copie)`);
      Alert.alert('✅', 'Liste dupliquée avec succès !');
    } catch (error) {
      console.error('Error duplicating list:', error);
      Alert.alert('Erreur', 'Impossible de dupliquer la liste.');
    }
  }, [actions]);

  const handleDelete = useCallback((list: ShoppingList) => {
    Alert.alert(
      'Supprimer la liste',
      `Êtes-vous sûr de vouloir supprimer "${list.name}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deleteShoppingList(list.id);
              Alert.alert('✅', 'Liste supprimée avec succès.');
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la liste.');
            }
          }
        }
      ]
    );
  }, [actions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await actions.refreshShoppingLists();
    } finally {
      setRefreshing(false);
    }
  }, [actions]);

  const handleCreateNew = useCallback(() => {
    router.push('/create-shopping-list');
  }, [router]);

  const handleGenerateFromRecipes = useCallback(() => {
    router.push('/create-shopping-list?fromRecipes=true');
  }, [router]);

  const renderShoppingList = useCallback(({ item }: { item: ShoppingList }) => (
    <ShoppingListCard
      shoppingList={item}
      onPress={() => handleListPress(item)}
      onLongPress={() => handleListLongPress(item)}
      onDelete={() => handleDelete(item)}
    />
  ), [handleListPress, handleListLongPress, handleDelete]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📋</Text>
      <Text style={styles.emptyStateTitle}>Aucune liste de courses</Text>
      <Text style={styles.emptyStateDescription}>
        Créez votre première liste ou générez-en une à partir de vos recettes.
      </Text>
      
      <View style={styles.emptyStateActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCreateNew}
        >
          <Text style={styles.primaryButtonText}>Créer une liste</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGenerateFromRecipes}
        >
          <Text style={styles.secondaryButtonText}>📚 Depuis mes recettes</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [handleCreateNew, handleGenerateFromRecipes]);

  const renderError = useCallback(() => (
    <View style={styles.errorState}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Erreur de chargement</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => actions.loadShoppingLists()}
      >
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  ), [error, actions]);

  if (loading && shoppingLists.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des listes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Rechercher dans les listes..."
        style={styles.searchBar}
      />

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={filteredLists}
          renderItem={renderShoppingList}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
            />
          }
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={
            filteredLists.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <FloatingAddButton
        onPress={handleCreateNew}
        style={styles.fab}
      />

      <ShareShoppingListModal
        visible={shareModalVisible}
        shoppingList={selectedList}
        onClose={() => {
          setShareModalVisible(false);
          setSelectedList(null);
        }}
      />
    </View>
  );
};

export const ShoppingListsScreen: React.FC = () => (
  <ScreenErrorBoundary>
    <ShoppingListsScreenComponent />
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
  listContainer: {
    paddingBottom: 100, // Space for FAB
  },
  emptyContainer: {
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
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
    marginBottom: 32,
  },
  emptyStateActions: {
    width: '100%',
    maxWidth: 280,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
  },
});