import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShoppingLists } from '../../hooks/useShoppingLists';
import { useIngredients } from '../../hooks/useIngredients';
import { useRecipes } from '../../hooks/useRecipes';
import { SearchBar } from '../common/SearchBar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import {
  CreateShoppingListInput,
  CreateShoppingListItemInput,
  IngredientCategory,
  Recipe,
  Ingredient
} from '../../types';

interface CreateShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedRecipes?: Recipe[];
  preselectedIngredients?: Ingredient[];
}

interface QuickAddItem {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
}

const QUICK_ADD_ITEMS: QuickAddItem[] = [
  { name: 'Pain', quantity: 1, unit: 'pièce', category: 'epicerie' },
  { name: 'Lait', quantity: 1, unit: 'L', category: 'produits_laitiers' },
  { name: 'Œufs', quantity: 6, unit: 'pièces', category: 'produits_laitiers' },
  { name: 'Pommes', quantity: 1, unit: 'kg', category: 'fruits' },
  { name: 'Pommes de terre', quantity: 1, unit: 'kg', category: 'legumes' },
  { name: 'Tomates', quantity: 500, unit: 'g', category: 'legumes' },
  { name: 'Poulet', quantity: 1, unit: 'pièce', category: 'viande' },
  { name: 'Poisson', quantity: 500, unit: 'g', category: 'peche' }
];

export const CreateShoppingListModal: React.FC<CreateShoppingListModalProps> = ({
  visible,
  onClose,
  onSuccess,
  preselectedRecipes = [],
  preselectedIngredients = []
}) => {
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<CreateShoppingListItemInput[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'quick' | 'recipes' | 'ingredients'>('quick');
  const [creating, setCreating] = useState(false);

  const { actions: { createShoppingList } } = useShoppingLists();
  const { ingredients } = useIngredients();
  const { recipes } = useRecipes();

  // Initialize with preselected items
  React.useEffect(() => {
    if (visible) {
      // Reset form
      setListName('');
      setListDescription('');
      setSelectedItems([]);
      setSearchQuery('');
      setActiveTab('quick');
      setCreating(false);

      // Handle preselected recipes
      if (preselectedRecipes.length > 0) {
        setActiveTab('recipes');
        generateItemsFromRecipes(preselectedRecipes);
        
        if (preselectedRecipes.length === 1) {
          setListName(`Liste pour ${preselectedRecipes[0].name}`);
        } else {
          setListName(`Liste pour ${preselectedRecipes.length} recettes`);
        }
      }

      // Handle preselected ingredients
      if (preselectedIngredients.length > 0) {
        setActiveTab('ingredients');
        const items = preselectedIngredients.map((ingredient, index) => ({
          ingredientId: ingredient.id,
          quantity: 1,
          unit: ingredient.units[0] || 'unité',
          category: ingredient.category,
          orderIndex: index
        }));
        setSelectedItems(items);
        setListName('Ma liste personnalisée');
      }
    }
  }, [visible, preselectedRecipes, preselectedIngredients]);

  const generateItemsFromRecipes = useCallback((selectedRecipes: Recipe[]) => {
    const itemsMap = new Map<string, CreateShoppingListItemInput>();

    selectedRecipes.forEach(recipe => {
      recipe.ingredients.forEach(recipeIngredient => {
        const key = recipeIngredient.ingredientId;
        
        if (itemsMap.has(key)) {
          const existing = itemsMap.get(key)!;
          if (existing.unit === recipeIngredient.unit) {
            existing.quantity += recipeIngredient.quantity;
          }
        } else {
          itemsMap.set(key, {
            ingredientId: recipeIngredient.ingredientId,
            quantity: recipeIngredient.quantity,
            unit: recipeIngredient.unit,
            category: recipeIngredient.ingredient.category,
            notes: `Pour: ${recipe.name}`,
            orderIndex: itemsMap.size
          });
        }
      });
    });

    setSelectedItems(Array.from(itemsMap.values()));
  }, []);

  const handleAddQuickItem = (quickItem: QuickAddItem) => {
    const newItem: CreateShoppingListItemInput = {
      customName: quickItem.name,
      quantity: quickItem.quantity,
      unit: quickItem.unit,
      category: quickItem.category,
      orderIndex: selectedItems.length
    };

    setSelectedItems(prev => [...prev, newItem]);
  };

  const handleAddIngredient = (ingredient: Ingredient) => {
    const existingIndex = selectedItems.findIndex(item => item.ingredientId === ingredient.id);
    
    if (existingIndex >= 0) {
      // Already added, increase quantity
      setSelectedItems(prev => prev.map((item, index) => 
        index === existingIndex 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CreateShoppingListItemInput = {
        ingredientId: ingredient.id,
        quantity: 1,
        unit: ingredient.units[0] || 'unité',
        category: ingredient.category,
        orderIndex: selectedItems.length
      };

      setSelectedItems(prev => [...prev, newItem]);
    }
  };

  const handleAddRecipe = (recipe: Recipe) => {
    generateItemsFromRecipes([recipe]);
    
    if (!listName) {
      setListName(`Liste pour ${recipe.name}`);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: string) => {
    const numQuantity = parseFloat(quantity) || 0;
    if (numQuantity > 0) {
      setSelectedItems(prev => prev.map((item, i) => 
        i === index ? { ...item, quantity: numQuantity } : item
      ));
    }
  };

  const handleCreateList = async () => {
    if (!listName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la liste');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un article à la liste');
      return;
    }

    try {
      setCreating(true);

      const createInput: CreateShoppingListInput = {
        name: listName.trim(),
        description: listDescription.trim() || undefined,
        items: selectedItems
      };

      await createShoppingList(createInput);
      onSuccess();
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Impossible de créer la liste. Veuillez réessayer.'
      );
    } finally {
      setCreating(false);
    }
  };

  const getItemDisplayName = (item: CreateShoppingListItemInput): string => {
    if (item.ingredientId) {
      const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
      return ingredient?.name || 'Ingrédient inconnu';
    }
    return item.customName || 'Article';
  };

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'quick':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Articles courants</Text>
            <View style={styles.quickItemsGrid}>
              {QUICK_ADD_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickItem}
                  onPress={() => handleAddQuickItem(item)}
                >
                  <Text style={styles.quickItemText}>{item.name}</Text>
                  <Text style={styles.quickItemQuantity}>
                    {item.quantity} {item.unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'ingredients':
        return (
          <View style={styles.tabContent}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher un ingrédient..."
              style={styles.searchBar}
            />
            <ScrollView style={styles.ingredientsList}>
              {filteredIngredients.map(ingredient => (
                <TouchableOpacity
                  key={ingredient.id}
                  style={styles.ingredientItem}
                  onPress={() => handleAddIngredient(ingredient)}
                >
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'recipes':
        return (
          <View style={styles.tabContent}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher une recette..."
              style={styles.searchBar}
            />
            <ScrollView style={styles.recipesList}>
              {filteredRecipes.map(recipe => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeItem}
                  onPress={() => handleAddRecipe(recipe)}
                >
                  <View>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Text style={styles.recipeIngredients}>
                      {recipe.ingredients.length} ingrédient{recipe.ingredients.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle liste</Text>
          <TouchableOpacity 
            onPress={handleCreateList}
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            disabled={creating}
          >
            <Text style={[styles.createButtonText, creating && styles.createButtonTextDisabled]}>
              {creating ? 'Création...' : 'Créer'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Nom de la liste *</Text>
            <TextInput
              style={styles.input}
              value={listName}
              onChangeText={setListName}
              placeholder="Ma liste de courses"
              maxLength={100}
            />

            <Text style={styles.label}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={listDescription}
              onChangeText={setListDescription}
              placeholder="Courses pour la semaine..."
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'quick' && styles.activeTab]}
              onPress={() => setActiveTab('quick')}
            >
              <Text style={[styles.tabText, activeTab === 'quick' && styles.activeTabText]}>
                Rapide
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
              onPress={() => setActiveTab('ingredients')}
            >
              <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>
                Ingrédients
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'recipes' && styles.activeTab]}
              onPress={() => setActiveTab('recipes')}
            >
              <Text style={[styles.tabText, activeTab === 'recipes' && styles.activeTabText]}>
                Recettes
              </Text>
            </TouchableOpacity>
          </View>

          {renderTabContent()}

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <View style={styles.selectedItemsSection}>
              <Text style={styles.sectionTitle}>
                Articles sélectionnés ({selectedItems.length})
              </Text>
              {selectedItems.map((item, index) => (
                <View key={index} style={styles.selectedItem}>
                  <View style={styles.selectedItemInfo}>
                    <Text style={styles.selectedItemName}>
                      {getItemDisplayName(item)}
                    </Text>
                    <View style={styles.quantityContainer}>
                      <TextInput
                        style={styles.quantityInput}
                        value={item.quantity.toString()}
                        onChangeText={(text) => handleQuantityChange(index, text)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>{item.unit}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundLight
  },
  closeButton: {
    padding: 4
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  createButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6
  },
  createButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textWhite
  },
  createButtonTextDisabled: {
    color: colors.textSecondary
  },
  content: {
    flex: 1
  },
  form: {
    padding: 20
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundLight
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundLight
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary
  },
  tabText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary
  },
  activeTabText: {
    color: colors.primary
  },
  tabContent: {
    padding: 20
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 16
  },
  quickItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6
  },
  quickItem: {
    backgroundColor: colors.backgroundLight,
    margin: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minWidth: 100,
    alignItems: 'center'
  },
  quickItemText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    textAlign: 'center'
  },
  quickItemQuantity: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4
  },
  searchBar: {
    marginBottom: 16
  },
  ingredientsList: {
    maxHeight: 300
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundLight,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  ingredientName: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary
  },
  recipesList: {
    maxHeight: 300
  },
  recipeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundLight,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  recipeName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary
  },
  recipeIngredients: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2
  },
  selectedItemsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundLight,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  selectedItemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectedItemName: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 50,
    marginRight: 8
  },
  unitText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  removeButton: {
    padding: 4,
    marginLeft: 12
  }
});

export default CreateShoppingListModal;