import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors, spacing, typography } from '../../styles';
import { RecipeCategory, RecipeDifficulty, Ingredient } from '../../types';
import { AdvancedSearchFilters } from '../../utils/recipeSearchUtils';
import { CategoryChips } from '../common/CategoryChips';
import { SearchBar } from '../common/SearchBar';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface AdvancedSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (filters: AdvancedSearchFilters) => void;
  availableIngredients: Ingredient[];
  initialFilters?: AdvancedSearchFilters;
}

interface DifficultyOption {
  id: RecipeDifficulty | 'all';
  label: string;
  icon: string;
}

interface CategoryOption {
  id: RecipeCategory | 'favoris' | 'all';
  label: string;
  icon: string;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  visible,
  onClose,
  onSearch,
  availableIngredients,
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(
    initialFilters.includedIngredients || []
  );
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>(
    initialFilters.excludedIngredients || []
  );
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);

  const difficultyOptions: DifficultyOption[] = [
    { id: 'all', label: 'Toutes', icon: '📋' },
    { id: 'facile', label: 'Facile', icon: '🟢' },
    { id: 'moyen', label: 'Moyen', icon: '🟡' },
    { id: 'difficile', label: 'Difficile', icon: '🔴' }
  ];

  const categoryOptions: CategoryOption[] = [
    { id: 'all', label: 'Toutes', icon: '📋' },
    { id: 'favoris', label: 'Favoris', icon: '❤️' },
    { id: 'entree', label: 'Entrées', icon: '🥗' },
    { id: 'plats', label: 'Plats', icon: '🍽️' },
    { id: 'dessert', label: 'Desserts', icon: '🍰' }
  ];

  useEffect(() => {
    setFilters(initialFilters);
    setSelectedIngredients(initialFilters.includedIngredients || []);
    setExcludedIngredients(initialFilters.excludedIngredients || []);
  }, [initialFilters]);

  const updateFilter = useCallback(<K extends keyof AdvancedSearchFilters>(
    key: K,
    value: AdvancedSearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleIngredientToggle = useCallback((ingredientId: string, include: boolean) => {
    if (include) {
      setSelectedIngredients(prev => [...prev, ingredientId]);
      setExcludedIngredients(prev => prev.filter(id => id !== ingredientId));
    } else {
      setSelectedIngredients(prev => prev.filter(id => id !== ingredientId));
      if (!excludedIngredients.includes(ingredientId)) {
        setExcludedIngredients(prev => [...prev, ingredientId]);
      }
    }
  }, [excludedIngredients]);

  const handleRemoveIngredient = useCallback((ingredientId: string) => {
    setSelectedIngredients(prev => prev.filter(id => id !== ingredientId));
    setExcludedIngredients(prev => prev.filter(id => id !== ingredientId));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSelectedIngredients([]);
    setExcludedIngredients([]);
  }, []);

  const handleSearch = useCallback(() => {
    const searchFilters: AdvancedSearchFilters = {
      ...filters,
      includedIngredients: selectedIngredients.length > 0 ? selectedIngredients : undefined,
      excludedIngredients: excludedIngredients.length > 0 ? excludedIngredients : undefined
    };

    onSearch(searchFilters);
    // Delay modal close to prevent race conditions
    setTimeout(() => {
      onClose();
    }, 150);
  }, [filters, selectedIngredients, excludedIngredients, onSearch, onClose]);

  const getIngredientName = useCallback((ingredientId: string): string => {
    const ingredient = availableIngredients.find(ing => ing.id === ingredientId);
    return ingredient?.name || 'Ingrédient inconnu';
  }, [availableIngredients]);

  const renderTimeSlider = (
    label: string,
    minKey: keyof AdvancedSearchFilters,
    maxKey: keyof AdvancedSearchFilters,
    min: number,
    max: number,
    step: number,
    unit: string
  ) => {
    const minValue = (filters[minKey] as number) || min;
    const maxValue = (filters[maxKey] as number) || max;

    return (
      <View style={styles.sliderSection}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={styles.sliderContainer}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Min: {minValue}{unit}</Text>
            <Slider
              style={styles.slider}
              minimumValue={min}
              maximumValue={max}
              value={minValue}
              step={step}
              onValueChange={(value) => updateFilter(minKey, value)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
            />
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Max: {maxValue}{unit}</Text>
            <Slider
              style={styles.slider}
              minimumValue={min}
              maximumValue={max}
              value={maxValue}
              step={step}
              onValueChange={(value) => updateFilter(maxKey, value)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderIngredientSelector = () => (
    <View style={styles.ingredientSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ingrédients</Text>
        <TouchableOpacity
          onPress={() => setShowIngredientSelector(!showIngredientSelector)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleButtonText}>
            {showIngredientSelector ? 'Masquer' : 'Sélectionner'}
          </Text>
          <Ionicons 
            name={showIngredientSelector ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Selected ingredients */}
      {selectedIngredients.length > 0 && (
        <View style={styles.selectedIngredientsContainer}>
          <Text style={styles.subsectionTitle}>Inclus ({selectedIngredients.length})</Text>
          <View style={styles.ingredientChips}>
            {selectedIngredients.map(ingredientId => (
              <View key={`included-${ingredientId}`} style={[styles.ingredientChip, styles.includedChip]}>
                <Text style={styles.includedChipText}>{getIngredientName(ingredientId)}</Text>
                <TouchableOpacity 
                  onPress={() => handleRemoveIngredient(ingredientId)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="close" size={16} color={colors.success} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Excluded ingredients */}
      {excludedIngredients.length > 0 && (
        <View style={styles.selectedIngredientsContainer}>
          <Text style={styles.subsectionTitle}>Exclus ({excludedIngredients.length})</Text>
          <View style={styles.ingredientChips}>
            {excludedIngredients.map(ingredientId => (
              <View key={`excluded-${ingredientId}`} style={[styles.ingredientChip, styles.excludedChip]}>
                <Text style={styles.excludedChipText}>{getIngredientName(ingredientId)}</Text>
                <TouchableOpacity 
                  onPress={() => handleRemoveIngredient(ingredientId)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="close" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Ingredient list */}
      {showIngredientSelector && (
        <ScrollView style={styles.ingredientList} showsVerticalScrollIndicator={false}>
          {availableIngredients.map(ingredient => {
            const isIncluded = selectedIngredients.includes(ingredient.id);
            const isExcluded = excludedIngredients.includes(ingredient.id);
            
            return (
              <TouchableOpacity
                key={ingredient.id}
                style={[
                  styles.ingredientItem,
                  isIncluded && styles.includedIngredientItem,
                  isExcluded && styles.excludedIngredientItem
                ]}
                onPress={() => {
                  if (isIncluded) {
                    handleRemoveIngredient(ingredient.id);
                  } else {
                    handleIngredientToggle(ingredient.id, !isExcluded);
                  }
                }}
              >
                <Text style={[
                  styles.ingredientItemText,
                  isIncluded && styles.includedIngredientText,
                  isExcluded && styles.excludedIngredientText
                ]}>
                  {ingredient.name}
                </Text>
                <View style={styles.ingredientItemActions}>
                  {!isIncluded && !isExcluded && (
                    <>
                      <TouchableOpacity
                        onPress={() => handleIngredientToggle(ingredient.id, true)}
                        style={styles.includeButton}
                      >
                        <Ionicons name="add" size={16} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleIngredientToggle(ingredient.id, false)}
                        style={styles.excludeButton}
                      >
                        <Ionicons name="remove" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </>
                  )}
                  {(isIncluded || isExcluded) && (
                    <Ionicons 
                      name={isIncluded ? "checkmark" : "close"} 
                      size={16} 
                      color={isIncluded ? colors.success : colors.error} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <ErrorBoundary>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Recherche avancée</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Difficulty filter */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Difficulté</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionsRow}>
                    {difficultyOptions.map(option => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionButton,
                          filters.difficulty === option.id && styles.selectedOption
                        ]}
                        onPress={() => updateFilter('difficulty', option.id)}
                      >
                        <Text style={styles.optionIcon}>{option.icon}</Text>
                        <Text style={[
                          styles.optionText,
                          filters.difficulty === option.id && styles.selectedOptionText
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Time filters */}
              {renderTimeSlider('Temps de préparation', 'prepTimeMin', 'prepTimeMax', 0, 120, 5, 'min')}
              {renderTimeSlider('Temps de cuisson', 'cookTimeMin', 'cookTimeMax', 0, 240, 10, 'min')}

              {/* Simple toggle for favorites */}
              <View style={styles.section}>
                <View style={styles.toggleOption}>
                  <Text style={styles.toggleLabel}>Favoris seulement</Text>
                  <Switch
                    value={filters.favoritesOnly || false}
                    onValueChange={(value) => updateFilter('favoritesOnly', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Effacer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
              >
                <Ionicons name="search" size={20} color={colors.textWhite} />
                <Text style={styles.searchButtonText}>Rechercher</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ErrorBoundary>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },

  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.xl,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    minHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  title: {
    ...typography.styles.h2,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  closeButton: {
    padding: spacing.xs,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  section: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  subsectionTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  toggleButtonText: {
    ...typography.styles.small,
    color: colors.primary,
    marginRight: spacing.xs,
  },

  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  optionIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },

  optionText: {
    ...typography.styles.small,
    color: colors.textSecondary,
  },

  selectedOptionText: {
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  sliderSection: {
    marginBottom: spacing.xl,
  },

  sliderContainer: {
    paddingHorizontal: spacing.sm,
  },

  sliderRow: {
    marginBottom: spacing.md,
  },

  sliderLabel: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  slider: {
    height: 40,
  },

  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.backgroundLight,
  },

  toggleLabel: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },

  ingredientSection: {
    marginBottom: spacing.xl,
  },

  selectedIngredientsContainer: {
    marginBottom: spacing.md,
  },

  ingredientChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    gap: spacing.xs,
  },

  includedChip: {
    backgroundColor: colors.successLight,
  },

  excludedChip: {
    backgroundColor: colors.errorLight,
  },

  includedChipText: {
    ...typography.styles.small,
    color: colors.success,
  },

  excludedChipText: {
    ...typography.styles.small,
    color: colors.error,
  },

  ingredientList: {
    maxHeight: 150,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  includedIngredientItem: {
    backgroundColor: colors.successLight,
  },

  excludedIngredientItem: {
    backgroundColor: colors.errorLight,
  },

  ingredientItemText: {
    ...typography.styles.body,
    color: colors.textPrimary,
    flex: 1,
  },

  includedIngredientText: {
    color: colors.success,
  },

  excludedIngredientText: {
    color: colors.error,
  },

  ingredientItemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  includeButton: {
    padding: spacing.xs,
  },

  excludeButton: {
    padding: spacing.xs,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  clearButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  clearButtonText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  searchButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.xs,
  },

  searchButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
});