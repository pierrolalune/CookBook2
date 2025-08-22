import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, RecipeCategory, RecipeDifficulty } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';
import { useRecipeFavorites } from '../../hooks/useRecipeFavorites';

interface RecipeCardProps {
  recipe: Recipe;
  onPress?: (recipe: Recipe) => void;
  onLongPress?: (recipe: Recipe) => void;
  showUsageStats?: boolean;
  compact?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onFavoriteChange?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onLongPress,
  showUsageStats = true,
  compact = false,
  selectionMode = false,
  selected = false,
  onFavoriteChange
}) => {
  const { actions: favoriteActions } = useRecipeFavorites({ onFavoriteChange });
  const [heartScale] = React.useState(new Animated.Value(1));

  const handlePress = () => {
    onPress?.(recipe);
  };

  const handleLongPress = () => {
    onLongPress?.(recipe);
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
      await favoriteActions.toggleFavorite(recipe.id);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const getCategoryBadge = () => {
    const categoryConfig = {
      entree: {
        text: '🥗 Entrée',
        color: colors.success
      },
      plats: {
        text: '🍽️ Plat',
        color: colors.primary
      },
      dessert: {
        text: '🍰 Dessert',
        color: colors.accent
      }
    };

    const config = categoryConfig[recipe.category];
    
    return (
      <View style={[styles.badge, { backgroundColor: config.color }]}>
        <Text style={styles.badgeText}>{config.text}</Text>
      </View>
    );
  };

  const getDifficultyBadge = () => {
    if (!recipe.difficulty) return null;

    const difficultyConfig = {
      facile: {
        text: '⭐ Facile',
        color: colors.success
      },
      moyen: {
        text: '⭐⭐ Moyen',
        color: colors.warning
      },
      difficile: {
        text: '⭐⭐⭐ Difficile',
        color: colors.error
      }
    };

    const config = difficultyConfig[recipe.difficulty];
    
    return (
      <View style={[styles.badge, styles.difficultyBadge, { backgroundColor: config.color }]}>
        <Text style={styles.badgeText}>{config.text}</Text>
      </View>
    );
  };

  const getTotalTime = () => {
    const prepTime = recipe.prepTime || 0;
    const cookTime = recipe.cookTime || 0;
    return prepTime + cookTime;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
  };

  const cardStyle = compact ? styles.compactCard : styles.card;

  return (
    <TouchableOpacity
      style={[cardStyle, selectionMode && styles.selectionCard, selected && styles.selectedCard]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <View style={styles.selectionCheckbox}>
          <View style={[
            styles.checkbox,
            selected && styles.checkedCheckbox
          ]}>
            {selected && (
              <Ionicons name="checkmark" size={16} color={colors.textWhite} />
            )}
          </View>
        </View>
      )}

      {/* Recipe Photo */}
      {recipe.photoUri && (
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: recipe.photoUri }} 
            style={styles.photo}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Recipe Info */}
      <View style={styles.infoContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.name} numberOfLines={2}>
            {recipe.name}
          </Text>
          
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
              {recipe.isFavorite ? '❤️' : '🤍'}
            </Animated.Text>
          </TouchableOpacity>
        </View>

        {recipe.description && !compact && (
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        {/* Recipe Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailsRow}>
            {/* Time Info */}
            {getTotalTime() > 0 && (
              <Text style={styles.timeText}>
                ⏱️ {formatTime(getTotalTime())}
              </Text>
            )}

            {/* Servings */}
            {recipe.servings && (
              <Text style={styles.servingsText}>
                👥 {recipe.servings} pers.
              </Text>
            )}

            {/* Ingredient Count */}
            <Text style={styles.ingredientCount}>
              🥘 {recipe.ingredients.length} ingrédients
            </Text>
          </View>

          {/* Badges Row */}
          <View style={styles.badgesContainer}>
            {getCategoryBadge()}
            {getDifficultyBadge()}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    ...commonStyles.card,
    marginBottom: spacing.cardMargin,
    overflow: 'hidden',
  },

  compactCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },

  photoContainer: {
    height: 120,
    backgroundColor: colors.backgroundLight,
  },

  photo: {
    width: '100%',
    height: '100%',
  },

  infoContainer: {
    padding: spacing.md,
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },

  name: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },

  description: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },

  detailsContainer: {
    marginTop: spacing.sm,
  },

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },

  timeText: {
    ...typography.styles.small,
    color: colors.textLight,
    marginRight: spacing.md,
  },

  servingsText: {
    ...typography.styles.small,
    color: colors.textLight,
    marginRight: spacing.md,
  },

  ingredientCount: {
    ...typography.styles.small,
    color: colors.textLight,
  },

  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  badge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },

  difficultyBadge: {
    // Additional styling for difficulty badge if needed
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
    fontSize: 18,
  },

  // Selection mode styles
  selectionCard: {
    borderWidth: 2,
    borderColor: colors.border,
  },

  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  selectionCheckbox: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkedCheckbox: {
    backgroundColor: colors.primary,
  },
});