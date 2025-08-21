import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { IngredientCategory } from '../../types';
import { colors, spacing, typography } from '../../styles';

export type FilterCategory = IngredientCategory | 'all' | 'favoris' | 'myproduct' | 'saison';

interface CategoryChip<T = FilterCategory> {
  id: T;
  label: string;
  icon: string;
  color?: string;
}

interface CategoryChipsProps<T = FilterCategory> {
  selectedCategory?: T;
  onCategorySelect?: (category: T) => void;
  favoriteCount?: number;
  userIngredientCount?: number;
  seasonalCount?: number;
  style?: any;
  categories?: CategoryChip<T>[];
  loading?: boolean;
}

export const CategoryChips = <T = FilterCategory,>({
  selectedCategory,
  onCategorySelect,
  favoriteCount = 0,
  userIngredientCount = 0,
  seasonalCount = 0,
  style,
  categories: externalCategories,
  loading = false
}: CategoryChipsProps<T>) => {
  const defaultCategories: CategoryChip[] = [
    { id: 'all', label: 'Tous', icon: '📋' },
    { id: 'favoris', label: `Favoris${favoriteCount > 0 ? ` (${favoriteCount})` : ''}`, icon: '❤️', color: colors.favorite },
    { id: 'fruits', label: 'Fruits', icon: '🍎' },
    { id: 'legumes', label: 'Légumes', icon: '🥬' },
    { id: 'peche', label: 'Poisson', icon: '🐟' },
    { id: 'viande', label: 'Viande', icon: '🥩' },
    { id: 'epicerie', label: 'Épicerie', icon: '🛒' },
    { id: 'saison', label: `Saison${seasonalCount > 0 ? ` (${seasonalCount})` : ''}`, icon: '🌿' },
    { id: 'myproduct', label: `Mes produits${userIngredientCount > 0 ? ` (${userIngredientCount})` : ''}`, icon: '⭐' },
  ];

  const categories = externalCategories || defaultCategories as CategoryChip<T>[];

  const getChipStyle = (category: CategoryChip<T>) => {
    const isSelected = selectedCategory === category.id;
    const categoryIdStr = String(category.id);
    const isSpecial = ['favoris', 'myproduct'].includes(categoryIdStr);
    const isWide = ['all', 'favoris'].includes(categoryIdStr);
    
    const baseStyles: any[] = [styles.chip];
    
    if (isWide) {
      baseStyles.push(styles.chipWide);
    }
    
    if (isSelected) {
      baseStyles.push(styles.chipSelected);
      if (categoryIdStr === 'favoris') {
        baseStyles.push(styles.favoritesChipSelected);
      }
    } else if (categoryIdStr === 'all') {
      baseStyles.push(styles.allChip);
    } else if (categoryIdStr === 'favoris') {
      baseStyles.push(styles.favoritesChip);
    } else if (isSpecial) {
      baseStyles.push(styles.specialChip);
    }
    
    return baseStyles;
  };

  const getTextStyle = (category: CategoryChip<T>) => {
    const isSelected = selectedCategory === category.id;
    
    if (isSelected) {
      return [styles.chipText, styles.chipTextSelected];
    }
    
    return [styles.chipText];
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.gridContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={String(category.id)}
            style={getChipStyle(category)}
            onPress={() => onCategorySelect?.(category.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>{category.icon}</Text>
            <Text style={getTextStyle(category)}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.backgroundDark,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 32,
    gap: 4,
    width: '23.5%', // 4 columns with gap
  },
  
  chipWide: {
    width: '48.5%', // 2 columns with gap
  },
  
  allChip: {
    backgroundColor: '#333',
  },
  
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  specialChip: {
    backgroundColor: colors.backgroundDark,
  },
  
  favoritesChip: {
    backgroundColor: colors.favoriteLight,
  },
  
  favoritesChipSelected: {
    backgroundColor: colors.favorite,
    borderColor: colors.favorite,
  },
  
  chipIcon: {
    fontSize: 12,
  },
  
  chipText: {
    ...typography.styles.small,
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  chipTextSelected: {
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
});