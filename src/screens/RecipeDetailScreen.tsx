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
  const [interactiveMode, setInteractiveMode] = useState(false);
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

  const toggleInteractiveMode = useCallback(() => {
    setInteractiveMode(prev => !prev);
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

  const getDifficultyDisplay = () => {
    if (!recipe?.difficulty) return null;
    
    const difficulties = {
      facile: '⭐ Facile',
      moyen: '⭐⭐ Moyen',
      difficile: '⭐⭐⭐ Difficile'
    };
    
    return difficulties[recipe.difficulty];
  };

  const getCategoryDisplay = () => {
    if (!recipe) return null;
    
    const categories = {
      entree: '🥗 Entrée',
      plats: '🍽️ Plat',
      dessert: '🍰 Dessert'
    };
    
    return categories[recipe.category];
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

          {/* Recipe Info */}
          <View style={styles.infoSection}>
            {recipe.description && (
              <Text style={styles.recipeDescription}>{recipe.description}</Text>
            )}

            {/* Recipe Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⏱️</Text>
                <Text style={styles.statText}>
                  {getTotalTime() ? formatTime(getTotalTime()!) : 'Non spécifié'}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={styles.statText}>
                  {recipe.servings || currentServings} pers.
                </Text>
              </View>

              {recipe.difficulty && (
                <View style={styles.statItem}>
                  <Text style={styles.statText}>{getDifficultyDisplay()}</Text>
                </View>
              )}
              
              <View style={styles.statItem}>
                <Text style={styles.statText}>{getCategoryDisplay()}</Text>
              </View>
            </View>

            {/* Time Breakdown */}
            {(recipe.prepTime || recipe.cookTime) && (
              <View style={styles.timeBreakdown}>
                {recipe.prepTime && (
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Préparation</Text>
                    <Text style={styles.timeValue}>{formatTime(recipe.prepTime)}</Text>
                  </View>
                )}
                {recipe.cookTime && (
                  <View style={styles.timeItem}>
                    <Text style={styles.timeLabel}>Cuisson</Text>
                    <Text style={styles.timeValue}>{formatTime(recipe.cookTime)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Interactive Mode Toggle */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeToggle, interactiveMode && styles.modeToggleActive]}
              onPress={toggleInteractiveMode}
            >
              <Text style={[
                styles.modeToggleText,
                interactiveMode && styles.modeToggleTextActive
              ]}>
                {interactiveMode ? '✓ Mode cuisine' : '👨‍🍳 Mode cuisine'}
              </Text>
            </TouchableOpacity>
            
            {interactiveMode && (
              <Text style={styles.modeDescription}>
                Cochez les étapes au fur et à mesure
              </Text>
            )}
          </View>

          {/* Ingredients Section */}
          <View style={styles.sectionContainer}>
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
                interactive={interactiveMode}
              />
            </View>
          </View>

          {/* Instructions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                👨‍🍳 Instructions ({recipe.instructions.length})
              </Text>
            </View>
            <View style={styles.sectionContent}>
              <RecipeInstructionsList
                instructions={recipe.instructions}
                showTimer={true}
                interactive={interactiveMode}
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
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },

  infoSection: {
    padding: spacing.lg,
  },


  recipeDescription: {
    ...typography.styles.h3,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
    fontWeight: typography.weights.medium,
    fontStyle: 'italic',
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.lg,
  },

  statIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },

  statText: {
    ...typography.styles.small,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },

  timeBreakdown: {
    flexDirection: 'row',
    gap: spacing.lg,
  },

  timeItem: {
    alignItems: 'center',
  },

  timeLabel: {
    ...typography.styles.small,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },

  timeValue: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  modeToggleContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  modeToggle: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...colors.shadow.small,
  },

  modeToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...colors.shadow.medium,
  },

  modeToggleText: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  modeToggleTextActive: {
    color: colors.textWhite,
  },

  modeDescription: {
    ...typography.styles.small,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  sectionContainer: {
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    ...colors.shadow.small,
  },

  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: spacing.borderRadius.lg,
    borderTopRightRadius: spacing.borderRadius.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  sectionTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  sectionContent: {
    padding: spacing.lg,
    borderBottomLeftRadius: spacing.borderRadius.lg,
    borderBottomRightRadius: spacing.borderRadius.lg,
  },

  bottomSpacer: {
    height: 50,
  },
});