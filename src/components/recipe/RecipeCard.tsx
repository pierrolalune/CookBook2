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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, RecipeCategory, RecipeDifficulty } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';
import { useRecipeFavorites } from '../../hooks/useRecipeFavorites';

interface RecipeCardProps {
  recipe: Recipe;
  onPress?: (recipe: Recipe) => void;
  onLongPress?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  showUsageStats?: boolean;
  compact?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onFavoriteChange?: (recipeId: string, isFavorite: boolean) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onLongPress,
  onEdit,
  onDelete,
  showUsageStats = true,
  compact = false,
  selectionMode = false,
  selected = false,
  onFavoriteChange
}) => {
  const { actions: favoriteActions } = useRecipeFavorites({ onFavoriteChange });
  const [heartScale] = React.useState(new Animated.Value(1));
  const [cardScale] = React.useState(new Animated.Value(1));

  const handlePress = () => {
    // Subtle press animation
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
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

  const handleEditPress = () => {
    onEdit?.(recipe);
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Supprimer la recette',
      `Êtes-vous sûr de vouloir supprimer "${recipe.name}" ? Cette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete?.(recipe)
        }
      ]
    );
  };

  const getCategoryBadge = () => {
    const categoryConfig = {
      entree: {
        text: '🥗 Entrée',
        color: '#2ecc71' // Green like mockup
      },
      plats: {
        text: '🍽️ Plat',
        color: '#3498db' // Blue like mockup
      },
      dessert: {
        text: '🍰 Dessert',
        color: '#e91e63' // Pink like mockup
      }
    };

    const config = categoryConfig[recipe.category];
    
    return (
      <View style={[styles.categoryTag, { backgroundColor: config.color }]}>
        <Text style={styles.tagText}>{config.text}</Text>
      </View>
    );
  };

  const getDifficultyBadge = () => {
    if (!recipe.difficulty) return null;

    const difficultyConfig = {
      facile: {
        text: '⭐ Facile',
        color: '#f39c12' // Orange like mockup
      },
      moyen: {
        text: '⭐⭐ Moyen',
        color: '#ff9800' // Yellow/Orange like mockup
      },
      difficile: {
        text: '⭐⭐⭐ Difficile',
        color: '#e74c3c' // Red like mockup
      }
    };

    const config = difficultyConfig[recipe.difficulty];
    
    return (
      <View style={[styles.difficultyTag, { backgroundColor: config.color }]}>
        <Text style={styles.tagText}>{config.text}</Text>
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
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        style={[cardStyle, selectionMode && styles.selectionCard, selected && styles.selectedCard]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.9} // Reduced for more subtle effect
      >
      {/* Gradient Accent Stripe */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientAccent}
      />
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
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Favorite Heart */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.Text
                style={[
                  styles.actionIcon,
                  { transform: [{ scale: heartScale }] }
                ]}
              >
                {recipe.isFavorite ? '❤️' : '🤍'}
              </Animated.Text>
            </TouchableOpacity>

            {/* Edit Button */}
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleEditPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
            )}

            {/* Delete Button */}
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDeletePress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.actionIcon}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {recipe.description && !compact && (
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        {/* Recipe Metadata - Improved Layout */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataRow}>
            {/* Time Info */}
            {getTotalTime() > 0 && (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataIcon}>⏱️</Text>
                <Text style={styles.metadataText}>{formatTime(getTotalTime())}</Text>
              </View>
            )}

            {/* Servings */}
            {recipe.servings && (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataIcon}>👥</Text>
                <Text style={styles.metadataText}>{recipe.servings} pers.</Text>
              </View>
            )}

            {/* Ingredient Count */}
            <View style={styles.metadataItem}>
              <Text style={styles.metadataIcon}>🥗</Text>
              <Text style={styles.metadataText}>{recipe.ingredients.length} ingrédients</Text>
            </View>
          </View>

          {/* Tags Row */}
          <View style={styles.tagsContainer}>
            {getCategoryBadge()}
            {getDifficultyBadge()}
          </View>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 20, // Increased from default lg
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...colors.shadow.medium, // Enhanced shadow
  },

  gradientAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 1,
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
    padding: 20, // Increased padding like mockup
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },

  name: {
    fontSize: 18, // Increased from h3
    fontWeight: typography.weights.bold, // Increased weight
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },

  description: {
    fontSize: 14,
    color: '#7f8c8d', // More muted gray like mockup
    marginBottom: spacing.md,
    lineHeight: 19.6, // 1.4 line height
  },

  // New metadata styling
  metadataContainer: {
    marginTop: spacing.sm,
  },

  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 20, // Consistent spacing like mockup
  },

  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  metadataIcon: {
    fontSize: 14,
  },

  metadataText: {
    fontSize: 14,
    color: '#7f8c8d', // Matching description color
  },

  // New tags styling (matching mockup)
  tagsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15, // More rounded like mockup
  },

  difficultyTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15, // More rounded like mockup
  },

  tagText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textWhite,
  },

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  actionButton: {
    padding: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
  },

  actionIcon: {
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