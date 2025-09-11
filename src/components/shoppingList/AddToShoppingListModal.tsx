import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Recipe, Ingredient, CreateShoppingListInput, ShoppingList } from '../../types';
import { useShoppingLists } from '../../hooks/useShoppingLists';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ShoppingListItemRepository } from '../../repositories/ShoppingListItemRepository';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface AddToShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  recipe?: Recipe;
  ingredient?: Ingredient;
  mode: 'recipe' | 'ingredient';
}

const AddToShoppingListModalComponent: React.FC<AddToShoppingListModalProps> = ({
  visible,
  onClose,
  recipe,
  ingredient,
  mode
}) => {
  const { shoppingLists, loading, error, actions } = useShoppingLists();
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  
  // State for ingredient quantity and unit selection
  const [ingredientQuantity, setIngredientQuantity] = useState('1');
  const [ingredientUnit, setIngredientUnit] = useState('');
  
  // State for recipe serving multiplier
  const [servingMultiplier, setServingMultiplier] = useState('1');

  // Animation values
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Load shopping lists and handle animations when modal opens
  useEffect(() => {
    if (visible) {
      console.log('🛒 AddToShoppingListModal opened, loading shopping lists...');
      console.log('🛒 Current state:', { loading, error, listsCount: shoppingLists.length });
      
      actions.loadShoppingLists();
      
      // Generate default name for new list
      if (recipe) {
        setNewListName(`Liste pour "${recipe.name}"`);
        setServingMultiplier(recipe.servings ? recipe.servings.toString() : '1');
        console.log('🛒 Recipe mode:', recipe.name);
      } else if (ingredient) {
        setNewListName(`Liste avec ${ingredient.name}`);
        setIngredientQuantity('1');
        setIngredientUnit(ingredient.units[0] || 'pièce');
        console.log('🛒 Ingredient mode:', ingredient.name);
      }

      // Animate modal entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations and state when modal closes
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
      setSelectedList(null);
      setShowCreateNew(false);
      setIngredientQuantity('1');
      setIngredientUnit('');
      setServingMultiplier('1');
    }
  }, [visible, recipe, ingredient]);

  // Debug effect to track state changes
  useEffect(() => {
    console.log('🛒 State changed:', { loading, error, listsCount: shoppingLists.length });
    if (!loading && !error && shoppingLists.length > 0) {
      console.log('🛒 Data loaded successfully! Lists:', shoppingLists.map(l => l.name));
    }
  }, [loading, error, shoppingLists.length]);

  const handleAddToExistingList = useCallback(async (list?: ShoppingList) => {
    const targetList = list || selectedList;
    if (!targetList) {
      Alert.alert('Erreur', 'Veuillez sélectionner une liste');
      return;
    }
    try {
      setCreating(true);
      const itemRepository = new ShoppingListItemRepository();

      if (mode === 'recipe' && recipe) {
        // Add all recipe ingredients to the list with serving multiplier
        const targetServings = parseFloat(servingMultiplier) || 1;
        const originalServings = recipe.servings || 1;
        const multiplier = targetServings / originalServings;
        
        for (const recipeIngredient of recipe.ingredients) {
          if (recipeIngredient.optional) continue; // Skip optional ingredients
          
          const adjustedQuantity = recipeIngredient.quantity ? recipeIngredient.quantity * multiplier : undefined;
          
          await itemRepository.create(targetList.id, {
            ingredientId: recipeIngredient.ingredient.id,
            ingredientName: recipeIngredient.ingredient.name,
            quantity: adjustedQuantity,
            unit: recipeIngredient.unit,
            category: recipeIngredient.ingredient.category
          });
        }
        const servingText = targetServings !== originalServings ? ` (pour ${targetServings} portion${targetServings > 1 ? 's' : ''})` : '';
        Alert.alert('✅', `Ingrédients de "${recipe.name}"${servingText} ajoutés à la liste !`);
      } else if (mode === 'ingredient' && ingredient) {
        // Add single ingredient to the list with selected quantity and unit
        const quantity = parseFloat(ingredientQuantity) || 1;
        await itemRepository.create(targetList.id, {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          category: ingredient.category,
          quantity: quantity,
          unit: ingredientUnit
        });
        Alert.alert('✅', `"${ingredient.name}" (${quantity} ${ingredientUnit}) ajouté à la liste !`);
      }

      onClose();
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter les articles à la liste');
    } finally {
      setCreating(false);
    }
  }, [recipe, ingredient, mode, onClose, ingredientQuantity, ingredientUnit, servingMultiplier]);

  const handleCreateNewList = useCallback(async () => {
    if (!newListName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la nouvelle liste');
      return;
    }

    try {
      setCreating(true);

      if (mode === 'recipe' && recipe) {
        // Generate from recipe with serving multiplier
        const targetServings = parseFloat(servingMultiplier) || 1;
        const originalServings = recipe.servings || 1;
        const multiplier = targetServings / originalServings;
        
        // We need to create the list manually with multiplied quantities
        // since generateFromRecipes doesn't support multipliers
        const recipeIngredients = recipe.ingredients
          .filter(ri => !ri.optional)
          .map(ri => ({
            ingredientId: ri.ingredient.id,
            ingredientName: ri.ingredient.name,
            quantity: ri.quantity ? ri.quantity * multiplier : undefined,
            unit: ri.unit,
            category: ri.ingredient.category
          }));
        
        const input: CreateShoppingListInput = {
          name: newListName.trim(),
          description: targetServings !== originalServings ? `Généré depuis "${recipe.name}" pour ${targetServings} portion${targetServings > 1 ? 's' : ''}` : `Généré depuis "${recipe.name}"`,
          createdFromRecipes: true,
          items: recipeIngredients
        };
        
        await actions.createShoppingList(input);
        const servingText = targetServings !== originalServings ? ` (pour ${targetServings} portion${targetServings > 1 ? 's' : ''})` : '';
        Alert.alert('✅', `Nouvelle liste créée avec les ingrédients de "${recipe.name}"${servingText} !`);
      } else if (mode === 'ingredient' && ingredient) {
        // Create list with single ingredient using selected quantity and unit
        const quantity = parseFloat(ingredientQuantity) || 1;
        const input: CreateShoppingListInput = {
          name: newListName.trim(),
          createdFromRecipes: false,
          items: [{
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            category: ingredient.category,
            quantity: quantity,
            unit: ingredientUnit
          }]
        };
        await actions.createShoppingList(input);
        Alert.alert('✅', `Nouvelle liste créée avec "${ingredient.name}" (${quantity} ${ingredientUnit}) !`);
      }

      onClose();
    } catch (error) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Erreur', 'Impossible de créer la nouvelle liste');
    } finally {
      setCreating(false);
    }
  }, [newListName, recipe, ingredient, mode, actions, onClose, ingredientQuantity, ingredientUnit, servingMultiplier]);

  // Helper function to get ingredient icon
  const getIngredientIcon = () => {
    if (recipe) return '🍽️';
    if (!ingredient) return '📦';
    
    const categoryIcons: { [key: string]: string } = {
      'fruits': '🍎',
      'legumes': '🥕',
      'peche': '🐟',
      'viande': '🥩',
      'produits_laitiers': '🥛',
      'epicerie': '🛒',
    };
    return categoryIcons[ingredient.category] || '📦';
  };

  // Helper function to format ingredient category
  const getIngredientCategory = () => {
    if (recipe) return 'Recette';
    if (!ingredient) return '';
    return ingredient.subcategory || ingredient.category;
  };

  const renderExistingLists = () => {
    console.log('🛒 renderExistingLists called:', { loading, error, listsCount: shoppingLists.length });
    
    if (loading) {
      console.log('🛒 Showing loading state');
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#667eea" />
          <Text style={styles.loadingText}>Chargement des listes...</Text>
        </View>
      );
    }

    if (error) {
      console.log('🛒 Showing error state:', error);
      return (
        <View style={styles.errorState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.errorText}>Erreur de chargement</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              console.log('🛒 Retry button pressed');
              actions.loadShoppingLists();
            }}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (shoppingLists.length === 0) {
      console.log('🛒 Showing empty state');
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Aucune liste existante</Text>
          <Text style={styles.emptySubtext}>Créez votre première liste de courses</Text>
        </View>
      );
    }

    console.log('🛒 Rendering shopping lists:', shoppingLists.map(l => ({ id: l.id, name: l.name })));
    
    return (
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {shoppingLists.map(list => {
          const stats = ShoppingListUtils.getCompletionStats(list.items);
          const isSelected = selectedList?.id === list.id;
          
          return (
            <TouchableOpacity
              key={list.id}
              style={[
                styles.listItem,
                isSelected && styles.selectedListItem
              ]}
              onPress={() => setSelectedList(list)}
              disabled={creating}
              activeOpacity={0.7}
            >
              <View style={styles.listItemContent}>
                <Text style={styles.listName} numberOfLines={1}>
                  {list.name}
                </Text>
                <View style={styles.listInfo}>
                  <Text style={styles.listStats}>
                    {stats.completedItems}/{stats.totalItems} articles
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { width: `${stats.completionPercentage}%` }
                        ]} 
                      />
                    </View>
                  </View>
                  <Text style={styles.listPercentage}>{stats.completionPercentage}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };


  if (!recipe && !ingredient) return null;

  const itemName = mode === 'recipe' ? recipe?.name : ingredient?.name;

  console.log('🛒 Modal render:', { 
    visible, 
    itemName, 
    mode, 
    loading, 
    error, 
    listsCount: shoppingLists.length,
    showCreateNew 
  });

  // Force a re-render check
  console.log('🛒 About to render lists section. showCreateNew:', showCreateNew);
  console.log('🛒 Will call renderExistingLists with state:', { loading, error, listsCount: shoppingLists.length });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.modal,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Modern Gradient Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Ajouter à une liste</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={creating}
            >
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <View style={styles.productIcon}>
              <Text style={styles.productIconText}>{getIngredientIcon()}</Text>
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={1}>
                {itemName}
              </Text>
              <Text style={styles.productCategory}>{getIngredientCategory()}</Text>
            </View>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Configuration Section */}
            {mode === 'ingredient' && ingredient && (
              <View style={styles.configSection}>
                <Text style={styles.sectionTitle}>Configuration</Text>
                <View style={styles.configRow}>
                  <View style={styles.configGroup}>
                    <Text style={styles.configLabel}>Quantité</Text>
                    <TextInput
                      style={styles.quantityInput}
                      value={ingredientQuantity}
                      onChangeText={setIngredientQuantity}
                      keyboardType="numeric"
                      placeholder="1"
                      editable={!creating}
                    />
                  </View>
                  <View style={styles.configGroup}>
                    <Text style={styles.configLabel}>Unité</Text>
                    <View style={styles.unitSelector}>
                      {ingredient.units.slice(0, 3).map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitBtn,
                            ingredientUnit === unit && styles.unitBtnActive
                          ]}
                          onPress={() => setIngredientUnit(unit)}
                          disabled={creating}
                        >
                          <Text style={[
                            styles.unitBtnText,
                            ingredientUnit === unit && styles.unitBtnActiveText
                          ]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Recipe Configuration */}
            {mode === 'recipe' && recipe && (
              <View style={styles.configSection}>
                <Text style={styles.sectionTitle}>Configuration</Text>
                <View style={styles.servingConfig}>
                  <Text style={styles.configLabel}>Portions: {recipe.servings || 1} → {servingMultiplier}</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={servingMultiplier}
                    onChangeText={setServingMultiplier}
                    keyboardType="numeric"
                    placeholder="1"
                    editable={!creating}
                  />
                </View>
              </View>
            )}
            
            {!showCreateNew && (
              <View style={styles.listsSection}>
                <Text style={styles.sectionTitle}>Listes existantes</Text>
                {(() => {
                  console.log('🛒 INLINE renderExistingLists called:', { loading, error, listsCount: shoppingLists.length });
                  
                  if (loading) {
                    console.log('🛒 INLINE Showing loading state');
                    return (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#667eea" />
                        <Text style={styles.loadingText}>Chargement des listes...</Text>
                      </View>
                    );
                  }

                  if (error) {
                    console.log('🛒 INLINE Showing error state:', error);
                    return (
                      <View style={styles.errorState}>
                        <Text style={styles.emptyIcon}>⚠️</Text>
                        <Text style={styles.errorText}>Erreur de chargement</Text>
                        <Text style={styles.errorMessage}>{error}</Text>
                        <TouchableOpacity 
                          style={styles.retryButton}
                          onPress={() => {
                            console.log('🛒 INLINE Retry button pressed');
                            actions.loadShoppingLists();
                          }}
                        >
                          <Text style={styles.retryButtonText}>Réessayer</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  if (shoppingLists.length === 0) {
                    console.log('🛒 INLINE Showing empty state');
                    return (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>Aucune liste existante</Text>
                        <Text style={styles.emptySubtext}>Créez votre première liste de courses</Text>
                      </View>
                    );
                  }

                  console.log('🛒 INLINE Rendering shopping lists:', shoppingLists.map(l => ({ id: l.id, name: l.name })));
                  
                  return (
                    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                      {shoppingLists.map(list => {
                        const stats = ShoppingListUtils.getCompletionStats(list.items);
                        const isSelected = selectedList?.id === list.id;
                        
                        return (
                          <TouchableOpacity
                            key={list.id}
                            style={[
                              styles.listItem,
                              isSelected && styles.selectedListItem
                            ]}
                            onPress={() => handleAddToExistingList(list)}
                            disabled={creating}
                            activeOpacity={0.7}
                          >
                            <View style={styles.listItemContent}>
                              <Text style={styles.listName} numberOfLines={1}>
                                {list.name}
                              </Text>
                              <View style={styles.listInfo}>
                                <Text style={styles.listStats}>
                                  {stats.completedItems}/{stats.totalItems} articles
                                </Text>
                                <View style={styles.progressContainer}>
                                  <View style={styles.progressBackground}>
                                    <View 
                                      style={[
                                        styles.progressBar, 
                                        { width: `${stats.completionPercentage}%` }
                                      ]} 
                                    />
                                  </View>
                                </View>
                                <Text style={styles.listPercentage}>{stats.completionPercentage}%</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  );
                })()}
              </View>
            )}
            
            {showCreateNew && (
              <View style={styles.listsSection}>
                <Text style={styles.sectionTitle}>Nouvelle liste</Text>
                <TextInput
                  style={styles.newListInput}
                  value={newListName}
                  onChangeText={setNewListName}
                  placeholder="Nom de la nouvelle liste"
                  maxLength={200}
                  editable={!creating}
                />
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onClose}
              disabled={creating}
            >
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            
            {!showCreateNew ? (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  !selectedList && styles.btnDisabled
                ]}
                onPress={() => handleAddToExistingList()}
                disabled={!selectedList || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Ajouter à la liste</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  (!newListName.trim() || creating) && styles.btnDisabled
                ]}
                onPress={handleCreateNewList}
                disabled={!newListName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {mode === 'recipe' ? 'Générer' : 'Créer'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          {!showCreateNew && (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnNewList]}
                onPress={() => setShowCreateNew(true)}
                disabled={creating}
              >
                <Text style={styles.btnNewListIcon}>➕</Text>
                <Text style={styles.btnNewListText}>Créer une nouvelle liste</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const AddToShoppingListModal: React.FC<AddToShoppingListModalProps> = (props) => (
  <ErrorBoundary>
    <AddToShoppingListModalComponent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 15,
    overflow: 'hidden',
  },

  // Modal Header
  modalHeader: {
    padding: 20,
    position: 'relative',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Product Info
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  productIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#ffd89b',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIconText: {
    fontSize: 28,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  productCategory: {
    fontSize: 14,
    color: '#95a5a6',
  },

  // Modal Content
  modalContent: {
    flex: 1,
  },

  // Configuration Section
  configSection: {
    marginBottom: 30,
    paddingHorizontal: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  configRow: {
    flexDirection: 'row',
    gap: 20,
  },
  configGroup: {
    flex: 1,
  },
  configLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  quantityInput: {
    width: '100%',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
  },
  unitBtnActive: {
    backgroundColor: '#667eea',
    borderColor: 'transparent',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  unitBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  unitBtnActiveText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  servingConfig: {
    gap: 10,
  },

  // Lists Section
  listsSection: {
    marginBottom: 25,
    paddingHorizontal: 25,
  },
  
  // List Container and Items
  listContainer: {
    maxHeight: 200,
    marginTop: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#95a5a6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedListItem: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderColor: '#667eea',
    transform: [{ translateX: 5 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listItemContent: {
    flex: 1,
  },
  listName: {
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
    fontSize: 15,
  },
  listInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listStats: {
    fontSize: 13,
    color: '#95a5a6',
  },
  progressContainer: {
    flex: 1,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  listPercentage: {
    fontSize: 13,
    color: '#95a5a6',
    minWidth: 35,
    textAlign: 'right',
  },
  newListInput: {
    padding: 15,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },

  // Action Buttons
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 25,
  },
  btn: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#f5f7fa',
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  btnPrimary: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 4,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnNewList: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#667eea',
    flexDirection: 'row',
    gap: 8,
  },
  btnNewListIcon: {
    fontSize: 16,
    color: '#667eea',
  },
  btnNewListText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
});