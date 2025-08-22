import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { Ingredient } from '../../types';
import { SeasonalUtils } from '../../utils/seasonalUtils';

interface IngredientSelectorProps {
  ingredients: Ingredient[];
  selectedIds: string[];
  onToggleIngredient: (ingredientId: string) => void;
  showSeasonalBadges?: boolean;
  showCategories?: boolean;
}

interface GroupedIngredients {
  [category: string]: Ingredient[];
}

interface IngredientItemProps {
  ingredient: Ingredient;
  isSelected: boolean;
  onToggle: (ingredientId: string) => void;
  showSeasonalBadge?: boolean;
}

const IngredientItem: React.FC<IngredientItemProps> = ({
  ingredient,
  isSelected,
  onToggle,
  showSeasonalBadge = false
}) => {
  const isInSeason = showSeasonalBadge && SeasonalUtils.isIngredientInSeason(ingredient);
  const isPeakSeason = showSeasonalBadge && ingredient.seasonal?.peak_months?.includes(SeasonalUtils.getCurrentMonth());

  return (
    <TouchableOpacity
      style={[
        styles.ingredientItem,
        isSelected && styles.ingredientItemSelected
      ]}
      onPress={() => onToggle(ingredient.id)}
      activeOpacity={0.7}
    >
      <View style={styles.ingredientContent}>
        <View style={styles.ingredientInfo}>
          <Text style={[
            styles.ingredientName,
            isSelected && styles.ingredientNameSelected
          ]}>
            {ingredient.name}
          </Text>
          
          <Text style={styles.ingredientCategory}>
            {ingredient.subcategory}
          </Text>
          
          {showSeasonalBadge && (isInSeason || isPeakSeason) && (
            <View style={styles.seasonalBadges}>
              {isPeakSeason && (
                <View style={[styles.seasonalBadge, styles.peakSeasonBadge]}>
                  <Ionicons name="star" size={10} color={colors.warning} />
                  <Text style={styles.peakSeasonText}>Pleine saison</Text>
                </View>
              )}
              {isInSeason && !isPeakSeason && (
                <View style={[styles.seasonalBadge, styles.inSeasonBadge]}>
                  <Ionicons name="leaf" size={10} color={colors.success} />
                  <Text style={styles.inSeasonText}>Saison</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.ingredientActions}>
          {isSelected ? (
            <View style={styles.selectedIcon}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
          ) : (
            <View style={styles.unselectedIcon}>
              <Ionicons name="add-circle-outline" size={24} color={colors.textLight} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface CategorySectionProps {
  category: string;
  ingredients: Ingredient[];
  selectedIds: string[];
  onToggleIngredient: (ingredientId: string) => void;
  showSeasonalBadges?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (category: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  ingredients,
  selectedIds,
  onToggleIngredient,
  showSeasonalBadges,
  isCollapsed,
  onToggleCollapse
}) => {
  const selectedCount = ingredients.filter(ing => selectedIds.includes(ing.id)).length;
  const totalCount = ingredients.length;

  return (
    <View style={styles.categorySection}>
      <TouchableOpacity 
        style={styles.categoryHeader}
        onPress={() => onToggleCollapse(category)}
      >
        <View style={styles.categoryHeaderContent}>
          <Ionicons 
            name={isCollapsed ? "chevron-forward" : "chevron-down"} 
            size={20} 
            color={colors.textSecondary} 
          />
          <Text style={styles.categoryTitle}>{category}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {selectedCount}/{totalCount}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.categoryContent}>
          {ingredients.map(ingredient => (
            <IngredientItem
              key={ingredient.id}
              ingredient={ingredient}
              isSelected={selectedIds.includes(ingredient.id)}
              onToggle={onToggleIngredient}
              showSeasonalBadge={showSeasonalBadges}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  ingredients,
  selectedIds,
  onToggleIngredient,
  showSeasonalBadges = false,
  showCategories = true
}) => {
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(new Set());

  const groupedIngredients = useMemo<GroupedIngredients>(() => {
    return ingredients.reduce((acc, ingredient) => {
      if (!acc[ingredient.category]) {
        acc[ingredient.category] = [];
      }
      acc[ingredient.category].push(ingredient);
      return acc;
    }, {} as GroupedIngredients);
  }, [ingredients]);

  const handleToggleCollapse = React.useCallback((category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  if (!showCategories) {
    // Simple flat list without categories
    return (
      <FlatList
        data={ingredients}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <IngredientItem
            ingredient={item}
            isSelected={selectedIds.includes(item.id)}
            onToggle={onToggleIngredient}
            showSeasonalBadge={showSeasonalBadges}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContainer}
      />
    );
  }

  // Grouped by categories
  const categories = Object.keys(groupedIngredients).sort();

  return (
    <View style={styles.container}>
      {categories.map(category => (
        <CategorySection
          key={category}
          category={category}
          ingredients={groupedIngredients[category]}
          selectedIds={selectedIds}
          onToggleIngredient={onToggleIngredient}
          showSeasonalBadges={showSeasonalBadges}
          isCollapsed={collapsedCategories.has(category)}
          onToggleCollapse={handleToggleCollapse}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  
  flatListContainer: {
    gap: spacing.xs,
  },
  
  categorySection: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    overflow: 'hidden',
  },
  
  categoryHeader: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  categoryTitle: {
    ...typography.styles.h3,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: typography.weights.semibold,
  },
  
  categoryBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  
  categoryBadgeText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  
  categoryContent: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  
  ingredientItem: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.xs / 2,
  },
  
  ingredientItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  
  ingredientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  ingredientInfo: {
    flex: 1,
  },
  
  ingredientName: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs / 2,
  },
  
  ingredientNameSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  
  ingredientCategory: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  seasonalBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  
  seasonalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
    gap: 2,
  },
  
  peakSeasonBadge: {
    backgroundColor: colors.warningLight,
  },
  
  inSeasonBadge: {
    backgroundColor: colors.successLight,
  },
  
  peakSeasonText: {
    ...typography.styles.tiny,
    color: colors.warning,
    fontWeight: typography.weights.bold,
  },
  
  inSeasonText: {
    ...typography.styles.tiny,
    color: colors.success,
    fontWeight: typography.weights.medium,
  },
  
  ingredientActions: {
    marginLeft: spacing.md,
  },
  
  selectedIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  unselectedIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});