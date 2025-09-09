import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert
} from 'react-native';
import { Ingredient, IngredientCategory } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';
import { SeasonalUtils } from '../../utils/seasonalUtils';
import { useFavorites } from '../../hooks/useFavorites';
import { AddToShoppingListModal } from '../shoppingList/AddToShoppingListModal';

interface IngredientCardProps {
  ingredient: Ingredient;
  onPress?: (ingredient: Ingredient) => void;
  showSeasonalBadge?: boolean;
  compact?: boolean;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  onPress,
  showSeasonalBadge = true,
  compact = false
}) => {
  const { actions: favoriteActions } = useFavorites();
  const [heartScale] = React.useState(new Animated.Value(1));
  const [shoppingListModalVisible, setShoppingListModalVisible] = useState(false);

  const handlePress = () => {
    onPress?.(ingredient);
  };

  const handleFavoritePress = async () => {
    // Animate heart
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await favoriteActions.toggleFavorite(ingredient.id);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleAddToShoppingList = (e?: any) => {
    e?.stopPropagation(); // Prevent card onPress from firing
    setShoppingListModalVisible(true);
  };


  const getSeasonalBadge = () => {
    if (!showSeasonalBadge || !ingredient.seasonal) return null;

    const status = SeasonalUtils.getDetailedSeasonStatus(ingredient);
    if (status === 'year-round' || status === 'out-of-season') return null;

    const badgeConfig = {
      'beginning-of-season': {
        text: '🌱 Début',
        color: colors.beginningOfSeason
      },
      'peak-season': {
        text: '🔥 Pic',
        color: colors.peakSeason
      },
      'end-of-season': {
        text: '🍂 Fin',
        color: colors.endOfSeason
      },
      'in-season': {
        text: '✓ Saison',
        color: colors.inSeason
      },
    };

    const config = badgeConfig[status as keyof typeof badgeConfig];
    if (!config) return null;

    return (
      <View style={[styles.badge, { backgroundColor: config.color }]}>
        <Text style={styles.badgeText}>{config.text}</Text>
      </View>
    );
  };

  const cardStyle = compact ? styles.compactCard : styles.card;

  return (
    <TouchableOpacity
      style={[cardStyle, ingredient.isFavorite && styles.favoriteCard]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Ingredient Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {ingredient.name}
        </Text>
        <Text style={styles.details} numberOfLines={1}>
          {ingredient.subcategory}
          {ingredient.isUserCreated && ' • Personnel'}
        </Text>
        {ingredient.description && !compact && (
          <Text style={styles.description} numberOfLines={1}>
            {ingredient.description}
          </Text>
        )}
      </View>

      {/* Right side elements */}
      <View style={styles.rightContainer}>
        {/* Seasonal Badge */}
        {getSeasonalBadge()}

        {/* User Created Badge */}
        {ingredient.isUserCreated && (
          <View style={[styles.badge, styles.userBadge]}>
            <Text style={styles.badgeText}>Perso</Text>
          </View>
        )}

        {/* Shopping List Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleAddToShoppingList}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.favoriteIcon}>🛒</Text>
        </TouchableOpacity>

        {/* Favorite Heart */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.Text
            style={[
              styles.favoriteIcon,
              { transform: [{ scale: heartScale }] }
            ]}
          >
            {ingredient.isFavorite ? '❤️' : '🤍'}
          </Animated.Text>
        </TouchableOpacity>
      </View>

      {/* Add to Shopping List Modal */}
      <AddToShoppingListModal
        visible={shoppingListModalVisible}
        onClose={() => setShoppingListModalVisible(false)}
        ingredient={ingredient}
        mode="ingredient"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.cardMargin,
    minHeight: 70,
  },

  compactCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginBottom: spacing.xs,
    minHeight: 50,
  },

  favoriteCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.favorite,
  },

  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },

  name: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },

  details: {
    ...typography.styles.small,
    color: colors.textLight,
  },

  description: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  badge: {
    backgroundColor: colors.success,
    borderRadius: spacing.borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },

  userBadge: {
    backgroundColor: colors.primary,
  },

  badgeText: {
    ...typography.styles.small,
    fontWeight: typography.weights.semibold,
    color: colors.textWhite,
    fontSize: 11,
  },

  favoriteButton: {
    padding: spacing.xs,
  },

  favoriteIcon: {
    fontSize: 16,
  },
});
