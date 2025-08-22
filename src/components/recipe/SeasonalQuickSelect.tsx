import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { Ingredient } from '../../types';
import { SeasonalUtils } from '../../utils/seasonalUtils';

interface SeasonalQuickSelectProps {
  seasonalIngredients: Ingredient[];
  onSelectSeasonal: () => void;
  selectedCount: number;
}

interface SeasonOption {
  key: string;
  label: string;
  month: number;
  season: string;
  emoji: string;
}

const SEASON_OPTIONS: SeasonOption[] = [
  { key: 'current', label: 'Saison actuelle', month: new Date().getMonth() + 1, season: 'current', emoji: '📅' },
  { key: 'spring', label: 'Printemps', month: 4, season: 'printemps', emoji: '🌸' },
  { key: 'summer', label: 'Été', month: 7, season: 'été', emoji: '☀️' },
  { key: 'autumn', label: 'Automne', month: 10, season: 'automne', emoji: '🍂' },
  { key: 'winter', label: 'Hiver', month: 1, season: 'hiver', emoji: '❄️' },
];

const SeasonalQuickSelectModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectSeason: (month: number) => void;
  availableIngredients: Ingredient[];
}> = ({ visible, onClose, onSelectSeason, availableIngredients }) => {
  const [selectedSeasonKey, setSelectedSeasonKey] = useState('current');
  
  const getIngredientsForMonth = (month: number): Ingredient[] => {
    return availableIngredients.filter(ingredient => 
      ingredient.seasonal && ingredient.seasonal.months.includes(month)
    );
  };

  const seasonStats = useMemo(() => {
    return SEASON_OPTIONS.map(option => ({
      ...option,
      ingredientCount: getIngredientsForMonth(option.month).length,
      peakCount: availableIngredients.filter(ingredient => 
        ingredient.seasonal?.peak_months?.includes(option.month)
      ).length
    }));
  }, [availableIngredients]);

  const handleSelectSeason = () => {
    const selectedOption = SEASON_OPTIONS.find(opt => opt.key === selectedSeasonKey);
    if (selectedOption) {
      onSelectSeason(selectedOption.month);
      onClose();
    }
  };

  const previewIngredients = getIngredientsForMonth(
    SEASON_OPTIONS.find(opt => opt.key === selectedSeasonKey)?.month || new Date().getMonth() + 1
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir une saison</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {seasonStats.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.seasonOption,
                  selectedSeasonKey === option.key && styles.seasonOptionSelected
                ]}
                onPress={() => setSelectedSeasonKey(option.key)}
              >
                <View style={styles.seasonHeader}>
                  <Text style={styles.seasonEmoji}>{option.emoji}</Text>
                  <View style={styles.seasonInfo}>
                    <Text style={[
                      styles.seasonLabel,
                      selectedSeasonKey === option.key && styles.seasonLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.seasonStats}>
                      {option.ingredientCount} ingrédient{option.ingredientCount !== 1 ? 's' : ''}
                      {option.peakCount > 0 && ` • ${option.peakCount} en pleine saison`}
                    </Text>
                  </View>
                  {selectedSeasonKey === option.key && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Preview selected season ingredients */}
            {previewIngredients.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>
                  Aperçu ({previewIngredients.length} ingrédients)
                </Text>
                <View style={styles.previewIngredients}>
                  {previewIngredients.slice(0, 8).map((ingredient) => {
                    const isPeak = ingredient.seasonal?.peak_months?.includes(
                      SEASON_OPTIONS.find(opt => opt.key === selectedSeasonKey)?.month || 1
                    );
                    return (
                      <View key={ingredient.id} style={styles.previewIngredient}>
                        <Text style={styles.previewIngredientText}>
                          {ingredient.name}
                        </Text>
                        {isPeak && (
                          <Ionicons name="star" size={12} color={colors.warning} />
                        )}
                      </View>
                    );
                  })}
                  {previewIngredients.length > 8 && (
                    <Text style={styles.previewMore}>
                      +{previewIngredients.length - 8} autres...
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.selectButton} 
              onPress={handleSelectSeason}
              disabled={previewIngredients.length === 0}
            >
              <Text style={styles.selectButtonText}>
                Sélectionner ({previewIngredients.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const SeasonalQuickSelect: React.FC<SeasonalQuickSelectProps> = ({
  seasonalIngredients,
  onSelectSeasonal,
  selectedCount
}) => {

  const currentSeason = SeasonalUtils.getCurrentSeason();
  const currentSeasonLabel = currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1);
  
  const peakSeasonCount = seasonalIngredients.filter(ingredient =>
    ingredient.seasonal?.peak_months?.includes(SeasonalUtils.getCurrentMonth())
  ).length;


  const handleQuickSelect = () => {
    if (seasonalIngredients.length === 0) {
      Alert.alert(
        'Aucun ingrédient saisonnier',
        'Il n\'y a aucun ingrédient de saison disponible pour cette période.'
      );
      return;
    }
    onSelectSeasonal();
  };

  return (
    <View style={styles.container}>
      {/* Quick select current season */}
      <TouchableOpacity
        style={styles.quickSelectButton}
        onPress={handleQuickSelect}
        disabled={seasonalIngredients.length === 0}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="leaf" size={16} color={colors.success} />
          <View style={styles.buttonTextContainer}>
            <Text style={[
              styles.buttonText,
              seasonalIngredients.length === 0 && styles.buttonTextDisabled
            ]}>
              Ingrédients de saison
            </Text>
            <Text style={styles.buttonSubtext}>
              {currentSeasonLabel} • {seasonalIngredients.length} ingrédient{seasonalIngredients.length !== 1 ? 's' : ''}
              {peakSeasonCount > 0 && ` (${peakSeasonCount} en pic)`}
            </Text>
          </View>
          {selectedCount > 0 && (
            <View style={styles.selectionBadge}>
              <Text style={styles.selectionBadgeText}>{selectedCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  
  quickSelectButton: {
    backgroundColor: colors.successLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  buttonTextContainer: {
    flex: 1,
  },
  
  buttonText: {
    ...typography.styles.body,
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  
  buttonTextDisabled: {
    color: colors.textLight,
  },
  
  buttonSubtext: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  
  selectionBadge: {
    backgroundColor: colors.success,
    borderRadius: spacing.borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  
  selectionBadgeText: {
    ...typography.styles.tiny,
    color: colors.textWhite,
    fontWeight: typography.weights.bold,
  },
  
  advancedSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  
  advancedSelectText: {
    ...typography.styles.body,
    color: colors.primary,
    flex: 1,
    fontWeight: typography.weights.medium,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  modalTitle: {
    ...typography.styles.h2,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  
  modalContent: {
    maxHeight: 400,
    padding: spacing.md,
  },
  
  seasonOption: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  seasonOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  seasonEmoji: {
    fontSize: 24,
  },
  
  seasonInfo: {
    flex: 1,
  },
  
  seasonLabel: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  
  seasonLabelSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  
  seasonStats: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  
  previewSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
  },
  
  previewTitle: {
    ...typography.styles.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  
  previewIngredients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  
  previewIngredient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs / 2,
  },
  
  previewIngredientText: {
    ...typography.styles.caption,
    color: colors.textPrimary,
  },
  
  previewMore: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  
  cancelButtonText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  
  selectButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  
  selectButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },
});