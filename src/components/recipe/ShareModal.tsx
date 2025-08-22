import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { Recipe } from '../../types';
import { RecipeExporter } from '../../utils/recipeExporter';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  recipe?: Recipe;
  recipes?: Recipe[];
  mode?: 'single' | 'multiple';
  title?: string;
}

interface ShareOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  format?: 'text' | 'pdf' | 'json';
  action: () => Promise<void>;
  disabled?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  recipe,
  recipes = [],
  mode = 'single',
  title
}) => {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');

  const getTitle = () => {
    if (title) return title;
    
    switch (mode) {
      case 'multiple':
        return `Partager ${recipes.length} recette${recipes.length > 1 ? 's' : ''}`;
      default:
        return `Partager "${recipe?.name}"`;
    }
  };

  const handleShare = async (format: 'text' | 'pdf' | 'json', actionName: string) => {
    if (!recipe && mode === 'single') {
      Alert.alert('Erreur', 'Aucune recette sélectionnée');
      return;
    }

    try {
      setLoading(true);
      setCurrentAction(actionName);

      if (mode === 'single' && recipe) {
        await RecipeExporter.shareRecipe(recipe, format);
      } else if (mode === 'multiple' && recipes.length > 0) {
        // For multiple recipes, create concatenated content (only text and PDF supported)
        const multiFormat = format === 'json' ? 'text' : format as 'text' | 'pdf';
        await RecipeExporter.shareMultipleRecipes(recipes, multiFormat);
      }

      onClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager la recette');
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handleExportOnly = async (format: 'text' | 'pdf' | 'json', actionName: string) => {
    if (!recipe && mode === 'single') {
      Alert.alert('Erreur', 'Aucune recette sélectionnée');
      return;
    }

    try {
      setLoading(true);
      setCurrentAction(actionName);

      let filePath: string;
      
      if (mode === 'single' && recipe) {
        switch (format) {
          case 'pdf':
            filePath = await RecipeExporter.exportToPDF(recipe);
            break;
          case 'json':
            filePath = await RecipeExporter.exportToJSON(recipe);
            break;
          default:
            filePath = await RecipeExporter.exportToText(recipe);
        }
      } else if (mode === 'multiple' && recipes.length > 0) {
        // For multiple recipes, export them individually for now
        const exportPromises = recipes.map(async (recipeToExport) => {
          switch (format) {
            case 'pdf':
              return await RecipeExporter.exportToPDF(recipeToExport);
            case 'json':
              return await RecipeExporter.exportToJSON(recipeToExport);
            default:
              return await RecipeExporter.exportToText(recipeToExport);
          }
        });
        await Promise.all(exportPromises);
        filePath = 'Multiple files exported';
      } else {
        throw new Error('Mode non supporté pour l\'export');
      }

      Alert.alert(
        'Export terminé',
        `Le fichier a été sauvegardé dans vos documents.`,
        [{ text: 'OK' }]
      );
      
      onClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter la recette');
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const getShareOptions = (): ShareOption[] => {
    // Single or multiple recipe options - only sharing options
    return [
      {
        id: 'share-text',
        title: 'Partager en texte',
        subtitle: 'WhatsApp, SMS, Email...',
        icon: 'chatbubble-ellipses',
        format: 'text',
        action: () => handleShare('text', 'Partage en texte...')
      },
      {
        id: 'share-pdf',
        title: 'Partager en PDF',
        subtitle: 'Format imprimable',
        icon: 'document',
        format: 'pdf',
        action: () => handleShare('pdf', 'Création du PDF...')
      }
    ];
  };

  const shareOptions = getShareOptions();

  const renderShareOption = (option: ShareOption) => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.shareOption,
        option.disabled && styles.disabledOption
      ]}
      onPress={option.action}
      disabled={loading || option.disabled}
      activeOpacity={0.7}
    >
      <View style={[
        styles.shareIconContainer,
        option.disabled && styles.disabledIconContainer
      ]}>
        <Ionicons
          name={option.icon}
          size={24}
          color={option.disabled ? colors.textLight : colors.primary}
        />
      </View>
      
      <View style={styles.shareTextContainer}>
        <Text style={[
          styles.shareTitle,
          (loading || option.disabled) && styles.disabledText
        ]}>
          {option.title}
        </Text>
        <Text style={[
          styles.shareSubtitle,
          (loading || option.disabled) && styles.disabledText
        ]}>
          {option.subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={option.disabled ? colors.textLight : colors.textSecondary}
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <ErrorBoundary>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.title}>{getTitle()}</Text>
                <Text style={styles.subtitle}>
                  Choisissez comment partager ou exporter
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                disabled={loading}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={loading ? colors.textLight : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{currentAction}</Text>
              </View>
            )}

            {/* Share Options */}
            {!loading && (
              <ScrollView
                style={styles.optionsContainer}
                contentContainerStyle={styles.optionsContent}
                showsVerticalScrollIndicator={false}
              >
                {shareOptions.length === 0 ? (
                  <Text style={styles.noOptionsText}>Aucune option disponible</Text>
                ) : (
                  shareOptions.map(renderShareOption)
                )}
              </ScrollView>
            )}

            {/* Cancel Button */}
            {!loading && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ErrorBoundary>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  container: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.xl,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },

  headerContent: {
    flex: 1,
    marginRight: spacing.md,
  },

  title: {
    ...typography.styles.h2,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  closeButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  optionsContainer: {
    maxHeight: 400,
  },

  optionsContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },

  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  disabledOption: {
    backgroundColor: colors.backgroundLight,
    opacity: 0.5,
  },

  shareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  disabledIconContainer: {
    backgroundColor: colors.backgroundLight,
  },

  shareTextContainer: {
    flex: 1,
  },

  shareTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  shareSubtitle: {
    ...typography.styles.small,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  disabledText: {
    color: colors.textLight,
  },

  noOptionsText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },

  cancelButton: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
  },

  cancelButtonText: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
});