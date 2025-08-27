import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { SearchBar } from '../components/common/SearchBar';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { ShoppingListCard } from '../components/shoppingList/ShoppingListCard';
import { CreateShoppingListModal } from '../components/shoppingList/CreateShoppingListModal';
import { useShoppingLists } from '../hooks/useShoppingLists';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { ShoppingListFilters } from '../types';

const ShoppingListScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    shoppingLists,
    loading,
    error,
    actions: {
      loadShoppingLists,
      deleteShoppingList,
      duplicateShoppingList,
      clearError
    }
  } = useShoppingLists();

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const filters: ShoppingListFilters = query ? { searchQuery: query } : {};
    loadShoppingLists(filters);
  }, [loadShoppingLists]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadShoppingLists();
    } finally {
      setRefreshing(false);
    }
  }, [loadShoppingLists]);

  const handleDeleteShoppingList = useCallback(async (id: string, name: string) => {
    Alert.alert(
      'Supprimer la liste',
      `Êtes-vous sûr de vouloir supprimer la liste "${name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShoppingList(id);
            } catch (error) {
              Alert.alert(
                'Erreur',
                'Impossible de supprimer la liste. Veuillez réessayer.'
              );
            }
          }
        }
      ]
    );
  }, [deleteShoppingList]);

  const handleDuplicateShoppingList = useCallback(async (id: string, name: string) => {
    try {
      await duplicateShoppingList(id, `${name} (Copie)`);
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Impossible de dupliquer la liste. Veuillez réessayer.'
      );
    }
  }, [duplicateShoppingList]);

  const handleOpenShoppingList = useCallback((id: string) => {
    router.push({
      pathname: '/shopping-list/[id]',
      params: { id }
    });
  }, []);

  const handleCreateShoppingList = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    // The list will automatically appear due to the hook's state update
  }, []);

  // Filter shopping lists based on search query
  const filteredShoppingLists = shoppingLists.filter(list => {
    if (!searchQuery) return true;
    return list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (list.description && list.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="basket-outline" size={80} color={colors.textLight} />
      <Text style={styles.emptyTitle}>Aucune liste de courses</Text>
      <Text style={styles.emptySubtitle}>
        Créez votre première liste de courses pour organiser vos achats
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateShoppingList}
      >
        <Ionicons name="add" size={24} color={colors.textWhite} />
        <Text style={styles.createButtonText}>Créer une liste</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
      <Text style={styles.errorTitle}>Erreur</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          clearError();
          loadShoppingLists();
        }}
      >
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Ionicons name="basket" size={28} color={colors.primary} />
        <Text style={styles.screenTitle}>Listes de courses</Text>
      </View>
      
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Rechercher une liste..."
        style={styles.searchBar}
      />

      {filteredShoppingLists.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredShoppingLists.length} liste{filteredShoppingLists.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    if (error) {
      return renderErrorState();
    }

    if (!loading && filteredShoppingLists.length === 0) {
      return renderEmptyState();
    }

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
        {filteredShoppingLists.map((shoppingList) => (
          <ShoppingListCard
            key={shoppingList.id}
            shoppingList={shoppingList}
            onPress={() => handleOpenShoppingList(shoppingList.id)}
            onDelete={() => handleDeleteShoppingList(shoppingList.id, shoppingList.name)}
            onDuplicate={() => handleDuplicateShoppingList(shoppingList.id, shoppingList.name)}
          />
        ))}
        
        {/* Add padding at the bottom to account for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <ScreenErrorBoundary>
      <View style={styles.container}>
        {renderHeader()}
        {renderContent()}
        
        <FloatingAddButton onPress={handleCreateShoppingList} />

        <CreateShoppingListModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  screenTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginLeft: 10
  },
  searchBar: {
    marginBottom: 15
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statsText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20
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
    marginBottom: 10,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  createButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textWhite,
    marginLeft: 8
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
  }
});

export default ShoppingListScreen;