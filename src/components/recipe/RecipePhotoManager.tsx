import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { useRecipePhotos } from '../../hooks/useRecipePhotos';
import { PhotoPicker } from './PhotoPicker';
import { PhotoCarousel } from './PhotoCarousel';
import { PhotoInfo, PhotoPickerOptions } from '../../utils/photoManager';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface RecipePhotoManagerProps {
  recipeId: string;
  editable?: boolean;
  height?: number;
  borderRadius?: number;
  maxPhotos?: number;
  showAddButton?: boolean;
  showTitle?: boolean;
  onPhotosChange?: (photos: string[]) => void;
}

export const RecipePhotoManager: React.FC<RecipePhotoManagerProps> = ({
  recipeId,
  editable = false,
  height = 200,
  borderRadius = spacing.borderRadius.md,
  maxPhotos = 10,
  showAddButton = true,
  showTitle = true,
  onPhotosChange
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [addingPhotos, setAddingPhotos] = useState(false);
  
  const { photos, loading, error, actions } = useRecipePhotos(recipeId);

  // Notify parent component of photo changes
  React.useEffect(() => {
    onPhotosChange?.(photos);
  }, [photos, onPhotosChange]);

  const handleAddPhotos = useCallback(async (photoInfos: PhotoInfo[]) => {
    if (photoInfos.length === 0) return;

    // Check photo limit
    if (photos.length + photoInfos.length > maxPhotos) {
      Alert.alert(
        'Limite atteinte',
        `Vous ne pouvez ajouter que ${maxPhotos - photos.length} photo(s) supplémentaire(s).`
      );
      return;
    }

    try {
      setAddingPhotos(true);
      
      const savedUris = await actions.addPhotos(photoInfos);
      
      if (savedUris.length > 0) {
        const successMessage = savedUris.length === 1 
          ? 'Photo ajoutée avec succès'
          : `${savedUris.length} photos ajoutées avec succès`;
        
        // Optional success feedback (can be removed for cleaner UX)
        // Alert.alert('Succès', successMessage);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter les photos');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter les photos');
    } finally {
      setAddingPhotos(false);
    }
  }, [photos.length, maxPhotos, actions]);

  const handleDeletePhoto = useCallback(async (photoUri: string, index: number) => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deletePhoto(photoUri);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la photo');
            }
          }
        }
      ]
    );
  }, [actions]);

  const handleDeleteAllPhotos = useCallback(() => {
    Alert.alert(
      'Supprimer toutes les photos',
      'Êtes-vous sûr de vouloir supprimer toutes les photos ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deleteAllPhotos();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer les photos');
            }
          }
        }
      ]
    );
  }, [actions]);

  const pickerOptions: PhotoPickerOptions = {
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
    allowsMultipleSelection: true,
    selectionLimit: Math.min(5, maxPhotos - photos.length) // Limit selection based on remaining slots
  };

  if (loading && photos.length === 0) {
    return (
      <ErrorBoundary>
        <View style={[styles.loadingContainer, { height }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des photos...</Text>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {/* Header */}
        {showTitle && (
          <View style={styles.header}>
            <Text style={styles.title}>
              Photos {photos.length > 0 && `(${photos.length}${maxPhotos ? `/${maxPhotos}` : ''})`}
            </Text>
            
            {editable && photos.length > 1 && (
              <TouchableOpacity
                style={styles.deleteAllButton}
                onPress={handleDeleteAllPhotos}
              >
                <Text style={styles.deleteAllButtonText}>Tout supprimer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Photo Carousel */}
        <PhotoCarousel
          photos={photos}
          height={height}
          borderRadius={borderRadius}
          editable={editable}
          onDeletePhoto={handleDeletePhoto}
          showIndicators={photos.length > 1}
          emptyStateText="Aucune photo de recette"
          placeholder={
            editable && showAddButton ? (
              <TouchableOpacity
                style={styles.addPhotoPlaceholder}
                onPress={() => setPickerVisible(true)}
                disabled={addingPhotos}
              >
                {addingPhotos ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="camera-outline" size={32} color={colors.textLight} />
                )}
                <Text style={styles.addPhotoText}>
                  {addingPhotos ? 'Ajout en cours...' : 'Ajouter une photo'}
                </Text>
              </TouchableOpacity>
            ) : undefined
          }
        />

        {/* Add Photo Button */}
        {editable && showAddButton && photos.length > 0 && photos.length < maxPhotos && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setPickerVisible(true)}
            disabled={addingPhotos}
          >
            {addingPhotos ? (
              <ActivityIndicator size="small" color={colors.textWhite} />
            ) : (
              <Ionicons name="add" size={20} color={colors.textWhite} />
            )}
            <Text style={styles.addButtonText}>
              {addingPhotos ? 'Ajout...' : 'Ajouter une photo'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Photo Limit Info */}
        {editable && photos.length >= maxPhotos && (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
            <Text style={styles.infoText}>
              Limite de {maxPhotos} photos atteinte
            </Text>
          </View>
        )}

        {/* Photo Picker Modal */}
        <PhotoPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onPhotosSelected={handleAddPhotos}
          options={pickerOptions}
          title="Ajouter des photos"
          subtitle={`Ajoutez jusqu'à ${pickerOptions.selectionLimit} photo(s) pour votre recette`}
        />
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  title: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  deleteAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.sm,
  },

  deleteAllButtonText: {
    ...typography.styles.small,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
  },

  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  addPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },

  addPhotoText: {
    ...typography.styles.body,
    color: colors.textLight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.sm,
  },

  addButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    marginTop: spacing.sm,
  },

  errorText: {
    ...typography.styles.small,
    color: colors.error,
    marginLeft: spacing.sm,
    flex: 1,
  },

  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    marginTop: spacing.sm,
  },

  infoText: {
    ...typography.styles.small,
    color: colors.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
});