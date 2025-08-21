import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert
} from 'react-native';
import { RecipeIngredient } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';
import { useIngredientUsage } from '../../hooks/useIngredientUsage';

interface RecipeIngredientsSectionProps {
  ingredients: RecipeIngredient[];
  servings?: number;
  editable?: boolean;
  onIngredientPress?: (ingredient: RecipeIngredient, index: number) => void;
  onServingsChange?: (newServings: number) => void;
  showUsageStats?: boolean;
  interactive?: boolean;
}

interface IngredientItemProps {
  ingredient: RecipeIngredient;
  index: number;
  servingsMultiplier: number;
  isChecked: boolean;
  onPress?: () => void;
  onToggleCheck?: (checked: boolean) => void;
  showUsageStats: boolean;
  interactive: boolean;
  usageStats?: string;
}

const IngredientItem: React.FC<IngredientItemProps> = ({
  ingredient,
  index,
  servingsMultiplier,
  isChecked,
  onPress,
  onToggleCheck,
  showUsageStats,
  interactive,
  usageStats
}) => {
  const adjustedQuantity = ingredient.quantity * servingsMultiplier;
  
  // Format quantity to avoid unnecessary decimal places
  const formatQuantity = (quantity: number): string => {
    if (quantity % 1 === 0) {
      return quantity.toString();
    } else if (quantity < 1) {
      return quantity.toFixed(2).replace(/\.?0+$/, '');
    } else {
      return quantity.toFixed(1).replace(/\.0$/, '');
    }
  };

  const handleToggleCheck = () => {
    if (!interactive) return;
    onToggleCheck?.(!isChecked);
  };

  return (
    <TouchableOpacity
      style={[
        styles.ingredientContainer,
        isChecked && styles.checkedIngredient,
        ingredient.optional && styles.optionalIngredient,
        !interactive && styles.nonInteractive
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Checkbox (for interactive mode) */}
      {interactive && (
        <TouchableOpacity
          style={[
            styles.checkbox,
            isChecked && styles.checkedCheckbox
          ]}
          onPress={handleToggleCheck}
        >
          {isChecked && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Ingredient Info */}
      <View style={styles.ingredientInfo}>
        <View style={styles.ingredientHeader}>
          <Text style={[
            styles.ingredientName,
            isChecked && styles.checkedIngredientName
          ]}>
            {ingredient.ingredient.name}
            {ingredient.optional && (
              <Text style={styles.optionalText}> (optionnel)</Text>
            )}
          </Text>
          
          <Text style={[
            styles.quantityText,
            isChecked && styles.checkedQuantityText
          ]}>
            {formatQuantity(adjustedQuantity)} {ingredient.unit}
          </Text>
        </View>

        {/* Usage Stats */}
        {showUsageStats && usageStats && (
          <Text style={styles.usageStatsText}>
            {usageStats}
          </Text>
        )}

        {/* Ingredient Category/Subcategory */}
        <Text style={styles.ingredientCategory}>
          {ingredient.ingredient.subcategory}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const RecipeIngredientsSection: React.FC<RecipeIngredientsSectionProps> = ({
  ingredients,
  servings = 4,
  editable = false,
  onIngredientPress,
  onServingsChange,
  showUsageStats = false,
  interactive = false
}) => {
  const [currentServings, setCurrentServings] = useState(servings);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  
  const servingsMultiplier = currentServings / servings;
  
  // Get ingredient IDs for usage stats
  const ingredientIds = ingredients.map(ing => ing.ingredientId);
  const { getUsageDisplay } = useIngredientUsage(showUsageStats ? ingredientIds : undefined);

  const handleServingsChange = (increment: boolean) => {
    const newServings = increment ? currentServings + 1 : Math.max(1, currentServings - 1);
    setCurrentServings(newServings);
    onServingsChange?.(newServings);
  };

  const handleIngredientPress = (ingredient: RecipeIngredient, index: number) => {
    if (editable) {
      onIngredientPress?.(ingredient, index);
    }
  };

  const handleToggleCheck = (ingredient: RecipeIngredient, checked: boolean) => {
    const newChecked = new Set(checkedIngredients);
    if (checked) {
      newChecked.add(ingredient.id);
    } else {
      newChecked.delete(ingredient.id);
    }
    setCheckedIngredients(newChecked);
  };

  const sortedIngredients = [...ingredients].sort((a, b) => a.orderIndex - b.orderIndex);

  const renderIngredient = ({ item, index }: { item: RecipeIngredient, index: number }) => {
    const usageDisplay = showUsageStats ? getUsageDisplay(item.ingredientId) : null;
    const usageStats = usageDisplay ? usageDisplay.usageText : undefined;

    return (
      <IngredientItem
        ingredient={item}
        index={index}
        servingsMultiplier={servingsMultiplier}
        isChecked={checkedIngredients.has(item.id)}
        onPress={() => handleIngredientPress(item, index)}
        onToggleCheck={(checked) => handleToggleCheck(item, checked)}
        showUsageStats={showUsageStats}
        interactive={interactive}
        usageStats={usageStats}
      />
    );
  };

  if (sortedIngredients.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun ingrédient</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with servings control */}
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>
          Ingrédients ({sortedIngredients.length})
        </Text>
        
        {onServingsChange && (
          <View style={styles.servingsControl}>
            <Text style={styles.servingsLabel}>Pour</Text>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => handleServingsChange(false)}
            >
              <Text style={styles.servingsButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.servingsText}>{currentServings}</Text>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => handleServingsChange(true)}
            >
              <Text style={styles.servingsButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.servingsLabel}>
              {currentServings > 1 ? 'personnes' : 'personne'}
            </Text>
          </View>
        )}
      </View>

      {/* Progress indicator for interactive mode */}
      {interactive && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Ingrédients préparés: {checkedIngredients.size}/{ingredients.length}
          </Text>
          {checkedIngredients.size > 0 && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setCheckedIngredients(new Set())}
            >
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Ingredients List */}
      <FlatList
        data={sortedIngredients}
        renderItem={renderIngredient}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Shopping List Export (placeholder) */}
      {interactive && (
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => Alert.alert('Liste de courses', 'Fonctionnalité bientôt disponible')}
        >
          <Text style={styles.exportButtonText}>
            📋 Créer une liste de courses
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  servingsLabel: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },

  servingsButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },

  servingsButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.bold,
  },

  servingsText: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },

  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
  },

  progressText: {
    ...typography.styles.small,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },

  resetButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.textLight,
    borderRadius: spacing.borderRadius.sm,
  },

  resetButtonText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.medium,
  },

  listContainer: {
    paddingVertical: spacing.xs,
  },

  ingredientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  checkedIngredient: {
    backgroundColor: colors.backgroundLight,
    opacity: 0.7,
  },

  optionalIngredient: {
    borderStyle: 'dashed',
  },

  nonInteractive: {
    borderColor: 'transparent',
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  checkedCheckbox: {
    backgroundColor: colors.primary,
  },

  checkmark: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },

  ingredientInfo: {
    flex: 1,
  },

  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },

  ingredientName: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },

  checkedIngredientName: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },

  optionalText: {
    ...typography.styles.small,
    color: colors.textLight,
    fontStyle: 'italic',
  },

  quantityText: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  checkedQuantityText: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },

  usageStatsText: {
    ...typography.styles.small,
    color: colors.textLight,
    marginBottom: 2,
  },

  ingredientCategory: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  separator: {
    height: spacing.xs,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  emptyText: {
    ...typography.styles.body,
    color: colors.textLight,
    textAlign: 'center',
  },

  exportButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },

  exportButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
});