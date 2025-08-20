import React, { useState, useRef, useEffect } from 'react';
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

interface CategorySectionProps {
  title: string;
  icon: string;
  ingredients: Ingredient[];
  onIngredientPress?: (ingredient: Ingredient) => void;
  initiallyExpanded?: boolean;
  showCount?: boolean;
  headerStyle?: any;
  compact?: boolean;
  emptyMessage?: string;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  icon,
  ingredients,
  onIngredientPress,
  initiallyExpanded = true,
  showCount = true,
  headerStyle,
  compact = false,
  emptyMessage = 'Aucun ingrédient dans cette catégorie'
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const rotationAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  const toggleExpanded = () => {
    const willExpand = !isExpanded;

    // Configure layout animation
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });

    setIsExpanded(willExpand);

    // Animate the chevron rotation
    Animated.timing(rotationAnim, {
      toValue: willExpand ? 1 : 0,
      duration: 300,
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
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    return ingredients.map((ingredient) => (
      <IngredientCard
        key={ingredient.id}
        ingredient={ingredient}
        onPress={onIngredientPress}
        compact={compact}
        showSeasonalBadge={true}
      />
    ));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={[styles.header, headerStyle]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>{icon}</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        <View style={styles.headerRight}>
          {showCount && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{ingredients.length}</Text>
            </View>
          )}

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
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.cardPadding,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerIcon: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.sm,
  },

  headerTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.sm,
    minWidth: 24,
    alignItems: 'center',
  },

  countText: {
    ...typography.styles.small,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },

  chevronContainer: {
    padding: spacing.xs,
  },

  chevron: {
    fontSize: 12,
    color: colors.textLight,
  },

  content: {
    padding: spacing.cardPadding,
    paddingTop: 0,
  },

  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },

  emptyText: {
    ...typography.styles.caption,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
