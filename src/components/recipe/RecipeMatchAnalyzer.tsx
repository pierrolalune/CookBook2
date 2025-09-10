import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { RecipeMatchResult } from '../../utils/recipeSearchUtils';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface RecipeMatchAnalyzerProps {
  matchResult: RecipeMatchResult;
  onRecipePress?: (recipeId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
  exclusionOnlyMode?: boolean; // New prop to indicate exclusion-only mode
}

export const RecipeMatchAnalyzer: React.FC<RecipeMatchAnalyzerProps> = ({
  matchResult,
  onRecipePress,
  showDetails = false,
  compact = false,
  exclusionOnlyMode = false
}) => {
  const [showMissingIngredients, setShowMissingIngredients] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  const { recipe, matchPercentage, availableIngredients, missingIngredients, optionalMissing, canMake, seasonalBonus } = matchResult;

  const toggleMissingIngredients = () => {
    const toValue = showMissingIngredients ? 0 : 1;
    setShowMissingIngredients(!showMissingIngredients);
    
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const getMatchColor = (percentage: number): string => {
    if (percentage >= 90) return colors.success;
    if (percentage >= 70) return colors.warning;
    if (percentage >= 50) return colors.secondary;
    return colors.error;
  };

  const getMatchIcon = (percentage: number): string => {
    if (percentage >= 90) return 'checkmark-circle';
    if (percentage >= 70) return 'checkmark-circle-outline';
    if (percentage >= 50) return 'alert-circle';
    return 'close-circle';
  };

  const renderMatchBadge = () => {
    // In exclusion-only mode, show different content
    if (exclusionOnlyMode) {
      return (
        <View style={[styles.matchBadge, { backgroundColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.matchPercentage, { color: colors.success }]}>
            Autorisé
          </Text>
        </View>
      );
    }
    
    const matchColor = getMatchColor(matchPercentage);
    const matchIcon = getMatchIcon(matchPercentage);
    
    return (
      <View style={[styles.matchBadge, { backgroundColor: `${matchColor}15` }]}>
        <Ionicons name={matchIcon as any} size={16} color={matchColor} />
        <Text style={[styles.matchPercentage, { color: matchColor }]}>
          {matchPercentage}%
        </Text>
        {canMake && (
          <View style={styles.canMakeBadge}>
            <Text style={styles.canMakeText}>✓ Réalisable</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSeasonalBonus = () => {
    if (seasonalBonus === 0) return null;
    
    return (
      <View style={styles.seasonalBonusContainer}>
        <Ionicons name="leaf" size={14} color={colors.success} />
        <Text style={styles.seasonalBonusText}>+{seasonalBonus} saison</Text>
      </View>
    );
  };

  const renderIngredientCounts = () => {
    // In exclusion-only mode, don't show ingredient match counts
    if (exclusionOnlyMode) {
      return (
        <View style={styles.ingredientCounts}>
          <View style={styles.countItem}>
            <Ionicons name="restaurant" size={16} color={colors.primary} />
            <Text style={styles.countText}>{recipe.ingredients.length} ingrédients</Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.ingredientCounts}>
        <View style={styles.countItem}>
          <Ionicons name="checkmark" size={16} color={colors.success} />
          <Text style={styles.countText}>{availableIngredients.length}</Text>
        </View>
        
        {missingIngredients.length > 0 && (
          <View style={styles.countItem}>
            <Ionicons name="close" size={16} color={colors.error} />
            <Text style={styles.countText}>{missingIngredients.length}</Text>
          </View>
        )}
        
        {optionalMissing.length > 0 && (
          <View style={styles.countItem}>
            <Ionicons name="help-circle" size={16} color={colors.textSecondary} />
            <Text style={styles.countText}>{optionalMissing.length} opt.</Text>
          </View>
        )}
      </View>
    );
  };

  const renderMissingIngredientsList = () => {
    if (missingIngredients.length === 0 && optionalMissing.length === 0) {
      return null;
    }

    const maxHeight = animatedHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200],
    });

    return (
      <Animated.View style={[styles.missingIngredientsContainer, { maxHeight }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Required missing ingredients */}
          {missingIngredients.length > 0 && (
            <View style={styles.missingSection}>
              <Text style={styles.missingSectionTitle}>Ingrédients manquants</Text>
              {missingIngredients.map((missing, index) => (
                <View key={`missing-${missing.ingredientId}-${index}`} style={styles.missingIngredientItem}>
                  <View style={styles.missingIngredientInfo}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                    <Text style={styles.missingIngredientName}>
                      {missing.ingredient.name}
                    </Text>
                    <Text style={styles.missingIngredientQuantity}>
                      {missing.quantity} {missing.unit}
                    </Text>
                  </View>
                  
                  {/* Substitutions */}
                  {missing.substitutions && missing.substitutions.length > 0 && (
                    <View style={styles.substitutionsContainer}>
                      <Text style={styles.substitutionsTitle}>Alternatives:</Text>
                      <View style={styles.substitutionsChips}>
                        {missing.substitutions.slice(0, 2).map(sub => (
                          <View key={sub.id} style={styles.substitutionChip}>
                            <Text style={styles.substitutionText}>{sub.name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Optional missing ingredients */}
          {optionalMissing.length > 0 && (
            <View style={styles.missingSection}>
              <Text style={styles.missingSectionTitle}>Ingrédients optionnels</Text>
              {optionalMissing.map((missing, index) => (
                <View key={`optional-${missing.ingredientId}-${index}`} style={styles.missingIngredientItem}>
                  <View style={styles.missingIngredientInfo}>
                    <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.missingIngredientName, styles.optionalText]}>
                      {missing.ingredient.name}
                    </Text>
                    <Text style={[styles.missingIngredientQuantity, styles.optionalText]}>
                      {missing.quantity} {missing.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  if (compact) {
    return (
      <ErrorBoundary>
        <TouchableOpacity
          style={styles.compactContainer}
          onPress={() => onRecipePress?.(recipe.id)}
        >
          <View style={styles.compactHeader}>
            <Text style={styles.recipeTitle} numberOfLines={1}>
              {recipe.name}
            </Text>
            {renderMatchBadge()}
          </View>
          
          <View style={styles.compactInfo}>
            {renderIngredientCounts()}
            {renderSeasonalBonus()}
          </View>
        </TouchableOpacity>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => onRecipePress?.(recipe.id)}
        >
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeTitle}>{recipe.name}</Text>
            {recipe.description && (
              <Text style={styles.recipeDescription} numberOfLines={2}>
                {recipe.description}
              </Text>
            )}
            
            <View style={styles.recipeMetadata}>
              {recipe.prepTime && (
                <Text style={styles.metadataText}>⏱️ {recipe.prepTime}min</Text>
              )}
              {recipe.difficulty && (
                <Text style={styles.metadataText}>
                  {recipe.difficulty === 'facile' ? '🟢' : recipe.difficulty === 'moyen' ? '🟡' : '🔴'} 
                  {recipe.difficulty}
                </Text>
              )}
              {recipe.servings && (
                <Text style={styles.metadataText}>👥 {recipe.servings}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.matchInfo}>
            {renderMatchBadge()}
            {renderSeasonalBonus()}
          </View>
        </TouchableOpacity>

        {showDetails && (
          <View style={styles.details}>
            <View style={styles.detailsHeader}>
              {renderIngredientCounts()}
              
              {/* Only show missing ingredients toggle when not in exclusion-only mode */}
              {!exclusionOnlyMode && (missingIngredients.length > 0 || optionalMissing.length > 0) && (
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={toggleMissingIngredients}
                >
                  <Text style={styles.toggleButtonText}>
                    {showMissingIngredients ? 'Masquer' : 'Détails'}
                  </Text>
                  <Ionicons
                    name={showMissingIngredients ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Only show missing ingredients list when not in exclusion-only mode */}
            {!exclusionOnlyMode && renderMissingIngredientsList()}
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  compactContainer: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'flex-start',
  },

  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },

  recipeInfo: {
    flex: 1,
    marginRight: spacing.md,
  },

  recipeTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  recipeDescription: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },

  recipeMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  metadataText: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  matchInfo: {
    alignItems: 'flex-end',
  },

  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },

  matchPercentage: {
    ...typography.styles.small,
    fontWeight: typography.weights.semibold,
  },

  canMakeBadge: {
    backgroundColor: colors.success,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    marginLeft: spacing.xs,
  },

  canMakeText: {
    ...typography.styles.tiny,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  seasonalBonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  seasonalBonusText: {
    ...typography.styles.tiny,
    color: colors.success,
    fontWeight: typography.weights.medium,
  },

  compactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ingredientCounts: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  countText: {
    ...typography.styles.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },

  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  toggleButtonText: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  missingIngredientsContainer: {
    overflow: 'hidden',
  },

  missingSection: {
    marginBottom: spacing.md,
  },

  missingSectionTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  missingIngredientItem: {
    marginBottom: spacing.sm,
  },

  missingIngredientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  missingIngredientName: {
    ...typography.styles.body,
    color: colors.textPrimary,
    flex: 1,
  },

  missingIngredientQuantity: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  optionalText: {
    opacity: 0.7,
  },

  substitutionsContainer: {
    marginLeft: spacing.lg + spacing.sm,
    marginTop: spacing.xs,
  },

  substitutionsTitle: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  substitutionsChips: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },

  substitutionChip: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
  },

  substitutionText: {
    ...typography.styles.tiny,
    color: colors.primary,
  },
});