import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { RecipeIngredientMatch } from '../../utils/recipeSearchUtils';
import { Ingredient, IngredientCategory } from '../../types';
import { SeasonalUtils } from '../../utils/seasonalUtils';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface MissingIngredientsDisplayProps {
  missingIngredients: RecipeIngredientMatch[];
  optionalMissing?: RecipeIngredientMatch[];
  onIngredientPress?: (ingredient: Ingredient) => void;
  onSubstitutionPress?: (originalIngredient: Ingredient, substitution: Ingredient) => void;
  showShoppingList?: boolean;
  onAddToShoppingList?: (ingredients: RecipeIngredientMatch[]) => void;
  compact?: boolean;
}

interface GroupedMissingIngredients {
  category: IngredientCategory;
  ingredients: RecipeIngredientMatch[];
  categoryLabel: string;
  categoryIcon: string;
}

export const MissingIngredientsDisplay: React.FC<MissingIngredientsDisplayProps> = ({
  missingIngredients,
  optionalMissing = [],
  onIngredientPress,
  onSubstitutionPress,
  showShoppingList = false,
  onAddToShoppingList,
  compact = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showOptional, setShowOptional] = useState(false);

  const categoryLabels = {
    fruits: { label: 'Fruits', icon: '🍎' },
    legumes: { label: 'Légumes', icon: '🥕' },
    viande: { label: 'Viande', icon: '🥩' },
    produits_laitiers: { label: 'Produits laitiers', icon: '🥛' },
    epicerie: { label: 'Épicerie', icon: '🛒' },
    peche: { label: 'Poisson', icon: '🐟' },
    autres: { label: 'Autres', icon: '📦' }
  };

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const groupIngredientsByCategory = useCallback((ingredients: RecipeIngredientMatch[]): GroupedMissingIngredients[] => {
    const grouped = ingredients.reduce((acc, ingredient) => {
      const category = ingredient.ingredient.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(ingredient);
      return acc;
    }, {} as { [key in IngredientCategory]: RecipeIngredientMatch[] });

    return Object.entries(grouped).map(([category, ingredients]) => ({
      category: category as IngredientCategory,
      ingredients,
      categoryLabel: categoryLabels[category as IngredientCategory]?.label || category,
      categoryIcon: categoryLabels[category as IngredientCategory]?.icon || '📦'
    }));
  }, []);

  const handleAddToShoppingList = useCallback(() => {
    if (onAddToShoppingList) {
      const allIngredients = showOptional ? [...missingIngredients, ...optionalMissing] : missingIngredients;
      onAddToShoppingList(allIngredients);
      
      Alert.alert(
        'Ajouté à la liste de courses',
        `${allIngredients.length} ingrédient${allIngredients.length > 1 ? 's ont été ajoutés' : ' a été ajouté'} à votre liste de courses.`,
        [{ text: 'OK' }]
      );
    }
  }, [missingIngredients, optionalMissing, showOptional, onAddToShoppingList]);

  const renderIngredientItem = ({ item }: { item: RecipeIngredientMatch }) => {
    const isOptional = item.optional;
    const seasonalStatus = SeasonalUtils.getDetailedSeasonStatus(item.ingredient);
    const isInSeason = seasonalStatus === 'in-season' || seasonalStatus === 'peak-season';
    
    return (
      <TouchableOpacity
        style={[
          styles.ingredientItem,
          isOptional && styles.optionalIngredientItem
        ]}
        onPress={() => onIngredientPress?.(item.ingredient)}
      >
        <View style={styles.ingredientInfo}>
          <View style={styles.ingredientHeader}>
            <Text style={[
              styles.ingredientName,
              isOptional && styles.optionalText
            ]}>
              {item.ingredient.name}
            </Text>
            
            <View style={styles.ingredientBadges}>
              {isInSeason && (
                <View style={styles.seasonalBadge}>
                  <Ionicons name="leaf" size={12} color={colors.success} />
                </View>
              )}
              
              {isOptional && (
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Opt.</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.quantityContainer}>
            <Ionicons 
              name={isOptional ? "help-circle" : "close-circle"} 
              size={16} 
              color={isOptional ? colors.textSecondary : colors.error} 
            />
            <Text style={[
              styles.quantityText,
              isOptional && styles.optionalText
            ]}>
              {item.quantity} {item.unit}
            </Text>
          </View>

          {/* Substitutions */}
          {item.substitutions && item.substitutions.length > 0 && (
            <View style={styles.substitutionsContainer}>
              <Text style={styles.substitutionsLabel}>Alternatives:</Text>
              <View style={styles.substitutionsList}>
                {item.substitutions.slice(0, compact ? 2 : 3).map(substitution => (
                  <TouchableOpacity
                    key={substitution.id}
                    style={styles.substitutionChip}
                    onPress={() => onSubstitutionPress?.(item.ingredient, substitution)}
                  >
                    <Text style={styles.substitutionText}>{substitution.name}</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategorySection = ({ item }: { item: GroupedMissingIngredients }) => {
    const isExpanded = expandedCategories.has(item.category);
    
    return (
      <View style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(item.category)}
        >
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryIcon}>{item.categoryIcon}</Text>
            <Text style={styles.categoryTitle}>
              {item.categoryLabel} ({item.ingredients.length})
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.categoryContent}>
            <FlatList
              data={item.ingredients}
              renderItem={renderIngredientItem}
              keyExtractor={(ingredient, index) => `${ingredient.ingredientId}-${index}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>
    );
  };

  const renderCompactView = () => {
    const totalMissing = missingIngredients.length;
    const totalOptional = optionalMissing.length;
    
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.compactStats}>
            <View style={styles.compactStatItem}>
              <Ionicons name="close-circle" size={16} color={colors.error} />
              <Text style={styles.compactStatText}>{totalMissing} manquant{totalMissing > 1 ? 's' : ''}</Text>
            </View>
            
            {totalOptional > 0 && (
              <View style={styles.compactStatItem}>
                <Ionicons name="help-circle" size={16} color={colors.textSecondary} />
                <Text style={styles.compactStatText}>{totalOptional} optionnel{totalOptional > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
          
          {showShoppingList && (
            <TouchableOpacity
              style={styles.addToListButton}
              onPress={handleAddToShoppingList}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addToListText}>Liste</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Quick preview of first few ingredients */}
        <View style={styles.quickPreview}>
          {missingIngredients.slice(0, 3).map((ingredient, index) => (
            <Text key={ingredient.ingredientId} style={styles.quickPreviewText}>
              {ingredient.ingredient.name}
              {index < Math.min(2, missingIngredients.length - 1) ? ', ' : ''}
              {index === 2 && missingIngredients.length > 3 ? '...' : ''}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  if (compact) {
    return (
      <ErrorBoundary>
        {renderCompactView()}
      </ErrorBoundary>
    );
  }

  if (missingIngredients.length === 0 && optionalMissing.length === 0) {
    return (
      <ErrorBoundary>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>Tous les ingrédients disponibles !</Text>
          <Text style={styles.emptySubtitle}>Vous pouvez préparer cette recette maintenant.</Text>
        </View>
      </ErrorBoundary>
    );
  }

  const groupedRequired = groupIngredientsByCategory(missingIngredients);
  const groupedOptional = groupIngredientsByCategory(optionalMissing);

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ingrédients manquants</Text>
          
          {showShoppingList && (
            <TouchableOpacity
              style={styles.shoppingListButton}
              onPress={handleAddToShoppingList}
            >
              <Ionicons name="basket" size={20} color={colors.textWhite} />
              <Text style={styles.shoppingListText}>Ajouter à la liste</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Required ingredients */}
        {groupedRequired.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ingrédients requis ({missingIngredients.length})
            </Text>
            <FlatList
              data={groupedRequired}
              renderItem={renderCategorySection}
              keyExtractor={(item) => `required-${item.category}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Optional ingredients */}
        {optionalMissing.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.optionalHeader}
              onPress={() => setShowOptional(!showOptional)}
            >
              <Text style={styles.sectionTitle}>
                Ingrédients optionnels ({optionalMissing.length})
              </Text>
              <Ionicons
                name={showOptional ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            
            {showOptional && (
              <FlatList
                data={groupedOptional}
                renderItem={renderCategorySection}
                keyExtractor={(item) => `optional-${item.category}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  compactContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  title: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  compactStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  compactStatText: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  shoppingListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.xs,
  },

  shoppingListText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  addToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },

  addToListText: {
    ...typography.styles.tiny,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  quickPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  quickPreviewText: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  section: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  optionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  categorySection: {
    marginBottom: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
  },

  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  categoryIcon: {
    fontSize: 16,
  },

  categoryTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },

  categoryContent: {
    backgroundColor: colors.background,
  },

  ingredientItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  optionalIngredientItem: {
    backgroundColor: colors.backgroundLight,
    opacity: 0.8,
  },

  ingredientInfo: {
    gap: spacing.sm,
  },

  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ingredientName: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    flex: 1,
  },

  optionalText: {
    opacity: 0.7,
  },

  ingredientBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  seasonalBadge: {
    backgroundColor: colors.successLight,
    borderRadius: spacing.borderRadius.full,
    padding: 2,
  },

  optionalBadge: {
    backgroundColor: colors.textSecondary,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
  },

  optionalBadgeText: {
    ...typography.styles.tiny,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  quantityText: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  substitutionsContainer: {
    marginTop: spacing.xs,
    paddingLeft: spacing.lg,
  },

  substitutionsLabel: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  substitutionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  substitutionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    gap: spacing.xs,
  },

  substitutionText: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },

  emptyTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  emptySubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});