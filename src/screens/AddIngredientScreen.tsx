import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIngredients } from '../hooks/useIngredients';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { ModernInput } from '../components/common/ModernInput';
import { DropdownSelector } from '../components/common/DropdownSelector';
import { ModernToggle } from '../components/common/ModernToggle';
import { CategorySelector } from '../components/common/CategorySelector';
import { SeasonalMonthSelector } from '../components/common/SeasonalMonthSelector';
import { IngredientCategory, CreateIngredientInput, SeasonalData } from '../types';
import { colors, spacing, typography } from '../styles';

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

const CATEGORIES = [
  { id: 'fruits' as IngredientCategory, name: 'Fruits', icon: '🍎' },
  { id: 'legumes' as IngredientCategory, name: 'Légumes', icon: '🥬' },
  { id: 'peche' as IngredientCategory, name: 'Poisson', icon: '🐟' },
  { id: 'viande' as IngredientCategory, name: 'Viande', icon: '🥩' },
  { id: 'produits_laitiers' as IngredientCategory, name: 'Produits laitiers', icon: '🥛' },
  { id: 'epicerie' as IngredientCategory, name: 'Épicerie', icon: '🛒' },
];

const SUBCATEGORY_OPTIONS = {
  fruits: [
    { value: 'agrumes', label: 'Agrumes' },
    { value: 'fruits_rouges', label: 'Fruits rouges' },
    { value: 'fruits_tropicaux', label: 'Fruits tropicaux' },
    { value: 'fruits_a_noyau', label: 'Fruits à noyau' },
    { value: 'fruits_a_pepin', label: 'Fruits à pépin' },
  ],
  legumes: [
    { value: 'legumes_racines', label: 'Légumes racines' },
    { value: 'legumes_feuilles', label: 'Légumes feuilles' },
    { value: 'legumes_fruits', label: 'Légumes fruits' },
    { value: 'legumes_fleurs', label: 'Légumes fleurs' },
    { value: 'legumes_tiges', label: 'Légumes tiges' },
  ],
  peche: [
    { value: 'poisson_blanc', label: 'Poisson blanc' },
    { value: 'poisson_gras', label: 'Poisson gras' },
    { value: 'crustaces', label: 'Crustacés' },
    { value: 'mollusques', label: 'Mollusques' },
  ],
  viande: [
    { value: 'boeuf', label: 'Bœuf' },
    { value: 'porc', label: 'Porc' },
    { value: 'volaille', label: 'Volaille' },
    { value: 'agneau', label: 'Agneau' },
    { value: 'gibier', label: 'Gibier' },
  ],
  produits_laitiers: [
    { value: 'lait', label: 'Lait' },
    { value: 'fromage', label: 'Fromage' },
    { value: 'yaourt', label: 'Yaourt' },
    { value: 'creme', label: 'Crème' },
    { value: 'beurre', label: 'Beurre' },
  ],
  epicerie: [
    { value: 'cereales', label: 'Céréales' },
    { value: 'legumineuses', label: 'Légumineuses' },
    { value: 'condiments', label: 'Condiments' },
    { value: 'epices', label: 'Épices' },
    { value: 'huiles', label: 'Huiles' },
  ],
  autres: [
    { value: 'divers', label: 'Divers' },
    { value: 'non_classe', label: 'Non classé' },
  ],
};

const DEFAULT_UNITS = ['pièce', 'kg', 'g', 'L', 'ml', 'c. à soupe', 'c. à café'];

export const AddIngredientScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { actions, loading } = useIngredients();

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

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (category: IngredientCategory) => {
    updateFormData('category', category);
    updateFormData('subcategory', ''); // Reset subcategory when category changes
  };

  const handleMonthToggle = (monthId: number) => {
    const isSelected = formData.selectedMonths.includes(monthId);
    const newSelectedMonths = isSelected
      ? formData.selectedMonths.filter(id => id !== monthId)
      : [...formData.selectedMonths, monthId];
    
    updateFormData('selectedMonths', newSelectedMonths);
    
    // Remove from peak months if unselected from regular months
    if (isSelected && formData.peakMonths.includes(monthId)) {
      const newPeakMonths = formData.peakMonths.filter(id => id !== monthId);
      updateFormData('peakMonths', newPeakMonths);
    }
    
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
      const newIngredient = await actions.createIngredient(createInput);
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

  const currentSubcategoryOptions = SUBCATEGORY_OPTIONS[formData.category] || [];

  return (
    <ScreenErrorBoundary>
      <View style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nouvel Ingrédient</Text>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>ℹ️</Text>
            </View>
            <Text style={styles.infoText}>
              Cet ingrédient sera automatiquement ajouté à "Mes produits" et à la catégorie sélectionnée
            </Text>
          </View>
        </LinearGradient>

        {/* Form Content */}
        <KeyboardAvoidingView 
          style={styles.formContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ingredient Name */}
            <ModernInput
              label="Nom de l'ingrédient"
              required
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholder="Ex: Tomate cerise"
              autoCapitalize="words"
            />

            {/* Category Selection */}
            <CategorySelector
              label="Catégorie principale"
              required
              categories={CATEGORIES}
              selectedCategory={formData.category}
              onSelect={handleCategoryChange}
            />

            {/* Subcategory Selection */}
            <DropdownSelector
              label="Sous-catégorie"
              required
              value={formData.subcategory}
              placeholder="Sélectionner une sous-catégorie"
              options={currentSubcategoryOptions}
              onSelect={(value) => updateFormData('subcategory', value)}
            />

            {/* Seasonal Toggle */}
            <ModernToggle
              label="Produit de saison"
              icon="🌿"
              value={formData.isSeasonal}
              onValueChange={(value) => {
                updateFormData('isSeasonal', value);
                if (!value) {
                  updateFormData('selectedMonths', []);
                  updateFormData('peakMonths', []);
                  updateFormData('season', '');
                }
              }}
            />

            {/* Seasonal Month Selection */}
            <SeasonalMonthSelector
              selectedMonths={formData.selectedMonths}
              peakMonths={formData.peakMonths}
              onMonthToggle={handleMonthToggle}
              onPeakMonthToggle={handlePeakMonthToggle}
              isVisible={formData.isSeasonal}
            />

            {/* Description */}
            <ModernInput
              label="Description"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Ajoutez des notes ou informations supplémentaires..."
              multiline
              characterLimit={200}
              showCharacterCount
            />
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.bottomActions, { paddingBottom: insets.bottom }]}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonIcon}>✕</Text>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonIcon}>✓</Text>
                <Text style={styles.submitButtonText}>
                  {loading ? 'Création...' : 'Ajouter l\'ingrédient'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '300',
  },

  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },

  infoBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  infoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#667eea',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoIconText: {
    color: 'white',
    fontSize: 20,
  },

  infoText: {
    flex: 1,
    color: '#5a6c7d',
    fontSize: 14,
    lineHeight: 20,
  },

  formContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 25,
    paddingBottom: 100,
  },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },

  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f7fa',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  cancelButtonIcon: {
    fontSize: 16,
    color: '#5a6c7d',
  },

  cancelButtonText: {
    fontSize: 16,
    color: '#5a6c7d',
    fontWeight: '600',
  },

  submitButton: {
    flex: 1,
    borderRadius: 15,
  },

  submitButtonGradient: {
    padding: 16,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  submitButtonIcon: {
    fontSize: 16,
    color: 'white',
  },

  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});