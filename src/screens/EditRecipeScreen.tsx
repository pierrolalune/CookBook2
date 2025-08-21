import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Recipe, UpdateRecipeInput } from '../types';
import { colors, spacing, typography } from '../styles';
import { useRecipes } from '../hooks/useRecipes';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { RecipeForm } from '../components/recipe/RecipeForm';

interface EditRecipeScreenProps {
  recipeId: string;
}

export const EditRecipeScreen: React.FC<EditRecipeScreenProps> = ({ recipeId }) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { actions } = useRecipes();

  // Load recipe data
  useEffect(() => {
    const loadRecipe = async () => {
      try {
        setLoading(true);
        const loadedRecipe = await actions.getRecipeById(recipeId);
        setRecipe(loadedRecipe);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger la recette');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [recipeId, actions]);

  const handleSave = useCallback(async (formData: Omit<UpdateRecipeInput, 'id'>) => {
    if (!recipe) return;

    try {
      setSaving(true);
      
      const updateData: UpdateRecipeInput = {
        ...formData,
        id: recipe.id
      };

      await actions.updateRecipe(updateData);
      
      Alert.alert(
        'Succès',
        'Recette mise à jour avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la recette');
    } finally {
      setSaving(false);
    }
  }, [recipe, actions]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Annuler les modifications',
      'Êtes-vous sûr de vouloir annuler ? Toutes les modifications seront perdues.',
      [
        {
          text: 'Continuer',
          style: 'cancel'
        },
        {
          text: 'Annuler',
          style: 'destructive',
          onPress: () => router.back()
        }
      ]
    );
  }, []);

  if (loading) {
    return (
      <ScreenErrorBoundary>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de la recette...</Text>
        </View>
      </ScreenErrorBoundary>
    );
  }

  if (!recipe) {
    return (
      <ScreenErrorBoundary>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Recette introuvable</Text>
        </View>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
      <RecipeForm
        initialData={{
          name: recipe.name,
          description: recipe.description,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          category: recipe.category,
          photoUri: recipe.photoUri,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions
        }}
        onSubmit={handleSave}
        onCancel={handleCancel}
        submitButtonText="Mettre à jour"
        isLoading={saving}
        mode="edit"
      />
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
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
    marginTop: spacing.md,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  errorText: {
    ...typography.styles.h2,
    color: colors.error,
    textAlign: 'center',
  },
});