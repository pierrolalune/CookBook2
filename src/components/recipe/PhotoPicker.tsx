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
import { PhotoManager, PhotoInfo, PhotoPickerOptions } from '../../utils/photoManager';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface PhotoPickerProps {
  visible: boolean;
  onClose: () => void;
  onPhotosSelected: (photos: PhotoInfo[]) => void;
  options?: PhotoPickerOptions;
  title?: string;
  subtitle?: string;
}

interface PhotoSourceOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => Promise<void>;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  visible,
  onClose,
  onPhotosSelected,
  options = {},
  title = 'Ajouter une photo',
  subtitle = 'Choisissez comment ajouter votre photo'
}) => {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      setCurrentAction('Ouverture de l\'appareil photo...');
      
      const photo = await PhotoManager.takePhoto(options);
      
      if (photo) {
        onPhotosSelected([photo]);
        onClose();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'appareil photo');
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setLoading(true);
      setCurrentAction('Ouverture de la galerie...');
      
      const photos = await PhotoManager.pickFromGallery(options);
      
      if (photos.length > 0) {
        onPhotosSelected(photos);
        onClose();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie');
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const photoSources: PhotoSourceOption[] = [
    {
      id: 'camera',
      title: 'Prendre une photo',
      subtitle: 'Utilisez l\'appareil photo',
      icon: 'camera',
      onPress: handleTakePhoto
    },
    {
      id: 'gallery',
      title: options.allowsMultipleSelection ? 'Choisir des photos' : 'Choisir une photo',
      subtitle: options.allowsMultipleSelection 
        ? `Sélectionnez jusqu'à ${options.selectionLimit || 'plusieurs'} photos`
        : 'Sélectionnez depuis la galerie',
      icon: 'images',
      onPress: handlePickFromGallery
    }
  ];

  const renderSourceOption = (source: PhotoSourceOption) => (
    <TouchableOpacity
      key={source.id}
      style={styles.sourceOption}
      onPress={source.onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={styles.sourceIconContainer}>
        <Ionicons
          name={source.icon}
          size={32}
          color={loading ? colors.textLight : colors.primary}
        />
      </View>
      
      <View style={styles.sourceTextContainer}>
        <Text style={[
          styles.sourceTitle,
          loading && styles.disabledText
        ]}>
          {source.title}
        </Text>
        <Text style={[
          styles.sourceSubtitle,
          loading && styles.disabledText
        ]}>
          {source.subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={loading ? colors.textLight : colors.textSecondary}
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <ErrorBoundary>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
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

            {/* Photo Sources */}
            {!loading && (
              <ScrollView
                style={styles.sourcesContainer}
                contentContainerStyle={styles.sourcesContent}
                showsVerticalScrollIndicator={false}
              >
                {photoSources.map(renderSourceOption)}
                
                {/* Photo Guidelines */}
                <View style={styles.guidelinesContainer}>
                  <Text style={styles.guidelinesTitle}>Conseils pour de meilleures photos :</Text>
                  
                  <View style={styles.guideline}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.guidelineText}>
                      Éclairage naturel de préférence
                    </Text>
                  </View>
                  
                  <View style={styles.guideline}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.guidelineText}>
                      Centrez le plat dans la photo
                    </Text>
                  </View>
                  
                  <View style={styles.guideline}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.guidelineText}>
                      Évitez les photos floues
                    </Text>
                  </View>
                  
                  <View style={styles.guideline}>
                    <Ionicons name="information-circle" size={16} color={colors.primary} />
                    <Text style={styles.guidelineText}>
                      Maximum 5MB par photo
                    </Text>
                  </View>
                </View>
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
    justifyContent: 'flex-end',
  },

  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    maxHeight: '80%',
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

  sourcesContainer: {
    flex: 1,
  },

  sourcesContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },

  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sourceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  sourceTextContainer: {
    flex: 1,
  },

  sourceTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  sourceSubtitle: {
    ...typography.styles.small,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  disabledText: {
    color: colors.textLight,
  },

  guidelinesContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  guidelinesTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  guidelineText: {
    ...typography.styles.small,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
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