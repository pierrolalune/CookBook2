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
  Platform,
  Animated
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CreateRecipeInput, RecipeCategory, RecipeDifficulty, Ingredient } from '../types';
import { colors, spacing, typography, commonStyles } from '../styles';
import { useRecipes } from '../hooks/useRecipes';
import { useRecipeIngredients, RecipeIngredientItem } from '../hooks/useRecipeIngredients';
import { useRecipePhotos } from '../hooks/useRecipePhotos';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { GradientHeader } from '../components/common/GradientHeader';
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
        {/* Modern Gradient Header */}
        <GradientHeader
          title="Nouvelle Recette"
          showBackButton
          onBackPress={() => router.back()}
          rightAction={
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.savingButton]}
              onPress={handleSaveRecipe}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? '⏳' : '💾'} {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          }
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Info Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientAccent}
            />
            <View style={styles.cardContent}>
            
              <View style={styles.compactInputGroup}>
                <Text style={styles.compactLabel}>🍽️ Nom de la recette *</Text>
                <TextInput
                  style={styles.compactInput}
                  value={recipeName}
                  onChangeText={setRecipeName}
                  placeholder="Ex: Tarte aux pommes maison"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.compactInputGroup}>
                <Text style={styles.compactLabel}>📝 Description</Text>
                <TextInput
                  style={[styles.compactInput, styles.compactTextArea]}
                  value={recipeDescription}
                  onChangeText={setRecipeDescription}
                  placeholder="Décrivez votre recette..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Category Pills */}
              <View style={styles.compactInputGroup}>
                <Text style={styles.compactLabel}>🍽️ Catégorie *</Text>
                <View style={styles.pillsRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryPill,
                        category === cat.value && styles.selectedCategoryPill
                      ]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <Text style={[
                        styles.pillText,
                        category === cat.value && styles.selectedPillText
                      ]}>
                        {cat.icon} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>


              {/* Time and Servings Pills */}
              <View style={styles.compactTimeRow}>
                <View style={styles.compactTimeGroup}>
                  <Text style={styles.timePillEmoji}>👨‍🍳</Text>
                  <TextInput
                    style={styles.compactTimeInput}
                    value={prepTime}
                    onChangeText={setPrepTime}
                    placeholder="30"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                  <Text style={styles.timeUnit}>min</Text>
                </View>
              
                <View style={styles.compactTimeGroup}>
                  <Text style={styles.timePillEmoji}>🔥</Text>
                  <TextInput
                    style={styles.compactTimeInput}
                    value={cookTime}
                    onChangeText={setCookTime}
                    placeholder="45"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                  <Text style={styles.timeUnit}>min</Text>
                </View>
              
                <View style={styles.compactTimeGroup}>
                  <Text style={styles.timePillEmoji}>👥</Text>
                  <TextInput
                    style={styles.compactTimeInput}
                    value={servings}
                    onChangeText={setServings}
                    placeholder="4"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                  <Text style={styles.timeUnit}>pers</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Ingredients Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientAccent}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  🧄 Ingrédients ({selectedIngredients.length})
                </Text>
                <TouchableOpacity
                  style={styles.compactAddButton}
                  onPress={() => setShowIngredientModal(true)}
                >
                  <Text style={styles.compactAddButtonText}>+ Ajouter</Text>
                </TouchableOpacity>
              </View>

              {selectedIngredients.length === 0 ? (
                <View style={styles.compactEmptyState}>
                  <Text style={styles.compactEmptyStateText}>
                    Aucun ingrédient ajouté
                  </Text>
                  <TouchableOpacity
                    style={styles.compactEmptyStateButton}
                    onPress={() => setShowIngredientModal(true)}
                  >
                    <Text style={styles.compactEmptyStateButtonText}>
                      Ajouter le premier ingrédient
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                selectedIngredients.map((ingredient, index) => (
                  <View key={ingredient.tempId} style={styles.compactIngredientItem}>
                    <View style={styles.compactIngredientInfo}>
                      <Text style={styles.compactIngredientName}>
                        {ingredient.ingredient?.name || 'Ingrédient inconnu'}
                      </Text>
                      <Text style={styles.compactIngredientQuantity}>
                        {ingredient.quantity} {ingredient.unit}
                        {ingredient.optional && (
                          <Text style={styles.compactOptionalText}> (opt.)</Text>
                        )}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.compactRemoveButton}
                      onPress={() => handleRemoveIngredient(ingredient.tempId!)}
                    >
                      <Text style={styles.compactRemoveButtonText}>🚮</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Instructions Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientAccent}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  👨‍🍳 Instructions ({instructions.length})
                </Text>
                <TouchableOpacity
                  style={styles.compactAddButton}
                  onPress={handleAddInstruction}
                >
                  <Text style={styles.compactAddButtonText}>+ Étape</Text>
                </TouchableOpacity>
              </View>

              {instructions.map((instruction, index) => (
                <View key={index} style={styles.compactInstructionItem}>
                  <View style={styles.compactInstructionHeader}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    {instructions.length > 1 && (
                      <TouchableOpacity
                        style={styles.compactRemoveButton}
                        onPress={() => handleRemoveInstruction(index)}
                      >
                        <Text style={styles.compactRemoveButtonText}>🚮</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.compactInstructionInput}
                    value={instruction.instruction}
                    onChangeText={(text) => handleUpdateInstruction(index, text)}
                    placeholder={`Décrivez l'étape ${index + 1}...`}
                    placeholderTextColor={colors.textLight}
                    multiline
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Photos and Difficulty Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientAccent}
            />
            <View style={styles.cardContent}>
              <RecipePhotoManager
                recipeId={tempRecipeId}
                editable={true}
                height={150}
                maxPhotos={5}
                showTitle={true}
                onPhotosChange={setPhotos}
              />
              
              {/* Difficulty Pills */}
              <View style={styles.compactInputGroup}>
                <Text style={styles.compactLabel}>⭐ Difficulté</Text>
                <View style={styles.pillsRow}>
                  {difficulties.map((diff) => (
                    <TouchableOpacity
                      key={diff.value}
                      style={[
                        styles.difficultyPill,
                        difficulty === diff.value && styles.selectedDifficultyPill
                      ]}
                      onPress={() => setDifficulty(difficulty === diff.value ? '' : diff.value)}
                    >
                      <Text style={[
                        styles.pillText,
                        difficulty === diff.value && styles.selectedPillText
                      ]}>
                        {diff.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
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

  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  savingButton: {
    opacity: 0.7,
  },

  saveButtonText: {
    fontSize: 13,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  content: {
    flex: 1,
  },

  // Modern Card Styles
  card: {
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

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },

  // Compact Form Elements
  compactInputGroup: {
    marginBottom: 8,
  },

  compactLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },

  compactInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },

  compactTextArea: {
    height: 50,
    textAlignVertical: 'top',
  },

  // Pills and Selection Styles
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  selectedCategoryPill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  difficultyPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  selectedDifficultyPill: {
    backgroundColor: '#f39c12',
    borderColor: '#f39c12',
  },

  pillText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },

  selectedPillText: {
    color: colors.textWhite,
  },

  // Compact Time Input
  compactTimeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  compactTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },

  timePillEmoji: {
    fontSize: 14,
  },

  compactTimeInput: {
    fontSize: 12,
    color: colors.textPrimary,
    width: 30,
    textAlign: 'center',
    fontWeight: typography.weights.semibold,
  },

  timeUnit: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Compact Add Button
  compactAddButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  compactAddButtonText: {
    fontSize: 11,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  // Compact Empty State
  compactEmptyState: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },

  compactEmptyStateText: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },

  compactEmptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  compactEmptyStateButtonText: {
    fontSize: 12,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  // Compact Ingredient Item
  compactIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },

  compactIngredientInfo: {
    flex: 1,
  },

  compactIngredientName: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 1,
  },

  compactIngredientQuantity: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  compactOptionalText: {
    fontStyle: 'italic',
    color: colors.textLight,
  },

  // Compact Instruction Item
  compactInstructionItem: {
    marginBottom: 8,
  },

  compactInstructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumberText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textWhite,
  },

  compactInstructionInput: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.textPrimary,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    minHeight: 40,
    textAlignVertical: 'top',
  },

  // Compact Remove Button
  compactRemoveButton: {
    padding: 4,
  },

  compactRemoveButtonText: {
    fontSize: 14,
  },

  bottomSpacer: {
    height: 50,
  },
});