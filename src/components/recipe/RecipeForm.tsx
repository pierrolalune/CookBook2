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
import { UpdateRecipeInput, RecipeCategory, RecipeDifficulty, Ingredient, RecipeIngredient, RecipeInstruction } from '../../types';
import { colors, spacing, typography } from '../../styles';
import { useRecipeIngredients, RecipeIngredientItem } from '../../hooks/useRecipeIngredients';
import { IngredientSelectorModal } from './IngredientSelectorModal';
import { RecipePhotoManager } from './RecipePhotoManager';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface RecipeFormData {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  category: RecipeCategory;
  photoUri?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
}

interface RecipeFormProps {
  initialData?: RecipeFormData;
  onSubmit: (data: Omit<UpdateRecipeInput, 'id'>) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

interface RecipeInstructionInput {
  stepNumber: number;
  instruction: string;
  estimatedTime?: number;
  temperature?: number;
  notes?: string;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitButtonText = 'Sauvegarder',
  isLoading = false,
  mode = 'create'
}) => {
  const [recipeName, setRecipeName] = useState(initialData?.name || '');
  const [recipeDescription, setRecipeDescription] = useState(initialData?.description || '');
  const [prepTime, setPrepTime] = useState(initialData?.prepTime?.toString() || '');
  const [cookTime, setCookTime] = useState(initialData?.cookTime?.toString() || '');
  const [servings, setServings] = useState(initialData?.servings?.toString() || '4');
  const [category, setCategory] = useState<RecipeCategory>(initialData?.category || 'plats');
  const [difficulty, setDifficulty] = useState<RecipeDifficulty | ''>(initialData?.difficulty || '');
  const [instructions, setInstructions] = useState<RecipeInstructionInput[]>(() => {
    if (initialData?.instructions && initialData.instructions.length > 0) {
      return initialData.instructions.map(inst => ({
        stepNumber: inst.stepNumber,
        instruction: inst.instruction,
        estimatedTime: inst.estimatedTime,
        temperature: inst.temperature,
        notes: inst.notes
      }));
    }
    return [{ stepNumber: 1, instruction: '' }];
  });
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredientItem | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  // Initialize recipe ingredients hook with initial data
  const initialIngredients = initialData?.ingredients ? 
    initialData.ingredients.map(ing => ({
      tempId: `${ing.ingredientId}_${ing.orderIndex}`,
      ingredientId: ing.ingredientId,
      ingredient: ing.ingredient,
      quantity: ing.quantity,
      unit: ing.unit,
      optional: ing.optional
    })) : [];

  const { selectedIngredients, actions: ingredientActions } = useRecipeIngredients(initialIngredients);

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

  const handleSubmit = useCallback(async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert('Erreurs de validation', errors.join('\n'));
      return;
    }

    try {
      // Prepare recipe data
      const validInstructions = instructions
        .filter(inst => inst.instruction.trim())
        .map((inst, index) => ({
          stepNumber: index + 1,
          instruction: inst.instruction.trim(),
          estimatedTime: inst.estimatedTime,
          temperature: inst.temperature,
          notes: inst.notes
        }));

      const recipeData = {
        name: recipeName.trim(),
        description: recipeDescription.trim() || undefined,
        prepTime: prepTime ? Number(prepTime) : undefined,
        cookTime: cookTime ? Number(cookTime) : undefined,
        servings: servings ? Number(servings) : undefined,
        category,
        difficulty: difficulty || undefined,
        photoUri: photos.length > 0 ? photos[0] : initialData?.photoUri,
        ingredients: selectedIngredients.map((ing, index) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional || false,
          orderIndex: index
        })),
        instructions: validInstructions
      };

      await onSubmit(recipeData);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la recette. Veuillez réessayer.');
    }
  }, [validateForm, recipeName, recipeDescription, prepTime, cookTime, servings, category, difficulty, photos, initialData?.photoUri, selectedIngredients, instructions, onSubmit]);

  const handleAddIngredient = useCallback((ingredient: Ingredient, quantity: number, unit: string, optional = false) => {
    if (editingIngredient) {
      // Update existing ingredient
      ingredientActions.updateRecipeIngredient(editingIngredient.tempId!, {
        quantity,
        unit,
        optional
      });
      setEditingIngredient(null);
    } else {
      // Add new ingredient
      ingredientActions.addIngredientToRecipe(ingredient, quantity, unit, optional);
    }
    setShowIngredientModal(false);
  }, [ingredientActions, editingIngredient]);

  const handleEditIngredient = useCallback((ingredient: RecipeIngredientItem) => {
    setEditingIngredient(ingredient);
    setShowIngredientModal(true);
  }, []);

  const handleCloseIngredientModal = useCallback(() => {
    setShowIngredientModal(false);
    setEditingIngredient(null);
  }, []);

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

  const handleUpdateInstruction = useCallback((index: number, field: keyof RecipeInstructionInput, value: any) => {
    setInstructions(prev => prev.map((inst, i) => 
      i === index ? { ...inst, [field]: value } : inst
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
    <ErrorBoundary>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
              recipeId={mode === 'edit' ? (initialData as any)?.id || 'temp' : `temp_${Date.now()}`}
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
              selectedIngredients.map((ingredient) => (
                <View key={ingredient.tempId} style={styles.ingredientItem}>
                  <TouchableOpacity 
                    style={styles.ingredientInfo}
                    onPress={() => handleEditIngredient(ingredient)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ingredientName}>
                      {ingredient.ingredient?.name || 'Ingrédient inconnu'}
                    </Text>
                    <Text style={styles.ingredientQuantity}>
                      {ingredient.quantity} {ingredient.unit}
                      {ingredient.optional && (
                        <Text style={styles.optionalText}> (optionnel)</Text>
                      )}
                    </Text>
                    <Text style={styles.editHint}>Appuyer pour modifier</Text>
                  </TouchableOpacity>
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
                  onChangeText={(text) => handleUpdateInstruction(index, 'instruction', text)}
                  placeholder={`Décrivez l'étape ${index + 1}...`}
                  placeholderTextColor={colors.textLight}
                  multiline
                />
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.savingButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Sauvegarde...' : submitButtonText}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Ingredient Selector Modal */}
        <IngredientSelectorModal
          visible={showIngredientModal}
          onClose={handleCloseIngredientModal}
          onAddIngredient={handleAddIngredient}
          excludeIngredientIds={editingIngredient ? excludedIngredientIds.filter(id => id !== editingIngredient.ingredientId) : excludedIngredientIds}
          editingIngredient={editingIngredient}
        />
      </KeyboardAvoidingView>
    </ErrorBoundary>
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

  editHint: {
    ...typography.styles.small,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
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

  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  cancelButtonText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },

  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },

  savingButton: {
    opacity: 0.7,
  },

  saveButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  bottomSpacer: {
    height: 50,
  },
});