import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { PhotoViewer } from './PhotoViewer';
import { ErrorBoundary } from '../common/ErrorBoundary';

const { width: screenWidth } = Dimensions.get('window');

interface PhotoCarouselProps {
  photos: string[];
  height?: number;
  borderRadius?: number;
  onPhotoPress?: (photoUri: string, index: number) => void;
  onDeletePhoto?: (photoUri: string, index: number) => void;
  editable?: boolean;
  showIndicators?: boolean;
  autoScroll?: boolean;
  autoScrollInterval?: number;
  placeholder?: React.ReactNode;
  emptyStateText?: string;
}

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos,
  height = 200,
  borderRadius = spacing.borderRadius.md,
  onPhotoPress,
  onDeletePhoto,
  editable = false,
  showIndicators = true,
  autoScroll = false,
  autoScrollInterval = 3000,
  placeholder,
  emptyStateText = 'Aucune photo'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<number>>(new Set());
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (autoScroll && photos.length > 1) {
      autoScrollRef.current = setInterval(() => {
        const nextIndex = (currentIndex + 1) % photos.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * screenWidth,
          animated: true
        });
      }, autoScrollInterval);

      return () => {
        if (autoScrollRef.current) {
          clearInterval(autoScrollRef.current);
        }
      };
    }
  }, [autoScroll, currentIndex, photos.length, autoScrollInterval]);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const newIndex = Math.round(contentOffset.x / layoutMeasurement.width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < photos.length) {
      setCurrentIndex(newIndex);
    }
  };

  const handleImageLoadStart = (index: number) => {
    setLoadingImages(prev => new Set([...prev, index]));
    setErrorImages(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageLoad = (index: number) => {
    setLoadingImages(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageError = (index: number) => {
    setLoadingImages(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(index);
      return newSet;
    });
    setErrorImages(prev => new Set([...prev, index]));
  };

  const handlePhotoPress = (photoUri: string, index: number) => {
    if (onPhotoPress) {
      onPhotoPress(photoUri, index);
    } else {
      setViewerIndex(index);
      setViewerVisible(true);
    }
  };

  const handleDeleteFromViewer = (photoUri: string, index: number) => {
    if (onDeletePhoto) {
      onDeletePhoto(photoUri, index);
    }
    setViewerVisible(false);
  };

  const goToPhoto = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true
    });
  };

  if (photos.length === 0) {
    return (
      <ErrorBoundary>
        <View style={[styles.emptyContainer, { height, borderRadius }]}>
          {placeholder || (
            <>
              <Ionicons name="camera" size={32} color={colors.textLight} />
              <Text style={styles.emptyText}>{emptyStateText}</Text>
            </>
          )}
        </View>
      </ErrorBoundary>
    );
  }

  const renderPhoto = (photoUri: string, index: number) => {
    const isLoading = loadingImages.has(index);
    const hasError = errorImages.has(index);

    return (
      <TouchableOpacity
        key={index}
        style={[styles.photoContainer, { width: screenWidth }]}
        onPress={() => handlePhotoPress(photoUri, index)}
        activeOpacity={0.9}
      >
        <View style={[styles.imageWrapper, { height, borderRadius }]}>
          {hasError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="image" size={32} color={colors.textLight} />
              <Text style={styles.errorText}>Image non disponible</Text>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: photoUri }}
                style={[styles.image, { borderRadius }]}
                resizeMode="cover"
                onLoadStart={() => handleImageLoadStart(index)}
                onLoad={() => handleImageLoad(index)}
                onError={() => handleImageError(index)}
              />
              
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={colors.textWhite} />
                </View>
              )}
            </>
          )}

          {/* Photo Counter */}
          {photos.length > 1 && (
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                {index + 1}/{photos.length}
              </Text>
            </View>
          )}

          {/* Delete Button */}
          {editable && onDeletePhoto && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDeletePhoto(photoUri, index)}
            >
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {/* Photo ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {photos.map(renderPhoto)}
        </ScrollView>

        {/* Page Indicators */}
        {showIndicators && photos.length > 1 && (
          <View style={styles.indicators}>
            {photos.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  index === currentIndex && styles.indicatorActive
                ]}
                onPress={() => goToPhoto(index)}
              />
            ))}
          </View>
        )}

        {/* Navigation Arrows (for larger screens) */}
        {photos.length > 1 && screenWidth > 500 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={() => goToPhoto(currentIndex - 1)}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textWhite} />
              </TouchableOpacity>
            )}

            {currentIndex < photos.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={() => goToPhoto(currentIndex + 1)}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.textWhite} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Photo Viewer Modal */}
        <PhotoViewer
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          photos={photos}
          initialIndex={viewerIndex}
          showIndex={true}
          onDelete={editable ? handleDeleteFromViewer : undefined}
          editable={editable}
        />
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  scrollView: {
    width: '100%',
  },

  photoContainer: {
    paddingHorizontal: spacing.xs,
  },

  imageWrapper: {
    position: 'relative',
    backgroundColor: colors.backgroundLight,
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
  },

  errorText: {
    ...typography.styles.small,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  photoCounter: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
  },

  photoCounterText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontSize: 11,
  },

  deleteButton: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },

  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textLight,
    marginHorizontal: 3,
  },

  indicatorActive: {
    backgroundColor: colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonLeft: {
    left: spacing.sm,
  },

  navButtonRight: {
    right: spacing.sm,
  },

  emptyContainer: {
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },

  emptyText: {
    ...typography.styles.small,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});