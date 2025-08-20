import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { IngredientCategory } from '../../types';
import { colors, spacing, typography } from '../../styles';

export type FilterCategory = IngredientCategory | 'all' | 'favoris' | 'myproduct' | 'saison';

interface CategoryChip {
  id: FilterCategory;
  label: string;
  icon: string;
  color?: string;
}

interface CategoryChipsProps {
  selectedCategory: FilterCategory;
  onCategorySelect: (category: FilterCategory) => void;
  favoriteCount?: number;
  userIngredientCount?: number;
  seasonalCount?: number;
  style?: any;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategory,
  onCategorySelect,
  favoriteCount = 0,
  userIngredientCount = 0,
  seasonalCount = 0,
  style
}) => {
  const categories: CategoryChip[] = [
    { id: 'all', label: 'Tous', icon: '📋' },
    { id: 'favoris', label: `❤️ Favoris${favoriteCount > 0 ? ` (${favoriteCount})` : ''}`, icon: '❤️', color: colors.favorite },
    { id: 'fruits', label: 'Fruits', icon: '🍎' },
    { id: 'legumes', label: 'Légumes', icon: '🥬' },
    { id: 'peche', label: 'Poisson', icon: '🐟' },
    { id: 'viande', label: 'Viande', icon: '🥩' },
    { id: 'epicerie', label: 'Épicerie', icon: '🛒' },
    { id: 'saison', label: `🌿 Saison${seasonalCount > 0 ? ` (${seasonalCount})` : ''}`, icon: '🌿' },
    { id: 'myproduct', label: `⭐ Mes produits${userIngredientCount > 0 ? ` (${userIngredientCount})` : ''}`, icon: '⭐' },
  ];

  const getChipStyle = (category: CategoryChip) => {
    const isSelected = selectedCategory === category.id;
    const isSpecial = ['favoris', 'myproduct'].includes(category.id);
    
    if (isSelected) {
      if (category.id === 'favoris') {
        return [styles.chip, styles.chipSelected, styles.favoritesChipSelected];
      }
      return [styles.chip, styles.chipSelected];
    }
    
    if (isSpecial) {
      return [styles.chip, styles.specialChip];
    }
    
    return [styles.chip];
  };

  const getTextStyle = (category: CategoryChip) => {
    const isSelected = selectedCategory === category.id;
    
    if (isSelected) {
      return [styles.chipText, styles.chipTextSelected];
    }
    
    return [styles.chipText];
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={getChipStyle(category)}
            onPress={() => onCategorySelect(category.id)}
            activeOpacity={0.7}
          >
            <Text style={getTextStyle(category)}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.backgroundDark,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  specialChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  
  favoritesChipSelected: {
    backgroundColor: colors.favorite,
    borderColor: colors.favorite,
  },
  
  chipText: {
    ...typography.styles.small,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  chipTextSelected: {
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
});