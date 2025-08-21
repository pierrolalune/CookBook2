import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { CreateRecipeInput, RecipeCategory, RecipeDifficulty, Ingredient } from '../types';
import { colors, spacing, typography, commonStyles } from '../styles';
import { useRecipes } from '../hooks/useRecipes';
import { useRecipeIngredients, RecipeIngredientItem } from '../hooks/useRecipeIngredients';
import { useRecipePhotos } from '../hooks/useRecipePhotos';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { IngredientSelectorModal } from '../components/recipe/IngredientSelectorModal';
import { RecipePhotoManager } from '../components/recipe/RecipePhotoManager';

interface RecipeInstructionInput {
  stepNumber: number;
  instruction: string;
  duration?: number;
}

export const AddRecipeScreen: React.FC = () => {
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [category, setCategory] = useState<RecipeCategory>('plats');
  const [difficulty, setDifficulty] = useState<RecipeDifficulty | ''>('');
  const [instructions, setInstructions] = useState<RecipeInstructionInput[]>([
    { stepNumber: 1, instruction: '' }
  ]);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tempRecipeId, setTempRecipeId] = useState<string>(`temp_${Date.now()}`);
  const [photos, setPhotos] = useState<string[]>([]);

  const { actions: recipeActions } = useRecipes();
  const { selectedIngredients, actions: ingredientActions } = useRecipeIngredients();

  const validateForm = useCallback((): string[] => {
    const errors: string[] = [];

    if (!recipeName.trim()) {
      errors.push('Le nom de la recette est requis');
    }

    if (!category) {
      errors.push('La catégorie est requise');
    }

    if (selectedIngredients.length === 0) {
      errors.push('Au moins un ingrédient est requis');
    }

    const validInstructions = instructions.filter(inst => inst.instruction.trim());
    if (validInstructions.length === 0) {
      errors.push('Au moins une instruction est requise');
    }

    if (prepTime && (isNaN(Number(prepTime)) || Number(prepTime) <= 0)) {
      errors.push('Le temps de préparation doit être un nombre positif');
    }

    if (cookTime && (isNaN(Number(cookTime)) || Number(cookTime) <= 0)) {
      errors.push('Le temps de cuisson doit être un nombre positif');
    }

    if (servings && (isNaN(Number(servings)) || Number(servings) <= 0)) {
      errors.push('Le nombre de portions doit être un nombre positif');
    }

    return errors;
  }, [recipeName, category, selectedIngredients, instructions, prepTime, cookTime, servings]);

  const handleSaveRecipe = useCallback(async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert('Erreurs de validation', errors.join('\n'));
      return;
    }

    setSaving(true);

    try {
      // Prepare recipe data
      const validInstructions = instructions
        .filter(inst => inst.instruction.trim())
        .map((inst, index) => ({
          stepNumber: index + 1,
          instruction: inst.instruction.trim(),
          duration: inst.duration
        }));

      const recipeInput: CreateRecipeInput = {
        name: recipeName.trim(),
        description: recipeDescription.trim() || undefined,
        prepTime: prepTime ? Number(prepTime) : undefined,
        cookTime: cookTime ? Number(cookTime) : undefined,
        servings: servings ? Number(servings) : undefined,
        category,
        difficulty: difficulty || undefined,
        photoUri: photos.length > 0 ? photos[0] : undefined, // Use first photo as main photo
        ingredients: selectedIngredients.map((ing, index) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional || false,
          orderIndex: index
        })),
        instructions: validInstructions
      };

      const newRecipe = await recipeActions.createRecipe(recipeInput);
      
      Alert.alert(
        'Succès',
        'Recette créée avec succès !',
        [
          {
            text: 'Voir la recette',
            onPress: () => {
              router.replace({
                pathname: '/recipe/[id]',
                params: { id: newRecipe.id }
              });
            }
          },
          {
            text: 'Retour aux recettes',
            onPress: () => router.replace('/recipes')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la recette. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }, [validateForm, recipeName, recipeDescription, prepTime, cookTime, servings, category, difficulty, selectedIngredients, instructions, recipeActions]);

  const handleAddIngredient = useCallback((ingredient: Ingredient, quantity: number, unit: string, optional = false) => {
    ingredientActions.addIngredientToRecipe(ingredient, quantity, unit, optional);
    setShowIngredientModal(false);
  }, [ingredientActions]);

  const handleRemoveIngredient = useCallback((tempId: string) => {
    Alert.alert(
      'Supprimer l\'ingrédient',
      'Êtes-vous sûr de vouloir supprimer cet ingrédient ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => ingredientActions.removeRecipeIngredient(tempId)
        }
      ]
    );
  }, [ingredientActions]);

  const handleAddInstruction = useCallback(() => {
    const newStepNumber = instructions.length + 1;
    setInstructions(prev => [...prev, { stepNumber: newStepNumber, instruction: '' }]);
  }, [instructions.length]);

  const handleUpdateInstruction = useCallback((index: number, instruction: string) => {
    setInstructions(prev => prev.map((inst, i) => 
      i === index ? { ...inst, instruction } : inst
    ));
  }, []);

  const handleRemoveInstruction = useCallback((index: number) => {
    if (instructions.length === 1) return; // Keep at least one instruction
    
    setInstructions(prev => 
      prev
        .filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, stepNumber: i + 1 }))
    );
  }, [instructions.length]);

  const categories: { value: RecipeCategory, label: string, icon: string }[] = [
    { value: 'entree', label: 'Entrée', icon: '🥗' },
    { value: 'plats', label: 'Plat', icon: '🍽️' },
    { value: 'dessert', label: 'Dessert', icon: '🍰' }
  ];

  const difficulties: { value: RecipeDifficulty, label: string }[] = [
    { value: 'facile', label: '⭐ Facile' },
    { value: 'moyen', label: '⭐⭐ Moyen' },
    { value: 'difficile', label: '⭐⭐⭐ Difficile' }
  ];

  const excludedIngredientIds = selectedIngredients.map(ing => ing.ingredientId);

  return (
    <ScreenErrorBoundary>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle Recette</Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.savingButton]}
            onPress={handleSaveRecipe}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations générales</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la recette *</Text>
              <TextInput
                style={styles.input}
                value={recipeName}
                onChangeText={setRecipeName}
                placeholder="Ex: Tarte aux pommes maison"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={recipeDescription}
                onChangeText={setRecipeDescription}
                placeholder="Décrivez votre recette..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Catégorie *</Text>
              <View style={styles.optionsRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.optionButton,
                      category === cat.value && styles.selectedOption
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={styles.optionIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.optionText,
                      category === cat.value && styles.selectedOptionText
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Difficulty Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Difficulté</Text>
              <View style={styles.optionsRow}>
                {difficulties.map((diff) => (
                  <TouchableOpacity
                    key={diff.value}
                    style={[
                      styles.optionButton,
                      difficulty === diff.value && styles.selectedOption
                    ]}
                    onPress={() => setDifficulty(difficulty === diff.value ? '' : diff.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      difficulty === diff.value && styles.selectedOptionText
                    ]}>
                      {diff.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time and Servings */}
            <View style={styles.timeRow}>
              <View style={styles.timeGroup}>
                <Text style={styles.label}>Préparation (min)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  placeholder="30"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.timeGroup}>
                <Text style={styles.label}>Cuisson (min)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={cookTime}
                  onChangeText={setCookTime}
                  placeholder="45"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.timeGroup}>
                <Text style={styles.label}>Portions</Text>
                <TextInput
                  style={styles.timeInput}
                  value={servings}
                  onChangeText={setServings}
                  placeholder="4"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <RecipePhotoManager
              recipeId={tempRecipeId}
              editable={true}
              height={180}
              maxPhotos={5}
              showTitle={true}
              onPhotosChange={setPhotos}
            />
          </View>

          {/* Ingredients Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Ingrédients ({selectedIngredients.length})
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowIngredientModal(true)}
              >
                <Text style={styles.addButtonText}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>

            {selectedIngredients.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Aucun ingrédient ajouté
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowIngredientModal(true)}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Ajouter le premier ingrédient
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedIngredients.map((ingredient, index) => (
                <View key={ingredient.tempId} style={styles.ingredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>
                      {ingredient.ingredient?.name || 'Ingrédient inconnu'}
                    </Text>
                    <Text style={styles.ingredientQuantity}>
                      {ingredient.quantity} {ingredient.unit}
                      {ingredient.optional && (
                        <Text style={styles.optionalText}> (optionnel)</Text>
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeIngredientButton}
                    onPress={() => handleRemoveIngredient(ingredient.tempId!)}
                  >
                    <Text style={styles.removeIngredientText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Instructions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddInstruction}
              >
                <Text style={styles.addButtonText}>+ Étape</Text>
              </TouchableOpacity>
            </View>

            {instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.instructionHeader}>
                  <Text style={styles.stepNumber}>Étape {index + 1}</Text>
                  {instructions.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeInstructionButton}
                      onPress={() => handleRemoveInstruction(index)}
                    >
                      <Text style={styles.removeInstructionText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[styles.input, styles.instructionInput]}
                  value={instruction.instruction}
                  onChangeText={(text) => handleUpdateInstruction(index, text)}
                  placeholder={`Décrivez l'étape ${index + 1}...`}
                  placeholderTextColor={colors.textLight}
                  multiline
                />
              </View>
            ))}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Ingredient Selector Modal */}
        <IngredientSelectorModal
          visible={showIngredientModal}
          onClose={() => setShowIngredientModal(false)}
          onAddIngredient={handleAddIngredient}
          excludeIngredientIds={excludedIngredientIds}
        />
      </KeyboardAvoidingView>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },

  backButtonText: {
    fontSize: 24,
    color: colors.primary,
  },

  title: {
    ...typography.styles.h2,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },

  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
  },

  savingButton: {
    opacity: 0.7,
  },

  saveButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  content: {
    flex: 1,
  },

  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
  },

  addButtonText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  inputGroup: {
    marginBottom: spacing.md,
  },

  label: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  input: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  selectedOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  optionIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },

  optionText: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },

  selectedOptionText: {
    color: colors.textWhite,
  },

  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  timeGroup: {
    flex: 1,
  },

  timeInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },

  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
  },

  emptyStateText: {
    ...typography.styles.body,
    color: colors.textLight,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
  },

  emptyStateButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
  },

  ingredientInfo: {
    flex: 1,
  },

  ingredientName: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },

  ingredientQuantity: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  optionalText: {
    fontStyle: 'italic',
    color: colors.textLight,
  },

  removeIngredientButton: {
    backgroundColor: colors.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeIngredientText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },

  instructionItem: {
    marginBottom: spacing.md,
  },

  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },

  stepNumber: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  removeInstructionButton: {
    backgroundColor: colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeInstructionText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },

  instructionInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  bottomSpacer: {
    height: 50,
  },
});