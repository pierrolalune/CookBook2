import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
    <View style={[
      styles.compactIngredientContainer,
      isChecked && styles.checkedIngredient,
      ingredient.optional && styles.optionalIngredient
    ]}>
      {/* Checkbox (for interactive mode) */}
      {interactive && (
        <TouchableOpacity
          style={[
            styles.compactCheckbox,
            isChecked && styles.checkedCheckbox
          ]}
          onPress={handleToggleCheck}
        >
          {isChecked && (
            <Text style={styles.compactCheckmark}>✓</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Compact Ingredient Info */}
      <View style={styles.compactIngredientInfo}>
        <Text style={[
          styles.compactIngredientName,
          isChecked && styles.checkedIngredientName
        ]}>
          {ingredient.ingredient.name}
          {ingredient.optional && <Text style={styles.compactOptionalText}> (opt.)</Text>}
        </Text>
        
        <Text style={[
          styles.compactQuantityText,
          isChecked && styles.checkedQuantityText
        ]}>
          {formatQuantity(adjustedQuantity)} {ingredient.unit}
        </Text>
      </View>
    </View>
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
      {/* Compact servings control - only show if editable */}
      {onServingsChange && (
        <View style={styles.compactServingsControl}>
          <Text style={styles.compactServingsLabel}>Pour</Text>
          <TouchableOpacity
            style={styles.compactServingsButton}
            onPress={() => handleServingsChange(false)}
          >
            <Text style={styles.compactServingsButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.compactServingsText}>{currentServings}</Text>
          <TouchableOpacity
            style={styles.compactServingsButton}
            onPress={() => handleServingsChange(true)}
          >
            <Text style={styles.compactServingsButtonText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.compactServingsLabel}>
            {currentServings > 1 ? 'pers.' : 'pers.'}
          </Text>
        </View>
      )}

      {/* Compact Ingredients List */}
      <View style={styles.compactListContainer}>
        {sortedIngredients.map((item, index) => (
          <View key={item.id}>
            {renderIngredient({ item, index })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Compact servings control
  compactServingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },

  compactServingsLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },

  compactServingsButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },

  compactServingsButtonText: {
    fontSize: 12,
    color: colors.textWhite,
    fontWeight: typography.weights.bold,
    lineHeight: 12,
  },

  compactServingsText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    minWidth: 16,
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

  compactListContainer: {
    paddingVertical: 2,
  },

  // Compact ingredient styles
  compactIngredientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.background,
    borderRadius: 6,
    marginBottom: 2,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
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

  // Compact checkbox styles
  compactCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  checkedCheckbox: {
    backgroundColor: colors.primary,
  },

  compactCheckmark: {
    color: colors.textWhite,
    fontSize: 8,
    fontWeight: typography.weights.bold,
    lineHeight: 8,
  },

  // Compact ingredient info
  compactIngredientInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  compactIngredientName: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
    lineHeight: 16,
  },

  checkedIngredientName: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },

  compactOptionalText: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
  },

  compactQuantityText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    lineHeight: 14,
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