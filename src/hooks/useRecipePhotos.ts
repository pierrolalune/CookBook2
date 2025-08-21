import { useState, useEffect, useCallback } from 'react';
import { PhotoManager, PhotoInfo } from '../utils/photoManager';
import { SecureErrorHandler } from '../utils/errorHandler';

interface UseRecipePhotosState {
  photos: string[];
  loading: boolean;
  error: string | null;
}

interface UseRecipePhotosActions {
  loadPhotos: () => Promise<void>;
  addPhotos: (photoInfos: PhotoInfo[]) => Promise<string[]>;
  deletePhoto: (photoUri: string) => Promise<void>;
  deleteAllPhotos: () => Promise<void>;
  refreshPhotos: () => Promise<void>;
}

interface UseRecipePhotosReturn {
  photos: string[];
  loading: boolean;
  error: string | null;
  actions: UseRecipePhotosActions;
}

export const useRecipePhotos = (recipeId: string): UseRecipePhotosReturn => {
  const [state, setState] = useState<UseRecipePhotosState>({
    photos: [],
    loading: false,
    error: null
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<UseRecipePhotosState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load photos for the recipe
  const loadPhotos = useCallback(async (): Promise<void> => {
    if (!recipeId) return;

    try {
      updateState({ loading: true, error: null });
      
      const photos = await PhotoManager.getRecipePhotos(recipeId);
      updateState({ photos, loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
    }
  }, [recipeId, updateState]);

  // Add new photos to the recipe
  const addPhotos = useCallback(async (photoInfos: PhotoInfo[]): Promise<string[]> => {
    if (!recipeId || photoInfos.length === 0) return [];

    try {
      updateState({ loading: true, error: null });
      
      // Initialize photo directory if needed
      await PhotoManager.initializePhotoDirectory();
      
      // Save all photos
      const savedPhotoUris: string[] = [];
      for (const photoInfo of photoInfos) {
        try {
          const savedUri = await PhotoManager.savePhoto(photoInfo.uri, recipeId);
          savedPhotoUris.push(savedUri);
        } catch (error) {
          SecureErrorHandler.logError(error as Error, { 
            action: 'addPhoto', 
            recipeId, 
            photoId: photoInfo.uri 
          });
          // Continue with other photos if one fails
        }
      }
      
      // Update state with new photos
      setState(prev => ({
        ...prev,
        photos: [...prev.photos, ...savedPhotoUris],
        loading: false
      }));
      
      return savedPhotoUris;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      return [];
    }
  }, [recipeId, updateState]);

  // Delete a specific photo
  const deletePhoto = useCallback(async (photoUri: string): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      // Remove from file system
      await PhotoManager.deletePhoto(photoUri);
      
      // Update state
      setState(prev => ({
        ...prev,
        photos: prev.photos.filter(uri => uri !== photoUri),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error; // Re-throw for UI handling
    }
  }, [updateState]);

  // Delete all photos for the recipe
  const deleteAllPhotos = useCallback(async (): Promise<void> => {
    if (!recipeId) return;

    try {
      updateState({ loading: true, error: null });
      
      // Remove all photos from file system
      await PhotoManager.deleteRecipePhotos(recipeId);
      
      // Update state
      updateState({ photos: [], loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error; // Re-throw for UI handling
    }
  }, [recipeId, updateState]);

  // Refresh photos (reload from file system)
  const refreshPhotos = useCallback(async (): Promise<void> => {
    await loadPhotos();
  }, [loadPhotos]);

  // Auto-load photos when recipeId changes
  useEffect(() => {
    if (recipeId) {
      loadPhotos();
    } else {
      setState({ photos: [], loading: false, error: null });
    }
  }, [recipeId, loadPhotos]);

  const actions: UseRecipePhotosActions = {
    loadPhotos,
    addPhotos,
    deletePhoto,
    deleteAllPhotos,
    refreshPhotos
  };

  return {
    photos: state.photos,
    loading: state.loading,
    error: state.error,
    actions
  };
};

// Hook for managing multiple photos across different recipes
export const useAllRecipePhotos = () => {
  const [loading, setLoading] = useState(false);

  // Clean up orphaned photos
  const cleanupOrphanedPhotos = useCallback(async (existingRecipeIds: string[]): Promise<void> => {
    try {
      setLoading(true);
      await PhotoManager.cleanupOrphanedPhotos(existingRecipeIds);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'cleanupOrphanedPhotos' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize photo system
  const initializePhotoSystem = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await PhotoManager.initializePhotoDirectory();
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'initializePhotoSystem' });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    actions: {
      cleanupOrphanedPhotos,
      initializePhotoSystem
    }
  };
};