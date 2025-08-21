import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { SecureErrorHandler } from './errorHandler';
import { ValidationUtils } from './validation';

export interface PhotoInfo {
  uri: string;
  width: number;
  height: number;
  type?: string;
  size?: number;
  fileName?: string;
}

export interface PhotoPickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
}

export class PhotoManager {
  private static readonly PHOTOS_DIR = `${FileSystem.documentDirectory}recipe-photos/`;
  private static readonly MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

  /**
   * Initialize photo directory
   */
  static async initializePhotoDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.PHOTOS_DIR, { intermediates: true });
      }
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'initializePhotoDirectory' 
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'initialize',
        'photo directory'
      );
    }
  }

  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
        Alert.alert(
          'Permissions requises',
          'L\'application a besoin d\'accéder à votre appareil photo et à votre galerie pour gérer les photos de recettes.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'requestPermissions' 
      });
      return false;
    }
  }

  /**
   * Pick photo from camera
   */
  static async takePhoto(options: PhotoPickerOptions = {}): Promise<PhotoInfo | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [16, 9],
        quality: options.quality ?? 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const validation = await this.validatePhoto(asset);
      
      if (!validation.isValid) {
        Alert.alert('Photo invalide', validation.error || 'Format de photo non supporté');
        return null;
      }

      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type || undefined,
        size: asset.fileSize || undefined,
        fileName: asset.fileName || undefined
      };
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'takePhoto' 
      });
      Alert.alert('Erreur', 'Impossible de prendre la photo');
      return null;
    }
  }

  /**
   * Pick photo from gallery
   */
  static async pickFromGallery(options: PhotoPickerOptions = {}): Promise<PhotoInfo[]> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [16, 9],
        quality: options.quality ?? 0.8,
        allowsMultipleSelection: options.allowsMultipleSelection ?? false,
        selectionLimit: options.selectionLimit ?? 1,
        exif: false,
      });

      if (result.canceled || !result.assets) {
        return [];
      }

      const validPhotos: PhotoInfo[] = [];
      
      for (const asset of result.assets) {
        const validation = await this.validatePhoto(asset);
        
        if (validation.isValid) {
          validPhotos.push({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            type: asset.type || undefined,
            size: asset.fileSize || undefined,
            fileName: asset.fileName || undefined
          });
        } else if (result.assets.length === 1) {
          // Show error only if single selection
          Alert.alert('Photo invalide', validation.error || 'Format de photo non supporté');
        }
      }

      return validPhotos;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'pickFromGallery' 
      });
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
      return [];
    }
  }

  /**
   * Save photo to app storage
   */
  static async savePhoto(photoUri: string, recipeId: string): Promise<string> {
    try {
      await this.initializePhotoDirectory();
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = this.getFileExtension(photoUri) || 'jpg';
      const fileName = `${recipeId}_${timestamp}.${extension}`;
      const localUri = `${this.PHOTOS_DIR}${fileName}`;

      // Copy photo to app storage
      await FileSystem.copyAsync({
        from: photoUri,
        to: localUri
      });

      // Verify file was saved
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        throw new Error('Failed to save photo');
      }

      return localUri;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'savePhoto',
        recipeId 
      });
      throw SecureErrorHandler.handleDatabaseError(
        error as Error,
        'save',
        'photo'
      );
    }
  }

  /**
   * Delete photo from app storage
   */
  static async deletePhoto(photoUri: string): Promise<void> {
    try {
      if (!photoUri || !photoUri.includes(this.PHOTOS_DIR)) {
        // Only delete photos in our directory
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(photoUri);
      }
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'deletePhoto',
        photoId: photoUri 
      });
      // Don't throw for delete errors - log and continue
    }
  }

  /**
   * Delete all photos for a recipe
   */
  static async deleteRecipePhotos(recipeId: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (!dirInfo.exists) {
        return;
      }

      const files = await FileSystem.readDirectoryAsync(this.PHOTOS_DIR);
      const recipePhotos = files.filter(file => file.startsWith(`${recipeId}_`));

      await Promise.all(
        recipePhotos.map(fileName => 
          this.deletePhoto(`${this.PHOTOS_DIR}${fileName}`)
        )
      );
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'deleteRecipePhotos',
        recipeId 
      });
      // Don't throw for delete errors
    }
  }

  /**
   * Get all photos for a recipe
   */
  static async getRecipePhotos(recipeId: string): Promise<string[]> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(this.PHOTOS_DIR);
      const recipePhotos = files
        .filter(file => file.startsWith(`${recipeId}_`))
        .map(fileName => `${this.PHOTOS_DIR}${fileName}`)
        .sort(); // Sort for consistent ordering

      return recipePhotos;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'getRecipePhotos',
        recipeId 
      });
      return [];
    }
  }

  /**
   * Compress photo for better performance
   */
  static async compressPhoto(photoUri: string, quality: number = 0.7): Promise<string> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: Math.max(0.1, Math.min(1.0, quality)),
        base64: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return photoUri; // Return original if compression fails
      }

      return result.assets[0].uri;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'compressPhoto' 
      });
      return photoUri; // Return original if compression fails
    }
  }

  /**
   * Get photo dimensions
   */
  static async getPhotoDimensions(photoUri: string): Promise<{ width: number; height: number } | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.1, // Low quality just to get dimensions
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        width: asset.width,
        height: asset.height
      };
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'getPhotoDimensions' 
      });
      return null;
    }
  }

  /**
   * Validate photo before processing
   */
  private static async validatePhoto(asset: ImagePicker.ImagePickerAsset): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      // Check file size
      if (asset.fileSize && asset.fileSize > this.MAX_PHOTO_SIZE) {
        return {
          isValid: false,
          error: `La photo est trop grande (max ${Math.round(this.MAX_PHOTO_SIZE / (1024 * 1024))}MB)`
        };
      }

      // Check file format
      const extension = this.getFileExtension(asset.uri);
      if (extension && !this.SUPPORTED_FORMATS.includes(extension.toLowerCase())) {
        return {
          isValid: false,
          error: `Format non supporté. Formats acceptés: ${this.SUPPORTED_FORMATS.join(', ')}`
        };
      }

      // Check dimensions (minimum size)
      if (asset.width < 200 || asset.height < 200) {
        return {
          isValid: false,
          error: 'La photo est trop petite (minimum 200x200 pixels)'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Impossible de valider la photo'
      };
    }
  }

  /**
   * Get file extension from URI
   */
  private static getFileExtension(uri: string): string | null {
    const match = uri.match(/\.([^.]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Clean up orphaned photos (photos not linked to any recipe)
   */
  static async cleanupOrphanedPhotos(existingRecipeIds: string[]): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (!dirInfo.exists) {
        return;
      }

      const files = await FileSystem.readDirectoryAsync(this.PHOTOS_DIR);
      const orphanedFiles: string[] = [];

      for (const fileName of files) {
        const recipeId = fileName.split('_')[0];
        if (!existingRecipeIds.includes(recipeId)) {
          orphanedFiles.push(fileName);
        }
      }

      // Delete orphaned files
      await Promise.all(
        orphanedFiles.map(fileName => 
          this.deletePhoto(`${this.PHOTOS_DIR}${fileName}`)
        )
      );

      if (orphanedFiles.length > 0) {
        console.log(`Cleaned up ${orphanedFiles.length} orphaned photos`);
      }
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'cleanupOrphanedPhotos' 
      });
    }
  }
}