import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { colors, spacing, typography } from '../../styles';
import { Ingredient } from '../../types';
import { SeasonalUtils } from '../../utils/seasonalUtils';

interface FilterChip {
  id: string;
  label: string;
}

interface IngredientListViewProps {
  ingredients: Ingredient[];
  favoriteIds: string[];
  onIngredientPress?: (ingredient: Ingredient) => void;
  onFavoritePress?: (ingredient: Ingredient) => void;
  onAddToCartPress?: (ingredient: Ingredient) => void;
  searchQuery?: string;
  filters?: FilterChip[];
  activeFilterId?: string;
  onFilterChange?: (filterId: string) => void;
}

export const IngredientListView: React.FC<IngredientListViewProps> = ({
  ingredients,
  favoriteIds,
  onIngredientPress,
  onFavoritePress,
  onAddToCartPress,
  searchQuery = '',
  filters = [],
  activeFilterId = 'all',
  onFilterChange,
}) => {
  const [animatedValues] = useState(() => 
    ingredients.reduce((acc, ing) => ({
      ...acc,
      [ing.id]: new Animated.Value(1),
    }), {} as Record<string, Animated.Value>)
  );

  // Filter and search ingredients
  const filteredIngredients = ingredients.filter(ingredient => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        ingredient.name.toLowerCase().includes(searchLower) ||
        ingredient.subcategory.toLowerCase().includes(searchLower) ||
        ingredient.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (activeFilterId && activeFilterId !== 'all') {
      // Implement filter logic based on your needs
      // This is a placeholder - you'll need to implement based on your filter structure
      return true;
    }

    return true;
  });

  const handleIngredientPressIn = (ingredient: Ingredient) => {
    const animValue = animatedValues[ingredient.id];
    if (animValue) {
      Animated.spring(animValue, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleIngredientPressOut = (ingredient: Ingredient) => {
    const animValue = animatedValues[ingredient.id];
    if (animValue) {
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const getSeasonBadge = (ingredient: Ingredient) => {
    if (!ingredient.seasonal) return null;

    const seasonStatus = SeasonalUtils.getDetailedSeasonStatus(ingredient);
    if (seasonStatus === 'out-of-season' || seasonStatus === 'year-round') return null;

    let badgeStyle;
    let badgeText;

    switch (seasonStatus) {
      case 'peak-season':
        badgeStyle = styles.seasonBadgePic;
        badgeText = 'Pic';
        break;
      case 'beginning-of-season':
        badgeStyle = styles.seasonBadgeDebut;
        badgeText = 'Début';
        break;
      case 'end-of-season':
        badgeStyle = styles.seasonBadgeFin;
        badgeText = 'Fin';
        break;
      case 'in-season':
        return null; // Don't show badge for regular in-season
      default:
        return null;
    }

    return (
      <View style={[styles.seasonBadge, badgeStyle]}>
        <Text style={styles.seasonBadgeText}>{badgeText}</Text>
      </View>
    );
  };

  const renderFilterChips = () => {
    if (filters.length === 0) return null;

    return (
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                activeFilterId === filter.id && styles.filterChipActive
              ]}
              onPress={() => onFilterChange?.(filter.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                activeFilterId === filter.id && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderIngredientItem = (ingredient: Ingredient) => {
    const isFavorite = favoriteIds.includes(ingredient.id);
    const animValue = animatedValues[ingredient.id] || new Animated.Value(1);

    return (
      <Animated.View 
        key={ingredient.id}
        style={[
          styles.ingredientItem,
          { transform: [{ scale: animValue }] }
        ]}
      >
        <TouchableOpacity
          style={styles.ingredientContent}
          onPress={() => onIngredientPress?.(ingredient)}
          onPressIn={() => handleIngredientPressIn(ingredient)}
          onPressOut={() => handleIngredientPressOut(ingredient)}
          activeOpacity={0.9}
        >
          <View style={styles.ingredientLeft}>
            <View style={styles.ingredientInfo}>
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              <Text style={styles.ingredientCategory}>{ingredient.subcategory}</Text>
            </View>
          </View>

          <View style={styles.ingredientRight}>
            {getSeasonBadge(ingredient)}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cartButton}
                onPress={() => onAddToCartPress?.(ingredient)}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonIcon}>🛒</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  isFavorite && styles.favoriteButtonActive
                ]}
                onPress={() => onFavoritePress?.(ingredient)}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonIcon}>❤️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {renderFilterChips()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredIngredients.map(renderIngredientItem)}
        
        {filteredIngredients.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? `Aucun ingrédient trouvé pour "${searchQuery}"`
                : 'Aucun ingrédient dans cette catégorie'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  filterContainer: {
    paddingVertical: spacing.sm,
  },

  filterContent: {
    paddingHorizontal: spacing.lg,
  },

  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: '#f5f7fa',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  filterChipActive: {
    backgroundColor: colors.primary,
  },

  filterChipText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  filterChipTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120, // Space for bottom navigation
  },

  ingredientItem: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 15,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...colors.shadow.small,
  },

  ingredientContent: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ingredientLeft: {
    flex: 1,
  },

  ingredientInfo: {
    flex: 1,
  },

  ingredientName: {
    ...typography.styles.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3,
  },

  ingredientCategory: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  ingredientRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  seasonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 12,
  },

  seasonBadgeDebut: {
    backgroundColor: colors.seasonDebut,
  },

  seasonBadgePic: {
    backgroundColor: colors.seasonPic,
  },

  seasonBadgeFin: {
    backgroundColor: colors.seasonFin,
  },

  seasonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f7fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteButtonActive: {
    backgroundColor: colors.favorite,
  },

  buttonIcon: {
    fontSize: 16,
  },

  emptyState: {
    padding: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyStateText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});