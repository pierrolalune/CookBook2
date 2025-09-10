import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography } from '../../styles';
import { CategoryCard } from './CategoryCard';
import { Ingredient, IngredientCategory } from '../../types';

interface CategoryData {
  key: IngredientCategory | 'seasonal' | 'myproduct' | 'favoris';
  icon: string;
  name: string;
  count: number;
  isSpecial?: boolean;
}

interface CategoryGridProps {
  ingredients: Ingredient[];
  favoriteIds: string[];
  seasonalIngredients: Ingredient[];
  userCreatedIngredients: Ingredient[];
  onCategoryPress: (categoryKey: string, categoryName: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  ingredients,
  favoriteIds,
  seasonalIngredients,
  userCreatedIngredients,
  onCategoryPress,
}) => {
  // Count ingredients by category
  const getCategoryCount = (categoryKey: IngredientCategory | 'seasonal' | 'myproduct') => {
    switch (categoryKey) {
      case 'seasonal':
        return seasonalIngredients.length;
      case 'myproduct':
        return userCreatedIngredients.length;
      default:
        return ingredients.filter(ing => ing.category === categoryKey).length;
    }
  };

  const categories: CategoryData[] = [
    {
      key: 'seasonal',
      icon: '🌿',
      name: 'Produits de saison',
      count: getCategoryCount('seasonal'),
      isSpecial: true,
    },
    {
      key: 'favoris',
      icon: '❤️',
      name: 'Favoris',
      count: favoriteIds.length,
      isSpecial: true,
    },
    {
      key: 'fruits',
      icon: '🍎',
      name: 'Fruits',
      count: getCategoryCount('fruits'),
    },
    {
      key: 'legumes',
      icon: '🥬',
      name: 'Légumes',
      count: getCategoryCount('legumes'),
    },
    {
      key: 'peche',
      icon: '🐟',
      name: 'Poisson',
      count: getCategoryCount('peche'),
    },
    {
      key: 'viande',
      icon: '🥩',
      name: 'Viande',
      count: getCategoryCount('viande'),
    },
    {
      key: 'produits_laitiers',
      icon: '🥛',
      name: 'Produits laitiers',
      count: getCategoryCount('produits_laitiers'),
    },
    {
      key: 'epicerie',
      icon: '🛒',
      name: 'Épicerie',
      count: getCategoryCount('epicerie'),
    },
    {
      key: 'myproduct',
      icon: '⭐',
      name: 'Mes produits',
      count: getCategoryCount('myproduct'),
    },
  ];

  const renderCategoryPair = (startIndex: number) => {
    const firstCategory = categories[startIndex];
    const secondCategory = categories[startIndex + 1];

    return (
      <View key={startIndex} style={styles.row}>
        <View style={styles.cardContainer}>
          <CategoryCard
            icon={firstCategory.icon}
            name={firstCategory.name}
            count={firstCategory.count}
            onPress={() => onCategoryPress(firstCategory.key, firstCategory.name)}
            isSpecial={firstCategory.isSpecial}
          />
        </View>
        {secondCategory && (
          <View style={styles.cardContainer}>
            <CategoryCard
              icon={secondCategory.icon}
              name={secondCategory.name}
              count={secondCategory.count}
              onPress={() => onCategoryPress(secondCategory.key, secondCategory.name)}
              isSpecial={secondCategory.isSpecial}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Catégories</Text>
        <View style={styles.grid}>
          {Array.from({ length: Math.ceil(categories.length / 2) }, (_, index) =>
            renderCategoryPair(index * 2)
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.xl,
    paddingBottom: 120, // Space for bottom navigation
  },

  sectionTitle: {
    ...typography.styles.h3,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },

  grid: {
    gap: spacing.md,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  cardContainer: {
    flex: 1,
  },
});