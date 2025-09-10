import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../styles';
import { IngredientCategory } from '../../types';

interface CategoryOption {
  id: IngredientCategory;
  name: string;
  icon: string;
}

interface CategorySelectorProps {
  label: string;
  required?: boolean;
  categories: CategoryOption[];
  selectedCategory: IngredientCategory;
  onSelect: (category: IngredientCategory) => void;
  containerStyle?: any;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  label,
  required = false,
  categories,
  selectedCategory,
  onSelect,
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      <View style={styles.categoriesGrid}>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
            onPress={() => onSelect(category.id)}
          />
        ))}
      </View>
    </View>
  );
};

interface CategoryCardProps {
  category: CategoryOption;
  isSelected: boolean;
  onPress: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  isSelected,
  onPress,
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  if (isSelected) {
    return (
      <Animated.View
        style={[
          styles.categoryCard,
          { 
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.selectedCard}
          >
            <Text style={styles.selectedIcon}>{category.icon}</Text>
            <Text style={styles.selectedText}>{category.name}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.categoryCard,
        { 
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.unselectedCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <Text style={styles.unselectedIcon}>{category.icon}</Text>
        <Text style={styles.unselectedText}>{category.name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },

  labelContainer: {
    marginBottom: spacing.sm,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },

  required: {
    color: '#e74c3c',
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  categoryCard: {
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
  },

  selectedCard: {
    padding: 16,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },

  unselectedCard: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e8ecf1',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },

  selectedIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },

  unselectedIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },

  selectedText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
  },

  unselectedText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
});