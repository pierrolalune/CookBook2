import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ingredient } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';
import { SeasonalUtils } from '../../utils/seasonalUtils';

interface IngredientDetailModalProps {
  ingredient: Ingredient | null;
  visible: boolean;
  onClose: () => void;
}

export const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
  ingredient,
  visible,
  onClose,
}) => {
  if (!ingredient) return null;

  const seasonalInfo = SeasonalUtils.getSeasonalInfo(ingredient);

  const getCategoryIcon = (category: string): string => {
    const categoryIcons: { [key: string]: string } = {
      'fruits': '🍎',
      'legumes': '🥬',
      'peche': '🐟',
      'viande': '🥩',
      'produits_laitiers': '🥛',
      'epicerie': '🛒',
    };
    return categoryIcons[category] || '📋';
  };

  const getAvailabilityIcon = (): string => {
    if (!ingredient.seasonal) return '🗓️';

    const status = SeasonalUtils.getDetailedSeasonStatus(ingredient);
    const statusIcons = {
      'beginning-of-season': '🌱',
      'peak-season': '🔥',
      'end-of-season': '🍂',
      'in-season': '✅',
      'out-of-season': '❌',
      'year-round': '🗓️'
    };

    return statusIcons[status] || '🗓️';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.categoryIcon}>
                {getCategoryIcon(ingredient.category)}
              </Text>
              <View style={styles.headerText}>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                <Text style={styles.subcategory}>{ingredient.subcategory}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Seasonal Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{getAvailabilityIcon()}</Text>
                <Text style={styles.sectionTitle}>Disponibilité</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.availabilityText}>{seasonalInfo.availability}</Text>

                {seasonalInfo.peakPeriod && (
                  <View style={styles.peakSeasonContainer}>
                    <Text style={styles.peakSeasonLabel}>Pic de saison</Text>
                    <Text style={styles.peakSeasonText}>{seasonalInfo.peakPeriod}</Text>
                  </View>
                )}

                {seasonalInfo.currentStatus && ingredient.seasonal && (
                  <View style={styles.currentStatusContainer}>
                    <Text style={styles.currentStatusText}>{seasonalInfo.currentStatus}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Units */}
            {ingredient.units && ingredient.units.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>⚖️</Text>
                  <Text style={styles.sectionTitle}>Unités disponibles</Text>
                </View>
                <View style={styles.sectionContent}>
                  <View style={styles.unitsContainer}>
                    {ingredient.units.map((unit, index) => (
                      <View key={index} style={styles.unitTag}>
                        <Text style={styles.unitText}>{unit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Description */}
            {ingredient.description && ingredient.description.trim() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📝</Text>
                  <Text style={styles.sectionTitle}>Description</Text>
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.descriptionText}>{ingredient.description}</Text>
                </View>
              </View>
            )}

            {/* Notes */}
            {ingredient.notes && ingredient.notes.trim() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>💡</Text>
                  <Text style={styles.sectionTitle}>Notes</Text>
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.notesText}>{ingredient.notes}</Text>
                </View>
              </View>
            )}

            {/* Tags */}
            {ingredient.tags && ingredient.tags.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🏷️</Text>
                  <Text style={styles.sectionTitle}>Tags</Text>
                </View>
                <View style={styles.sectionContent}>
                  <View style={styles.tagsContainer}>
                    {ingredient.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* User Created Badge */}
            {ingredient.isUserCreated && (
              <View style={styles.userCreatedBadge}>
                <Text style={styles.userCreatedIcon}>⭐</Text>
                <Text style={styles.userCreatedText}>Votre création personnelle</Text>
              </View>
            )}

            {/* Bottom padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },

  modalContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.xl,
    width: screenWidth - spacing.md * 2,
    maxHeight: screenHeight * 0.8,
    ...commonStyles.shadowLarge,
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    backgroundColor: colors.primaryLight,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  categoryIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },

  headerText: {
    flex: 1,
  },

  ingredientName: {
    ...typography.styles.h2,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },

  subcategory: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },

  closeButtonText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  sectionIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },

  sectionTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  sectionContent: {
    paddingLeft: spacing.lg + spacing.xs + 18, // Align with title text
    minHeight: 30, // Ensure minimum height for content
  },

  availabilityText: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },

  peakSeasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  peakSeasonLabel: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },

  peakSeasonText: {
    ...typography.styles.small,
    color: colors.warning,
    fontWeight: typography.weights.semibold,
  },

  currentStatusContainer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadius.md,
    alignSelf: 'flex-start',
  },

  currentStatusText: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  unitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  unitTag: {
    backgroundColor: colors.backgroundDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
  },

  unitText: {
    ...typography.styles.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  descriptionText: {
    ...typography.styles.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },

  notesText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  tagText: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  userCreatedBadge: {
    margin: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.favoriteLight,
    borderRadius: spacing.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userCreatedIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },

  userCreatedText: {
    ...typography.styles.body,
    color: colors.favorite,
    fontWeight: typography.weights.semibold,
  },

  bottomPadding: {
    height: spacing.md,
  },
});
