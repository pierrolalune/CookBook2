import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { Ingredient } from '../../types';
import { colors, spacing, typography } from '../../styles';
import { IngredientCard } from './IngredientCard';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SubCategorySectionProps {
  title: string;
  ingredients: Ingredient[];
  onIngredientPress?: (ingredient: Ingredient) => void;
  initiallyExpanded?: boolean;
}

export const SubCategorySection: React.FC<SubCategorySectionProps> = ({
  title,
  ingredients,
  onIngredientPress,
  initiallyExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const rotationAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  const toggleExpanded = () => {
    const willExpand = !isExpanded;

    // Configure layout animation
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });

    setIsExpanded(willExpand);

    // Animate the chevron rotation
    Animated.timing(rotationAnim, {
      toValue: willExpand ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const chevronRotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  const renderIngredientList = () => {
    if (ingredients.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun ingrédient dans cette sous-catégorie</Text>
        </View>
      );
    }

    return ingredients.map((ingredient) => (
      <IngredientCard
        key={ingredient.id}
        ingredient={ingredient}
        onPress={onIngredientPress}
        compact={true}
        showSeasonalBadge={true}
      />
    ));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.bulletPoint} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{ingredients.length}</Text>
          </View>

          <Animated.View style={[
            styles.chevronContainer,
            { transform: [{ rotate: chevronRotation }] }
          ]}>
            <Text style={styles.chevron}>▼</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <ErrorBoundary>
          <View style={styles.content}>
            {renderIngredientList()}
          </View>
        </ErrorBoundary>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    marginLeft: spacing.lg,
    marginRight: spacing.xs,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundLight,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
    opacity: 0.8,
  },

  headerTitle: {
    ...typography.styles.body,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    flex: 1,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.sm,
    minWidth: 22,
    alignItems: 'center',
  },

  countText: {
    ...typography.styles.small,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textWhite,
  },

  chevronContainer: {
    padding: spacing.xs,
  },

  chevron: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },

  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },

  emptyText: {
    ...typography.styles.small,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});