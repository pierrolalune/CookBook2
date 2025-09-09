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
  TextInput
} from 'react-native';
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
  const { shoppingLists, loading, actions } = useShoppingLists();
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  
  // State for ingredient quantity and unit selection
  const [ingredientQuantity, setIngredientQuantity] = useState('1');
  const [ingredientUnit, setIngredientUnit] = useState('');

  // Load shopping lists when modal opens
  useEffect(() => {
    if (visible) {
      actions.loadShoppingLists();
      
      // Generate default name for new list
      if (recipe) {
        setNewListName(`Liste pour "${recipe.name}"`);
      } else if (ingredient) {
        setNewListName(`Liste avec ${ingredient.name}`);
        // Initialize quantity and unit for ingredient
        setIngredientQuantity('1');
        setIngredientUnit(ingredient.units[0] || 'pièce');
      }
    } else {
      // Reset state when modal closes
      setIngredientQuantity('1');
      setIngredientUnit('');
    }
  }, [visible, recipe, ingredient]);

  const handleAddToExistingList = useCallback(async (list: ShoppingList) => {
    try {
      setCreating(true);
      const itemRepository = new ShoppingListItemRepository();

      if (mode === 'recipe' && recipe) {
        // Add all recipe ingredients to the list
        for (const recipeIngredient of recipe.ingredients) {
          if (recipeIngredient.optional) continue; // Skip optional ingredients
          
          await itemRepository.create(list.id, {
            ingredientId: recipeIngredient.ingredient.id,
            ingredientName: recipeIngredient.ingredient.name,
            quantity: recipeIngredient.quantity,
            unit: recipeIngredient.unit,
            category: recipeIngredient.ingredient.category
          });
        }
        Alert.alert('✅', `Ingrédients de "${recipe.name}" ajoutés à la liste !`);
      } else if (mode === 'ingredient' && ingredient) {
        // Add single ingredient to the list with selected quantity and unit
        const quantity = parseFloat(ingredientQuantity) || 1;
        await itemRepository.create(list.id, {
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
  }, [recipe, ingredient, mode, onClose, ingredientQuantity, ingredientUnit]);

  const handleCreateNewList = useCallback(async () => {
    if (!newListName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la nouvelle liste');
      return;
    }

    try {
      setCreating(true);

      if (mode === 'recipe' && recipe) {
        // Generate from recipe
        await actions.generateFromRecipes([recipe.id], newListName.trim());
        Alert.alert('✅', 'Nouvelle liste créée avec les ingrédients de la recette !');
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
  }, [newListName, recipe, ingredient, mode, actions, onClose, ingredientQuantity, ingredientUnit]);

  const renderExistingLists = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des listes...</Text>
        </View>
      );
    }

    if (shoppingLists.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aucune liste existante</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.listContainer}>
        {shoppingLists.map(list => {
          const stats = ShoppingListUtils.getCompletionStats(list.items);
          return (
            <TouchableOpacity
              key={list.id}
              style={[
                styles.listItem,
                stats.allItemsCompleted && styles.completedListItem
              ]}
              onPress={() => handleAddToExistingList(list)}
              disabled={creating}
            >
              <View style={styles.listItemContent}>
                <Text style={styles.listItemName} numberOfLines={1}>
                  {list.name}
                </Text>
                <Text style={styles.listItemStats}>
                  {stats.completedItems}/{stats.totalItems} articles • {stats.completionPercentage}%
                </Text>
              </View>
              
              <View style={styles.listItemBadges}>
                {list.createdFromRecipes && (
                  <Text style={styles.recipesBadge}>🍽️</Text>
                )}
                {stats.allItemsCompleted && (
                  <Text style={styles.completedBadge}>✅</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };


  if (!recipe && !ingredient) return null;

  const title = mode === 'recipe' 
    ? `Ajouter "${recipe?.name}" à une liste`
    : `Ajouter "${ingredient?.name}" à une liste`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            
            {mode === 'recipe' && recipe && (
              <Text style={styles.subtitle}>
                {recipe.ingredients.filter(ri => !ri.optional).length} ingrédients seront ajoutés
              </Text>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={creating}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Quantity and Unit Selection for Ingredients */}
            {mode === 'ingredient' && ingredient && (
              <View style={styles.ingredientConfigSection}>
                <Text style={styles.sectionTitle}>Configuration</Text>
                <View style={styles.configRow}>
                  <View style={styles.quantityGroup}>
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
                  
                  <View style={styles.unitGroup}>
                    <Text style={styles.configLabel}>Unité</Text>
                    <View style={styles.unitSelector}>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.unitScrollView}
                      >
                        {ingredient.units.map((unit) => (
                          <TouchableOpacity
                            key={unit}
                            style={[
                              styles.unitButton,
                              ingredientUnit === unit && styles.selectedUnitButton
                            ]}
                            onPress={() => setIngredientUnit(unit)}
                            disabled={creating}
                          >
                            <Text style={[
                              styles.unitButtonText,
                              ingredientUnit === unit && styles.selectedUnitButtonText
                            ]}>
                              {unit}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            {!showCreateNew && (
              <>
                <Text style={styles.sectionTitle}>Listes existantes</Text>
                {renderExistingLists()}
              </>
            )}
            
            {showCreateNew && (
              <>
                <Text style={styles.sectionTitle}>Nouvelle liste</Text>
                <View style={styles.createNewFormInContent}>
                  <TextInput
                    style={styles.textInput}
                    value={newListName}
                    onChangeText={setNewListName}
                    placeholder="Nom de la nouvelle liste"
                    maxLength={200}
                    editable={!creating}
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              {!showCreateNew ? (
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={() => setShowCreateNew(true)}
                  disabled={creating}
                >
                  <Text style={styles.createNewButtonText}>Créer une nouvelle liste</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    (!newListName.trim() || creating) && styles.createButtonDisabled
                  ]}
                  onPress={handleCreateNewList}
                  disabled={!newListName.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.createButtonText}>
                      {mode === 'recipe' && recipe ? 'Générer' : 'Créer'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const AddToShoppingListModal: React.FC<AddToShoppingListModalProps> = (props) => (
  <ErrorBoundary>
    <AddToShoppingListModalComponent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: '85%',
    width: '95%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    marginRight: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedListItem: {
    opacity: 0.7,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  listItemStats: {
    fontSize: 11,
    color: '#6B7280',
  },
  listItemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipesBadge: {
    fontSize: 16,
    marginRight: 4,
  },
  completedBadge: {
    fontSize: 16,
  },
  createNewSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  createNewToggle: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  createNewToggleText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  createNewForm: {
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  ingredientConfigSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FEFEFE',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  configRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quantityGroup: {
    flex: 1,
  },
  unitGroup: {
    flex: 2,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  quantityInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unitSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unitScrollView: {
    maxHeight: 44,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedUnitButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  unitButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedUnitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  createNewButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createNewButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  createNewFormInContent: {
    paddingHorizontal: 20,
  },
});