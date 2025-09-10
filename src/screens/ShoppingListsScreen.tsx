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
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { ShoppingList } from '../types';
import { useShoppingLists } from '../hooks/useShoppingLists';
import { ModernShoppingListCard } from '../components/shoppingList/ModernShoppingListCard';
import { ShareShoppingListModal } from '../components/shoppingList/ShareShoppingListModal';
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
    <ModernShoppingListCard
      shoppingList={item}
      onPress={() => handleListPress(item)}
      onDelete={() => handleDelete(item)}
    />
  ), [handleListPress, handleDelete]);

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
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Créer une liste</Text>
          </LinearGradient>
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
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </LinearGradient>
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
      {/* Modern Gradient Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mes Listes de Courses</Text>
          
          {/* Integrated Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher dans les listes..."
              placeholderTextColor="rgba(118, 75, 162, 0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
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
                colors={['#667eea']}
                tintColor="#667eea"
              />
            }
            ListEmptyComponent={!loading ? renderEmptyState : null}
            contentContainerStyle={
              filteredLists.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

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
    backgroundColor: '#f5f7fa',
  },

  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerContent: {
    marginTop: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
  },

  searchContainer: {
    position: 'relative',
    marginBottom: 0,
  },

  searchIcon: {
    position: 'absolute',
    left: 18,
    top: '50%',
    marginTop: -10,
    fontSize: 16,
    color: '#764ba2',
    zIndex: 1,
  },

  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 15,
    fontSize: 16,
    color: '#2c3e50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },

  content: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },

  emptyContainer: {
    flex: 1,
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

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    marginBottom: 40,
  },

  emptyStateActions: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },

  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 15,
    alignItems: 'center',
    overflow: 'hidden',
  },

  primaryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8ecf1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  secondaryButtonText: {
    color: '#2c3e50',
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    overflow: 'hidden',
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
  },
});