import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors, spacing, typography } from '../../styles';
import { Ingredient } from '../../types';
import { SearchBar } from '../common/SearchBar';
import { IngredientSelector } from './IngredientSelector';
import { SeasonalQuickSelect } from './SeasonalQuickSelect';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { SeasonalUtils } from '../../utils/seasonalUtils';
import { useIngredientSelectionHistory } from '../../hooks/useIngredientSelectionHistory';

interface MakeableRecipesModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (selectedIngredients: string[], matchThreshold: number) => void;
  availableIngredients: Ingredient[];
  initialSelectedIds?: string[];
}

export const MakeableRecipesModal: React.FC<MakeableRecipesModalProps> = ({
  visible,
  onClose,
  onSearch,
  availableIngredients,
  initialSelectedIds = []
}) => {
  // State for selected ingredients
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchThreshold, setMatchThreshold] = useState(50); // More lenient default for ingredient-based search
  
  // History management
  const selectionHistory = useIngredientSelectionHistory();

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedIngredientIds(initialSelectedIds);
      setSearchQuery('');
    }
  }, [visible, initialSelectedIds]);

  // Filter ingredients based on search
  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    return availableIngredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(query) ||
      ingredient.category.toLowerCase().includes(query) ||
      ingredient.subcategory.toLowerCase().includes(query)
    );
  }, [availableIngredients, searchQuery]);

  // Get seasonal ingredients for quick select
  const seasonalIngredients = useMemo(() => {
    return SeasonalUtils.getSeasonalIngredients(availableIngredients);
  }, [availableIngredients]);

  // Get current season info
  const currentSeason = SeasonalUtils.getCurrentSeason();
  const currentSeasonLabel = currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1);
  const peakSeasonCount = seasonalIngredients.filter(ingredient =>
    ingredient.seasonal?.peak_months?.includes(SeasonalUtils.getCurrentMonth())
  ).length;

  // Handle ingredient selection toggle
  const handleIngredientToggle = useCallback((ingredientId: string) => {
    setSelectedIngredientIds(prev => {
      const isSelected = prev.includes(ingredientId);
      if (isSelected) {
        return prev.filter(id => id !== ingredientId);
      } else {
        return [...prev, ingredientId];
      }
    });
  }, []);

  // Handle seasonal quick select
  const handleSeasonalSelect = useCallback(() => {
    const seasonalIds = seasonalIngredients.map(ing => ing.id);
    setSelectedIngredientIds(prev => {
      // Add seasonal ingredients that aren't already selected
      const newIds = seasonalIds.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, [seasonalIngredients]);

  // Handle clear all selected ingredients
  const handleClearAll = useCallback(() => {
    setSelectedIngredientIds([]);
  }, []);


  // Handle search execution
  const handleSearch = useCallback(async () => {
    if (selectedIngredientIds.length === 0) {
      Alert.alert(
        'Aucun ingrédient sélectionné',
        'Veuillez sélectionner au moins un ingrédient pour trouver des recettes.'
      );
      return;
    }

    // Save selection to history
    try {
      const selectedIngredients = availableIngredients.filter(ing => 
        selectedIngredientIds.includes(ing.id)
      );
      const selectionName = `${selectedIngredients.slice(0, 3).map(ing => ing.name).join(', ')}${
        selectedIngredients.length > 3 ? ` +${selectedIngredients.length - 3}` : ''
      }`;
      
      await selectionHistory.saveSelection(selectionName, selectedIngredientIds, matchThreshold);
    } catch (error) {
      // Don't block the search if history saving fails
      console.warn('Failed to save selection history:', error);
    }
    onSearch(selectedIngredientIds, matchThreshold);
    onClose();
  }, [selectedIngredientIds, matchThreshold, availableIngredients, selectionHistory, onSearch, onClose]);


  return (
    <ErrorBoundary>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Que puis-je cuisiner ?</Text>
            </View>
            <Text style={styles.selectedCount}>
              {selectedIngredientIds.length} ingrédient{selectedIngredientIds.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Seasonal Ingredients Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sélection rapide</Text>
              <TouchableOpacity
                style={styles.seasonalToggleButton}
                onPress={handleSeasonalSelect}
              >
                <View style={styles.seasonalToggleContent}>
                  <Ionicons name="leaf" size={20} color={colors.success} />
                  <View style={styles.seasonalToggleText}>
                    <Text style={styles.seasonalToggleLabel}>
                      Ingrédients de saison
                    </Text>
                    <Text style={styles.seasonalToggleSubtext}>
                      {currentSeasonLabel} • {seasonalIngredients.length} disponibles
                      {peakSeasonCount > 0 && ` (${peakSeasonCount} en pic)`}
                    </Text>
                  </View>
                  {seasonalIngredients.filter(ing => selectedIngredientIds.includes(ing.id)).length > 0 && (
                    <View style={styles.seasonalSelectedBadge}>
                      <Text style={styles.seasonalSelectedText}>
                        {seasonalIngredients.filter(ing => selectedIngredientIds.includes(ing.id)).length}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Match Threshold Slider */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Seuil de correspondance: {matchThreshold}%
              </Text>
              <Text style={styles.sectionDescription}>
                Pourcentage minimum d'ingrédients pour afficher une recette
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>10%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={100}
                  step={5}
                  value={matchThreshold}
                  onValueChange={setMatchThreshold}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                />
                <Text style={styles.sliderLabel}>100%</Text>
              </View>
              <Text style={styles.thresholdDescription}>
                {matchThreshold === 100 
                  ? "Uniquement les recettes que vous pouvez faire complètement"
                  : matchThreshold >= 70
                  ? "Recettes que vous pouvez presque faire"
                  : matchThreshold >= 40
                  ? "Recettes avec plusieurs ingrédients manquants"
                  : "Toutes les recettes contenant au moins un ingrédient"}
              </Text>
            </View>

            {/* Selected Ingredients List */}
            {selectedIngredientIds.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Ingrédients sélectionnés ({selectedIngredientIds.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={handleClearAll}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={styles.clearAllButtonText}>Tout effacer</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.selectedIngredientsList}>
                  {selectedIngredientIds.map(ingredientId => {
                    const ingredient = availableIngredients.find(ing => ing.id === ingredientId);
                    if (!ingredient) return null;
                    
                    return (
                      <View key={ingredientId} style={styles.selectedIngredientItem}>
                        <Text style={styles.selectedIngredientText}>
                          {ingredient.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleIngredientToggle(ingredientId)}
                          style={styles.removeIngredientButton}
                        >
                          <Ionicons name="close" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Search and Add Ingredients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Ajouter des ingrédients
                </Text>
              </View>
              
              {/* Search Bar */}
              <SearchBar
                placeholder="Rechercher un ingrédient..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchBar}
              />
              
              {/* Ingredient Search Results */}
              {searchQuery.length >= 2 && (
                <View style={styles.searchResults}>
                  {filteredIngredients.slice(0, 10).map(ingredient => {
                    const isSelected = selectedIngredientIds.includes(ingredient.id);
                    const isInSeason = SeasonalUtils.isIngredientInSeason(ingredient);
                    
                    return (
                      <TouchableOpacity
                        key={ingredient.id}
                        style={[
                          styles.searchResultItem,
                          isSelected && styles.searchResultItemSelected
                        ]}
                        onPress={() => handleIngredientToggle(ingredient.id)}
                        disabled={isSelected}
                      >
                        <View style={styles.searchResultContent}>
                          <Text style={[
                            styles.searchResultText,
                            isSelected && styles.searchResultTextSelected
                          ]}>
                            {ingredient.name}
                          </Text>
                          <Text style={styles.searchResultCategory}>
                            {ingredient.subcategory}
                          </Text>
                        </View>
                        
                        {isInSeason && (
                          <View style={styles.seasonalIndicator}>
                            <Ionicons name="leaf" size={12} color={colors.success} />
                          </View>
                        )}
                        
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        ) : (
                          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  
                  {filteredIngredients.length === 0 && (
                    <Text style={styles.noResultsText}>
                      Aucun ingrédient trouvé pour "{searchQuery}"
                    </Text>
                  )}
                </View>
              )}
              
              {searchQuery.length < 2 && (
                <Text style={styles.searchHint}>
                  Tapez au moins 2 caractères pour rechercher des ingrédients
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.searchButton,
                selectedIngredientIds.length === 0 && styles.searchButtonDisabled
              ]}
              onPress={handleSearch}
              disabled={selectedIngredientIds.length === 0}
            >
              <Ionicons name="restaurant" size={20} color={colors.textWhite} />
              <Text style={styles.searchButtonText}>
                Trouver des recettes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ErrorBoundary>
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
    backgroundColor: colors.backgroundLight,
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  closeButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  
  headerTitle: {
    ...typography.styles.h2,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  
  selectedCount: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  
  content: {
    flex: 1,
  },
  
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  
  sectionTitle: {
    ...typography.styles.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: typography.weights.semibold,
  },
  
  sectionDescription: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  
  searchBar: {
    marginBottom: spacing.sm,
  },
  
  
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: spacing.sm,
  },
  
  sliderLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    minWidth: 30,
    textAlign: 'center',
  },
  
  thresholdDescription: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  selectedSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  
  categoryChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  
  categoryChipText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundLight,
    gap: spacing.md,
  },
  
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  cancelButtonText: {
    ...typography.styles.button,
    color: colors.textSecondary,
  },
  
  searchButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.lg,
    gap: spacing.xs,
  },
  
  searchButtonDisabled: {
    backgroundColor: colors.border,
  },
  
  searchButtonText: {
    ...typography.styles.button,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
  
  historyList: {
    gap: spacing.xs,
  },
  
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  historyItemContent: {
    flex: 1,
  },
  
  historyItemName: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs / 2,
  },
  
  historyItemDetails: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  
  selectedIngredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  
  selectedIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  selectedIngredientText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },
  
  removeIngredientButton: {
    padding: 2,
  },
  
  searchResults: {
    maxHeight: 300,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  searchResultItemSelected: {
    backgroundColor: colors.successLight,
    opacity: 0.6,
  },
  
  searchResultContent: {
    flex: 1,
  },
  
  searchResultText: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  
  searchResultTextSelected: {
    color: colors.success,
  },
  
  searchResultCategory: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  
  seasonalIndicator: {
    marginHorizontal: spacing.xs,
  },
  
  noResultsText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    fontStyle: 'italic',
  },
  
  searchHint: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.md,
    fontStyle: 'italic',
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  
  seasonalToggleButton: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  seasonalToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  seasonalToggleText: {
    flex: 1,
  },
  
  seasonalToggleLabel: {
    ...typography.styles.body,
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  
  seasonalToggleSubtext: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  
  seasonalSelectedBadge: {
    backgroundColor: colors.success,
    borderRadius: spacing.borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  
  seasonalSelectedText: {
    ...typography.styles.tiny,
    color: colors.textWhite,
    fontWeight: typography.weights.bold,
  },
  
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.error,
  },
  
  clearAllButtonText: {
    ...typography.styles.caption,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
});