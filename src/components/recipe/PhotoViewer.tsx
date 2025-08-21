import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ScrollView,
  Animated
} from 'react-native';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import { ErrorBoundary } from '../common/ErrorBoundary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PhotoViewerProps {
  visible: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  title?: string;
  showIndex?: boolean;
  onDelete?: (photoUri: string, index: number) => void;
  editable?: boolean;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  visible,
  onClose,
  photos,
  initialIndex = 0,
  title,
  showIndex = true,
  onDelete,
  editable = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Animation values for zoom and pan
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const currentPhoto = photos[currentIndex];

  const resetZoom = () => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  };

  const handlePinchGestureEvent = Animated.event([
    {
      nativeEvent: {
        scale: scale,
      },
    },
  ], { useNativeDriver: true });

  const handlePinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      scale.setOffset(lastScale.current);
      scale.setValue(1);
    }
  };

  const handlePanGestureEvent = Animated.event([
    {
      nativeEvent: {
        translationX: translateX,
        translationY: translateY,
      },
    },
  ], { useNativeDriver: true });

  const handlePanStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastTranslateX.current += event.nativeEvent.translationX;
      lastTranslateY.current += event.nativeEvent.translationY;
      translateX.setOffset(lastTranslateX.current);
      translateY.setOffset(lastTranslateY.current);
      translateX.setValue(0);
      translateY.setValue(0);
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setImageError(true);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const newIndex = Math.round(contentOffset.x / layoutMeasurement.width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < photos.length) {
      setCurrentIndex(newIndex);
      setLoading(true);
      setImageError(false);
      resetZoom();
    }
  };

  const handleDelete = () => {
    if (!onDelete || !currentPhoto) return;

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
          onPress: () => {
            onDelete(currentPhoto, currentIndex);
            
            // Close viewer if no more photos
            if (photos.length === 1) {
              onClose();
            } else {
              // Adjust index if needed
              const newIndex = currentIndex >= photos.length - 1 
                ? Math.max(0, photos.length - 2)
                : currentIndex;
              setCurrentIndex(newIndex);
            }
          }
        }
      ]
    );
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * screenWidth,
        animated: true
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex - 1) * screenWidth,
        animated: true
      });
    }
  };

  if (!visible || photos.length === 0) {
    return null;
  }

  const renderPhoto = (photoUri: string, index: number) => (
    <View key={index} style={styles.photoContainer}>
      <PanGestureHandler
        onGestureEvent={handlePanGestureEvent}
        onHandlerStateChange={handlePanStateChange}
      >
        <Animated.View style={styles.panContainer}>
          <PinchGestureHandler
            onGestureEvent={handlePinchGestureEvent}
            onHandlerStateChange={handlePinchStateChange}
          >
            <Animated.View
              style={[
                styles.imageContainer,
                {
                  transform: [
                    { scale: scale },
                    { translateX: translateX },
                    { translateY: translateY }
                  ]
                }
              ]}
            >
              {imageError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="image" size={64} color={colors.textLight} />
                  <Text style={styles.errorText}>Image non disponible</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
      
      {loading && index === currentIndex && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ErrorBoundary>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              {title && (
                <Text style={styles.headerTitle}>{title}</Text>
              )}
              {showIndex && photos.length > 1 && (
                <Text style={styles.headerSubtitle}>
                  {currentIndex + 1} / {photos.length}
                </Text>
              )}
            </View>
            
            <View style={styles.headerRight}>
              {editable && onDelete && (
                <TouchableOpacity 
                  style={styles.headerButton} 
                  onPress={handleDelete}
                >
                  <Ionicons name="trash" size={24} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>

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

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity 
                  style={[styles.navButton, styles.navButtonLeft]}
                  onPress={goToPrevious}
                >
                  <Ionicons name="chevron-back" size={32} color={colors.textWhite} />
                </TouchableOpacity>
              )}
              
              {currentIndex < photos.length - 1 && (
                <TouchableOpacity 
                  style={[styles.navButton, styles.navButtonRight]}
                  onPress={goToNext}
                >
                  <Ionicons name="chevron-forward" size={32} color={colors.textWhite} />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Page Indicators */}
          {photos.length > 1 && (
            <View style={styles.indicators}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentIndex && styles.indicatorActive
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </ErrorBoundary>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50, // Status bar height
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },

  headerButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerRight: {
    width: 48, // Same as headerButton to center the title
    alignItems: 'flex-end',
  },

  headerTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textWhite,
    textAlign: 'center',
  },

  headerSubtitle: {
    ...typography.styles.small,
    color: colors.textLight,
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },

  photoContainer: {
    width: screenWidth,
    height: screenHeight - 120, // Account for header and indicators
    justifyContent: 'center',
    alignItems: 'center',
  },

  panContainer: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageContainer: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    width: screenWidth - spacing.lg * 2,
    height: '100%',
    maxHeight: screenHeight - 200,
  },

  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  errorText: {
    ...typography.styles.body,
    color: colors.textLight,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },

  loadingText: {
    ...typography.styles.body,
    color: colors.textWhite,
  },

  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonLeft: {
    left: spacing.md,
  },

  navButtonRight: {
    right: spacing.md,
  },

  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },

  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },

  indicatorActive: {
    backgroundColor: colors.textWhite,
    width: 12,
  },
});