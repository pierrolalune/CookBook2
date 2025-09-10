import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ingredient, IngredientCategory } from '../../types';
import { colors, spacing, typography } from '../../styles';
import { useRecipeIngredients, useIngredientUnits } from '../../hooks/useRecipeIngredients';
import { useIngredients } from '../../hooks/useIngredients';
import { useFavorites } from '../../hooks/useFavorites';
import { ErrorBoundary } from '../common/ErrorBoundary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface IngredientSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onAddIngredient: (ingredient: Ingredient, quantity: number, unit: string, optional?: boolean) => void;
  excludeIngredientIds?: string[];
  editingIngredient?: { ingredientId: string; ingredient?: Ingredient; quantity: number; unit: string; optional?: boolean } | null;
}

interface CategorySectionProps {
  category: IngredientCategory | 'favoris' | 'myproduct';
  ingredients: Ingredient[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedIngredient: Ingredient | null;
  onSelectIngredient: (ingredient: Ingredient) => void;
}

const getCategoryConfig = (category: IngredientCategory | 'favoris' | 'myproduct') => {
  const configs = {
    favoris: { icon: '⭐', label: 'FAVORIS', color: '#ff6b6b' },
    fruits: { icon: '🍎', label: 'FRUITS', color: '#4CAF50' },
    legumes: { icon: '🥬', label: 'LÉGUMES', color: '#8BC34A' },
    viande: { icon: '🥩', label: 'VIANDE', color: '#F44336' },
    peche: { icon: '🐟', label: 'POISSON', color: '#2196F3' },
    epicerie: { icon: '🛒', label: 'ÉPICERIE', color: '#FF9800' },
    produits_laitiers: { icon: '🥛', label: 'PRODUITS LAITIERS', color: '#FFC107' },
    myproduct: { icon: '⭐', label: 'MES PRODUITS', color: '#9C27B0' },
    autres: { icon: '📦', label: 'AUTRES', color: '#757575' }
  };
  
  return configs[category] || configs.autres;
};

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  ingredients,
  isCollapsed,
  onToggleCollapse,
  selectedIngredient,
  onSelectIngredient
}) => {
  const config = getCategoryConfig(category);
  
  if (ingredients.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <TouchableOpacity 
        style={styles.categoryHeader}
        onPress={onToggleCollapse}
        activeOpacity={0.7}
      >
        <View style={styles.categoryHeaderLeft}>
          <Text style={styles.categoryIcon}>{config.icon}</Text>
          <Text style={styles.categoryLabel}>{config.label}</Text>
          <Text style={styles.categoryCount}>({ingredients.length})</Text>
        </View>
        <Text style={[
          styles.categoryToggle,
          isCollapsed && styles.categoryToggleCollapsed
        ]}>
          ▼
        </Text>
      </TouchableOpacity>
      
      {!isCollapsed && (
        <View style={styles.ingredientsGrid}>
          {ingredients.map((ingredient) => (
            <TouchableOpacity
              key={ingredient.id}
              style={[
                styles.ingredientItem,
                selectedIngredient?.id === ingredient.id && styles.selectedIngredientItem
              ]}
              onPress={() => onSelectIngredient(ingredient)}
              activeOpacity={0.7}
            >
              <Text style={styles.ingredientItemIcon}>
                {config.icon}
              </Text>
              <Text style={styles.ingredientItemName} numberOfLines={2}>
                {ingredient.name}
              </Text>
              {selectedIngredient?.id === ingredient.id && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkBadgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          {/* Add ingredient card for user categories */}
          {(category === 'favoris' || category === 'myproduct') && (
            <TouchableOpacity
              style={[styles.ingredientItem, styles.addIngredientCard]}
              onPress={() => Alert.alert('Ajouter ingrédient', 'Fonctionnalité bientôt disponible')}
              activeOpacity={0.7}
            >
              <View style={styles.addIngredientIcon}>
                <Text style={styles.addIngredientIconText}>+</Text>
              </View>
              <Text style={styles.addIngredientName}>
                {category === 'favoris' ? 'Ajouter' : 'Nouveau'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export const IngredientSelectorModal: React.FC<IngredientSelectorModalProps> = ({
  visible,
  onClose,
  onAddIngredient,
  excludeIngredientIds = [],
  editingIngredient = null
}) => {
  const [modalAnimation] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [optional, setOptional] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set(['viande', 'peche', 'produits_laitiers']));
  const [step, setStep] = useState<'select' | 'quantity'>('select');

  const { ingredients, loading, actions } = useIngredients();
  const { favoriteIds } = useFavorites();
  const { getUnitsForIngredient, getDefaultUnit } = useIngredientUnits();

  // Filter out excluded ingredients
  const availableIngredients = useMemo(() => 
    ingredients.filter(ingredient => !excludeIngredientIds.includes(ingredient.id)),
    [ingredients, excludeIngredientIds]
  );

  // Filter ingredients by search query
  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return availableIngredients;
    
    const query = searchQuery.toLowerCase().trim();
    return availableIngredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(query) ||
      ingredient.subcategory.toLowerCase().includes(query)
    );
  }, [availableIngredients, searchQuery]);

  // Group ingredients by category
  const groupedIngredients = useMemo(() => {
    const groups: { [key: string]: Ingredient[] } = {
      favoris: [],
      myproduct: [],
      fruits: [],
      legumes: [],
      viande: [],
      peche: [],
      epicerie: [],
      produits_laitiers: [],
      autres: []
    };

    // Add favorites first
    groups.favoris = filteredIngredients.filter(ingredient => 
      favoriteIds.includes(ingredient.id)
    );

    // Group by category
    filteredIngredients.forEach(ingredient => {
      if (ingredient.isUserCreated) {
        groups.myproduct.push(ingredient);
      } else if (groups[ingredient.category]) {
        groups[ingredient.category].push(ingredient);
      } else {
        groups.autres.push(ingredient);
      }
    });

    return groups;
  }, [filteredIngredients, favoriteIds]);

  useEffect(() => {
    if (visible) {
      actions.loadIngredients();
      
      // Initialize editing mode
      if (editingIngredient) {
        setSelectedIngredient(editingIngredient.ingredient || null);
        setQuantity(editingIngredient.quantity.toString());
        setSelectedUnit(editingIngredient.unit);
        setOptional(editingIngredient.optional || false);
        setStep('quantity');
      }
      
      // Animate modal in
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      // Animate modal out
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
      
      // Reset state when modal closes
      setTimeout(() => {
        setSearchQuery('');
        setSelectedIngredient(null);
        setQuantity('1');
        setSelectedUnit('');
        setOptional(false);
        setStep('select');
      }, 250);
    }
  }, [visible, editingIngredient]);

  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSelectedUnit(getDefaultUnit(ingredient));
    setStep('quantity');
  };

  const handleAddIngredient = () => {
    if (!selectedIngredient) return;
    
    const numQuantity = parseFloat(quantity) || 1;
    onAddIngredient(selectedIngredient, numQuantity, selectedUnit, optional);
    onClose();
  };

  const handleToggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const handleBackToSelection = () => {
    setStep('select');
    setSelectedIngredient(null);
  };

  const availableUnits = selectedIngredient ? getUnitsForIngredient(selectedIngredient) : [];

  const modalOpacity = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const modalScale = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const backdropOpacity = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContent,
            { 
              opacity: modalOpacity,
              transform: [{ scale: modalScale }] 
            }
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTopBar}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={step === 'quantity' ? handleBackToSelection : onClose}
                >
                  <Text style={styles.backButtonText}>
                    {step === 'quantity' ? '‹' : '×'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingIngredient ? 
                    (step === 'select' ? 'Modifier l\'ingrédient' : 'Modifier la quantité') :
                    (step === 'select' ? 'Ajouter un ingrédient' : 'Quantité')
                  }
                </Text>
                <View style={styles.spacer} />
              </View>

              {/* Search Bar (only in select step) */}
              {step === 'select' && (
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un ingrédient..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={colors.textLight}
                  />
                  <Text style={styles.searchIcon}>🔍</Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              {step === 'select' ? (
                // Ingredients Selection
                <ScrollView
                  style={styles.ingredientsContainer}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  <ErrorBoundary>
                    {Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
                      <CategorySection
                        key={category}
                        category={category as IngredientCategory | 'favoris' | 'myproduct'}
                        ingredients={categoryIngredients}
                        isCollapsed={collapsedCategories.has(category)}
                        onToggleCollapse={() => handleToggleCategory(category)}
                        selectedIngredient={selectedIngredient}
                        onSelectIngredient={handleSelectIngredient}
                      />
                    ))}
                    
                    {filteredIngredients.length === 0 && (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateIcon}>🔍</Text>
                        <Text style={styles.emptyStateText}>
                          {searchQuery ? 'Aucun ingrédient trouvé' : 'Aucun ingrédient disponible'}
                        </Text>
                      </View>
                    )}
                  </ErrorBoundary>
                </ScrollView>
              ) : (
                // Quantity Selection
                <View style={styles.quantitySection}>
                  {selectedIngredient && (
                    <View style={styles.selectedIngredient}>
                      <Text style={styles.selectedIcon}>
                        {getCategoryConfig(selectedIngredient.category).icon}
                      </Text>
                      <Text style={styles.selectedName}>
                        {selectedIngredient.name}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.quantityRow}>
                    <View style={styles.quantityGroup}>
                      <Text style={styles.quantityLabel}>Quantité</Text>
                      <TextInput
                        style={styles.quantityInput}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        placeholder="1"
                      />
                    </View>
                    
                    <View style={styles.quantityGroup}>
                      <Text style={styles.quantityLabel}>Unité</Text>
                      <View style={styles.unitSelectContainer}>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          style={styles.unitScrollView}
                        >
                          {availableUnits.map((unit) => (
                            <TouchableOpacity
                              key={unit}
                              style={[
                                styles.unitButton,
                                selectedUnit === unit && styles.selectedUnitButton
                              ]}
                              onPress={() => setSelectedUnit(unit)}
                            >
                              <Text style={[
                                styles.unitButtonText,
                                selectedUnit === unit && styles.selectedUnitButtonText
                              ]}>
                                {unit}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                  
                  {/* Optional Toggle */}
                  <View style={styles.optionalToggle}>
                    <TouchableOpacity
                      style={styles.optionalToggleRow}
                      onPress={() => setOptional(!optional)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, optional && styles.checkboxChecked]}>
                        {optional && <Text style={styles.checkboxText}>✓</Text>}
                      </View>
                      <Text style={styles.optionalToggleText}>Ingrédient optionnel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!selectedIngredient || (step === 'quantity' && (!quantity || !selectedUnit))) && styles.disabledButton
                ]}
                onPress={handleAddIngredient}
                disabled={!selectedIngredient || (step === 'quantity' && (!quantity || !selectedUnit))}
              >
                <Text style={styles.addButtonText}>
                  {step === 'select' ? 'Suivant' : 
                    (editingIngredient ? 'Mettre à jour' : 'Ajouter à la recette')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },

  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginVertical: screenHeight * 0.1,
    height: screenHeight * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  modalHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },

  modalTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },

  spacer: {
    width: 32,
  },

  searchContainer: {
    position: 'relative',
  },

  searchInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingRight: 45,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },

  searchIcon: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -10,
    fontSize: 16,
  },

  content: {
    flex: 1,
  },

  ingredientsContainer: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing.md,
    minHeight: screenHeight * 0.4,
  },

  categorySection: {
    marginBottom: spacing.lg,
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
  },

  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },

  categoryLabel: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },

  categoryCount: {
    ...typography.styles.small,
    color: colors.textLight,
  },

  categoryToggle: {
    fontSize: 12,
    color: colors.textLight,
  },

  categoryToggleCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },

  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  ingredientItem: {
    width: '31%',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 80,
    position: 'relative',
  },

  selectedIngredientItem: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },

  ingredientItemIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },

  ingredientItemName: {
    ...typography.styles.small,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },

  checkBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkBadgeText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },

  addIngredientCard: {
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },

  addIngredientIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  addIngredientIconText: {
    color: colors.textWhite,
    fontSize: 20,
    fontWeight: typography.weights.bold,
  },

  addIngredientName: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },

  quantitySection: {
    padding: spacing.lg,
  },

  selectedIngredient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.lg,
  },

  selectedIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },

  selectedName: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },

  quantityRow: {
    gap: spacing.md,
  },

  quantityGroup: {
    marginBottom: spacing.md,
  },

  quantityLabel: {
    ...typography.styles.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },

  quantityInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  unitSelectContainer: {
    maxHeight: 100,
  },

  unitScrollView: {
    flexGrow: 0,
  },

  unitButton: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },

  selectedUnitButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  unitButtonText: {
    ...typography.styles.small,
    color: colors.textPrimary,
  },

  selectedUnitButtonText: {
    color: colors.textWhite,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  emptyStateIcon: {
    fontSize: 48,
    opacity: 0.5,
    marginBottom: spacing.md,
  },

  emptyStateText: {
    ...typography.styles.body,
    color: colors.textLight,
    textAlign: 'center',
  },

  bottomActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },

  cancelButtonText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },

  addButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.5,
  },

  addButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  optionalToggle: {
    marginTop: spacing.md,
  },

  optionalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkboxText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },

  optionalToggleText: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },
});