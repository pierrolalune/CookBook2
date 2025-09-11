import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Animated
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Recipe } from '../types';
import { colors, spacing, typography } from '../styles';
import { useRecipes } from '../hooks/useRecipes';
import { useRecipeSharing } from '../hooks/useRecipeSharing';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { GradientHeader } from '../components/common/GradientHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { RecipeIngredientsSection } from '../components/recipe/RecipeIngredientsSection';
import { RecipeInstructionsList } from '../components/recipe/RecipeInstructionsList';
import { PhotoCarousel } from '../components/recipe/PhotoCarousel';
import { ShareModal } from '../components/recipe/ShareModal';
import { AddToShoppingListModal } from '../components/shoppingList/AddToShoppingListModal';

interface RecipeDetailScreenProps {
  recipeId?: string;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipeId: propRecipeId }) => {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = propRecipeId || routeId;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentServings, setCurrentServings] = useState(4);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shoppingListModalVisible, setShoppingListModalVisible] = useState(false);
  
  // Action pills for the header
  const actionPills = useMemo(() => [
    { id: 'shopping', label: 'Liste de courses', icon: '🛒' },
    { id: 'share', label: 'Partager', icon: '📤' },
    { id: 'actions', label: 'Actions', icon: '⋮' }
  ], []);

  const { actions: recipeActions } = useRecipes();
  const sharing = useRecipeSharing();

  useEffect(() => {
    loadRecipe();
  }, [id]);

  useEffect(() => {
    if (recipe) {
      setCurrentServings(recipe.servings || 4);
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [recipe, fadeAnim]);

  const loadRecipe = useCallback(async () => {
    if (!id) {
      setError('ID de recette manquant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const fetchedRecipe = await recipeActions.getRecipeById(id);
      if (fetchedRecipe) {
        setRecipe(fetchedRecipe);
        // Record usage
        await recipeActions.recordUsage(id);
      } else {
        setError('Recette non trouvée');
      }
    } catch (err) {
      setError('Erreur lors du chargement de la recette');
      console.error('Error loading recipe:', err);
    } finally {
      setLoading(false);
    }
  }, [id, recipeActions]);

  const handleEdit = useCallback(() => {
    if (!recipe) return;
    router.push({
      pathname: '/recipe/[id]/edit',
      params: { id: recipe.id }
    });
  }, [recipe]);

  const handleDuplicate = useCallback(async () => {
    if (!recipe) return;
    
    try {
      const duplicatedRecipe = await recipeActions.duplicateRecipe(
        recipe.id, 
        `${recipe.name} (Copie)`
      );
      
      Alert.alert(
        'Recette dupliquée',
        'La recette a été dupliquée avec succès.',
        [
          {
            text: 'Voir la copie',
            onPress: () => router.replace({
              pathname: '/recipe/[id]',
              params: { id: duplicatedRecipe.id }
            })
          },
          { text: 'Rester ici', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de dupliquer la recette');
    }
  }, [recipe, recipeActions]);

  const handleDelete = useCallback(async () => {
    if (!recipe) return;
    
    Alert.alert(
      'Supprimer la recette',
      `Êtes-vous sûr de vouloir supprimer "${recipe.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await recipeActions.deleteRecipe(recipe.id);
              Alert.alert('Succès', 'Recette supprimée', [
                { text: 'OK', onPress: () => router.replace('/recipes') }
              ]);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la recette');
            }
          }
        }
      ]
    );
  }, [recipe, recipeActions]);

  const handleShare = useCallback(() => {
    if (!recipe) return;
    setShareModalVisible(true);
  }, [recipe]);

  const handleAddToShoppingList = useCallback(() => {
    if (!recipe) return;
    setShoppingListModalVisible(true);
  }, [recipe]);
  
  const handleActionPill = useCallback((pillId: string) => {
    if (!recipe) return;
    
    switch (pillId) {
      case 'shopping':
        handleAddToShoppingList();
        break;
      case 'share':
        handleShare();
        break;
      case 'actions':
        Alert.alert(
          'Actions',
          'Que souhaitez-vous faire ?',
          [
            { text: 'Modifier', onPress: handleEdit },
            { text: 'Dupliquer', onPress: handleDuplicate },
            { text: 'Supprimer', style: 'destructive', onPress: handleDelete },
            { text: 'Annuler', style: 'cancel' }
          ]
        );
        break;
    }
  }, [recipe, handleAddToShoppingList, handleShare, handleEdit, handleDuplicate, handleDelete]);


  const handleServingsChange = useCallback((newServings: number) => {
    setCurrentServings(newServings);
  }, []);


  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
  };

  const getTotalTime = () => {
    if (!recipe) return null;
    const prepTime = recipe.prepTime || 0;
    const cookTime = recipe.cookTime || 0;
    return prepTime + cookTime;
  };

  const getDifficultyBadge = () => {
    if (!recipe?.difficulty) return null;
    
    const difficultyConfig = {
      facile: {
        text: '⭐ Facile',
        color: '#f39c12' // Orange
      },
      moyen: {
        text: '⭐⭐ Moyen', 
        color: '#ff9800' // Yellow/Orange
      },
      difficile: {
        text: '⭐⭐⭐ Difficile',
        color: '#e74c3c' // Red
      }
    };
    
    return difficultyConfig[recipe.difficulty];
  };

  const getCategoryBadge = () => {
    if (!recipe) return null;
    
    const categoryConfig = {
      entree: {
        text: '🥗 Entrée',
        color: '#2ecc71' // Green
      },
      plats: {
        text: '🍽️ Plat',
        color: '#3498db' // Blue
      },
      dessert: {
        text: '🍰 Dessert',
        color: '#e91e63' // Pink
      }
    };
    
    return categoryConfig[recipe.category];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement de la recette...</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRecipe}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenErrorBoundary>
      <View style={styles.container}>
        {/* Modern Gradient Header */}
        <GradientHeader
          title={recipe.name}
          showBackButton
          onBackPress={() => router.back()}
          pills={actionPills}
          onPillPress={handleActionPill}
        />

        <Animated.ScrollView 
          style={[styles.content, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Recipe Photos - Only show if photos exist */}
          {recipe.photoUri && (
            <View style={styles.photoSection}>
              <PhotoCarousel
                photos={[recipe.photoUri]}
                height={200}
                borderRadius={spacing.borderRadius.lg}
                showIndicators={true}
                editable={false}
              />
            </View>
          )}

          {/* Recipe Info Card */}
          <View style={styles.infoCard}>
            {/* Gradient Accent */}
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientAccent}
            />
            
            <View style={styles.cardContent}>
              {recipe.description && (
                <Text style={styles.recipeDescription}>{recipe.description}</Text>
              )}

              {/* Recipe Metadata */}
              <View style={styles.metadataContainer}>
                <View style={styles.metadataRow}>
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataIcon}>⏱️</Text>
                    <Text style={styles.metadataText}>
                      {getTotalTime() ? formatTime(getTotalTime()!) : 'Non spécifié'}
                    </Text>
                  </View>

                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataIcon}>👥</Text>
                    <Text style={styles.metadataText}>
                      {recipe.servings || currentServings} pers.
                    </Text>
                  </View>

                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataIcon}>🥗</Text>
                    <Text style={styles.metadataText}>
                      {recipe.ingredients.length} ingrédients
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tags Row */}
              <View style={styles.tagsContainer}>
                {getCategoryBadge() && (
                  <View style={[styles.tag, { backgroundColor: getCategoryBadge()!.color }]}>
                    <Text style={styles.tagText}>{getCategoryBadge()!.text}</Text>
                  </View>
                )}
                {getDifficultyBadge() && (
                  <View style={[styles.tag, { backgroundColor: getDifficultyBadge()!.color }]}>
                    <Text style={styles.tagText}>{getDifficultyBadge()!.text}</Text>
                  </View>
                )}
              </View>

              {/* Compact Time Pills */}
              {(recipe.prepTime || recipe.cookTime) && (
                <View style={styles.timePillsContainer}>
                  {recipe.prepTime && (
                    <View style={styles.timePill}>
                      <Text style={styles.timePillEmoji}>👨‍🍳</Text>
                      <Text style={styles.timePillValue}>{formatTime(recipe.prepTime)}</Text>
                    </View>
                  )}
                  {recipe.cookTime && (
                    <View style={styles.timePill}>
                      <Text style={styles.timePillEmoji}>🔥</Text>
                      <Text style={styles.timePillValue}>{formatTime(recipe.cookTime)}</Text>
                    </View>
                  )}
                  {getTotalTime() && (
                    <View style={[styles.timePill, styles.totalTimePill]}>
                      <Text style={styles.timePillEmoji}>⏱️</Text>
                      <Text style={styles.timePillValue}>{formatTime(getTotalTime()!)}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>


          {/* Ingredients Section Card */}
          <View style={styles.sectionCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientAccent}
            />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                🧄 Ingrédients ({recipe.ingredients.length})
              </Text>
            </View>
            <View style={styles.sectionContent}>
              <RecipeIngredientsSection
                ingredients={recipe.ingredients}
                servings={recipe.servings || 4}
                onServingsChange={handleServingsChange}
                showUsageStats={true}
                interactive={false}
              />
            </View>
          </View>

          {/* Instructions Section Card */}
          <View style={styles.sectionCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientAccent}
            />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                👨‍🍳 Instructions ({recipe.instructions.length})
              </Text>
            </View>
            <View style={styles.sectionContent}>
              <RecipeInstructionsList
                instructions={recipe.instructions}
                showTimer={true}
                interactive={true}
              />
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>

        {/* Share Modal */}
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          recipe={recipe}
          mode="single"
        />

        {/* Add to Shopping List Modal */}
        <AddToShoppingListModal
          visible={shoppingListModalVisible}
          onClose={() => setShoppingListModalVisible(false)}
          recipe={recipe}
          mode="recipe"
        />
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },

  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },

  errorTitle: {
    ...typography.styles.h2,
    fontWeight: typography.weights.semibold,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  errorSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },

  retryButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  photoSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },

  // Compact Info Card
  infoCard: {
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: 12,
    overflow: 'hidden',
    ...colors.shadow.small,
    position: 'relative',
  },

  gradientAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 1,
  },

  cardContent: {
    padding: 12,
  },


  recipeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.medium,
    fontStyle: 'italic',
  },

  // Compact Metadata Styling
  metadataContainer: {
    marginBottom: spacing.sm,
  },

  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  metadataIcon: {
    fontSize: 14,
    marginRight: 4,
  },

  metadataText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  // Compact Tags Styling
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xs,
  },

  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  tagText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.textWhite,
  },

  // Time Pills Container
  timePillsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },

  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  totalTimePill: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  timePillEmoji: {
    fontSize: 14,
  },

  timePillValue: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },


  // Compact Section Cards
  sectionCard: {
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 12,
    overflow: 'hidden',
    ...colors.shadow.small,
    position: 'relative',
  },

  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },

  sectionContent: {
    padding: 12,
  },

  bottomSpacer: {
    height: 50,
  },
});