import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { useIngredientsContext } from '../contexts/IngredientsContext';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { IngredientCategory, CreateIngredientInput, SeasonalData } from '../types';
import { colors, spacing, typography, commonStyles } from '../styles';

interface FormData {
  name: string;
  category: IngredientCategory;
  subcategory: string;
  description: string;
  notes: string;
  isSeasonal: boolean;
  selectedMonths: number[];
  peakMonths: number[];
  season: string;
  units: string[];
  tags: string[];
}

const MONTHS = [
  { id: 1, name: 'Jan' },
  { id: 2, name: 'Fév' },
  { id: 3, name: 'Mar' },
  { id: 4, name: 'Avr' },
  { id: 5, name: 'Mai' },
  { id: 6, name: 'Juin' },
  { id: 7, name: 'Juil' },
  { id: 8, name: 'Août' },
  { id: 9, name: 'Sep' },
  { id: 10, name: 'Oct' },
  { id: 11, name: 'Nov' },
  { id: 12, name: 'Déc' },
];

const CATEGORIES: Array<{ id: IngredientCategory; name: string; icon: string }> = [
  { id: 'fruits', name: 'Fruits', icon: '🍎' },
  { id: 'legumes', name: 'Légumes', icon: '🥬' },
  { id: 'peche', name: 'Poisson', icon: '🐟' },
  { id: 'viande', name: 'Viande', icon: '🥩' },
  { id: 'produits_laitiers', name: 'Produits laitiers', icon: '🥛' },
  { id: 'epicerie', name: 'Épicerie', icon: '🛒' },
];

const DEFAULT_UNITS = ['pièce', 'kg', 'g', 'L', 'ml', 'c. à soupe', 'c. à café'];

export const AddIngredientScreen: React.FC = () => {
  const { createIngredient, loading } = useIngredientsContext();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: 'fruits',
    subcategory: '',
    description: '',
    notes: '',
    isSeasonal: false,
    selectedMonths: [],
    peakMonths: [],
    season: '',
    units: ['pièce'],
    tags: [],
  });

  const [newTag, setNewTag] = useState('');

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMonthToggle = (monthId: number) => {
    const isSelected = formData.selectedMonths.includes(monthId);
    const newSelectedMonths = isSelected
      ? formData.selectedMonths.filter(id => id !== monthId)
      : [...formData.selectedMonths, monthId];
    
    updateFormData('selectedMonths', newSelectedMonths);
    
    // Auto-update season based on selected months
    if (newSelectedMonths.length > 0) {
      const season = getSeasonFromMonths(newSelectedMonths);
      updateFormData('season', season);
    }
  };

  const handlePeakMonthToggle = (monthId: number) => {
    if (!formData.selectedMonths.includes(monthId)) return;
    
    const isSelected = formData.peakMonths.includes(monthId);
    const newPeakMonths = isSelected
      ? formData.peakMonths.filter(id => id !== monthId)
      : [...formData.peakMonths, monthId];
    
    updateFormData('peakMonths', newPeakMonths);
  };

  const getSeasonFromMonths = (months: number[]): string => {
    const sortedMonths = [...months].sort((a, b) => a - b);
    const springMonths = [3, 4, 5];
    const summerMonths = [6, 7, 8];
    const fallMonths = [9, 10, 11];
    const winterMonths = [12, 1, 2];

    const isInSeason = (seasonMonths: number[]) => 
      sortedMonths.some(month => seasonMonths.includes(month));

    const seasons = [];
    if (isInSeason(springMonths)) seasons.push('printemps');
    if (isInSeason(summerMonths)) seasons.push('été');
    if (isInSeason(fallMonths)) seasons.push('automne');
    if (isInSeason(winterMonths)) seasons.push('hiver');

    return seasons.join('-');
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Le nom est requis';
    if (!formData.subcategory.trim()) return 'La sous-catégorie est requise';
    if (formData.isSeasonal && formData.selectedMonths.length === 0) {
      return 'Sélectionnez au moins un mois pour un produit saisonnier';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Erreur de validation', validationError);
      return;
    }

    const createInput: CreateIngredientInput = {
      name: formData.name.trim(),
      category: formData.category,
      subcategory: formData.subcategory.trim(),
      units: formData.units,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      seasonal: formData.isSeasonal ? {
        months: formData.selectedMonths,
        peak_months: formData.peakMonths,
        season: formData.season,
      } : undefined,
    };

    try {
      const newIngredient = await createIngredient(createInput);
      if (newIngredient) {
        Alert.alert(
          'Succès!',
          `${newIngredient.name} a été ajouté avec succès!`,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer l\'ingrédient');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler',
      'Voulez-vous vraiment annuler? Les modifications seront perdues.',
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Annuler', style: 'destructive', onPress: () => router.back() }
      ]
    );
  };

  return (
    <ScreenErrorBoundary>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Cet ingrédient sera automatiquement ajouté à "Mes produits" et à la catégorie sélectionnée
          </Text>
        </View>

        {/* Name Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nom de l'ingrédient *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Ex: Tomate cerise"
            autoCapitalize="words"
          />
        </View>

        {/* Category Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Catégorie principale *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryOption,
                  formData.category === category.id && styles.categoryOptionSelected
                ]}
                onPress={() => updateFormData('category', category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryText,
                  formData.category === category.id && styles.categoryTextSelected
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subcategory Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Sous-catégorie *</Text>
          <TextInput
            style={styles.input}
            value={formData.subcategory}
            onChangeText={(value) => updateFormData('subcategory', value)}
            placeholder="Ex: Légume fruit"
            autoCapitalize="words"
          />
        </View>

        {/* Seasonal Toggle */}
        <View style={styles.toggleGroup}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>🌿</Text>
            <Text style={styles.toggleLabel}>Produit de saison</Text>
          </View>
          <Switch
            value={formData.isSeasonal}
            onValueChange={(value) => updateFormData('isSeasonal', value)}
            trackColor={{ false: colors.backgroundDark, true: colors.primaryLight }}
            thumbColor={formData.isSeasonal ? colors.primary : colors.textLight}
          />
        </View>

        {/* Month Selection */}
        {formData.isSeasonal && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>📅 Mois de disponibilité</Text>
            <View style={styles.monthsGrid}>
              {MONTHS.map((month) => (
                <TouchableOpacity
                  key={month.id}
                  style={[
                    styles.monthOption,
                    formData.selectedMonths.includes(month.id) && styles.monthOptionSelected
                  ]}
                  onPress={() => handleMonthToggle(month.id)}
                >
                  <Text style={[
                    styles.monthText,
                    formData.selectedMonths.includes(month.id) && styles.monthTextSelected
                  ]}>
                    {month.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {formData.selectedMonths.length > 0 && (
              <View style={styles.peakMonthsSection}>
                <Text style={styles.subLabel}>Mois de pic de saison (optionnel)</Text>
                <View style={styles.monthsGrid}>
                  {MONTHS.filter(month => formData.selectedMonths.includes(month.id)).map((month) => (
                    <TouchableOpacity
                      key={month.id}
                      style={[
                        styles.monthOption,
                        styles.peakMonthOption,
                        formData.peakMonths.includes(month.id) && styles.peakMonthOptionSelected
                      ]}
                      onPress={() => handlePeakMonthToggle(month.id)}
                    >
                      <Text style={[
                        styles.monthText,
                        formData.peakMonths.includes(month.id) && styles.monthTextSelected
                      ]}>
                        {month.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Description Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            placeholder="Description courte"
            multiline
          />
        </View>

        {/* Tags */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tags</Text>
          <Text style={styles.helperText}>
            Les tags permettent de filtrer rapidement les ingrédients
          </Text>
          <View style={styles.tagsContainer}>
            {formData.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)}>
                  <Text style={styles.tagRemove}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Nouveau tag"
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
                <Text style={styles.addTagText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={formData.notes}
            onChangeText={(value) => updateFormData('notes', value)}
            placeholder="Informations supplémentaires..."
            multiline
            numberOfLines={3}
          />
        </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity 
              style={[commonStyles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={[commonStyles.secondaryButtonText, styles.cancelButtonText]}>
                Annuler
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[commonStyles.button, commonStyles.primaryButton, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={commonStyles.buttonText}>
                {loading ? 'Création...' : 'Ajouter l\'ingrédient'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  container: {
    flex: 1,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    padding: spacing.screenPadding,
  },
  
  infoBox: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.cardPadding,
    borderRadius: spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  
  infoIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  
  infoText: {
    ...typography.styles.small,
    color: colors.primary,
    flex: 1,
  },
  
  formGroup: {
    marginBottom: spacing.xl,
  },
  
  label: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  
  subLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  
  helperText: {
    ...typography.styles.small,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  
  input: {
    ...commonStyles.input,
  },
  
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.cardPadding,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.backgroundDark,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '45%',
  },
  
  categoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  categoryIcon: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.sm,
  },
  
  categoryText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  
  categoryTextSelected: {
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
  
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.backgroundDark,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.xl,
  },
  
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  toggleIcon: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.sm,
  },
  
  toggleLabel: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },
  
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  monthOption: {
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  
  monthOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  peakMonthOption: {
    borderColor: colors.warning,
  },
  
  peakMonthOptionSelected: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  
  monthText: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },
  
  monthTextSelected: {
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
  
  peakMonthsSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  
  tagText: {
    ...typography.styles.small,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  
  tagRemove: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: spacing.borderRadius.xl,
    paddingLeft: spacing.md,
  },
  
  tagInput: {
    ...typography.styles.small,
    color: colors.primary,
    flex: 1,
    paddingVertical: spacing.xs,
  },
  
  addTagButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  
  addTagText: {
    ...typography.styles.body,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  
  bottomActions: {
    flexDirection: 'row',
    padding: spacing.screenPadding,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  
  cancelButtonText: {
    color: colors.textSecondary,
  },
  
  submitButton: {
    flex: 2,
  },
});