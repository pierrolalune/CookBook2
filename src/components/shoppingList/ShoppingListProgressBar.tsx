import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../styles';

interface ShoppingListProgressBarProps {
  completed: number;
  total: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  height?: number;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export const ShoppingListProgressBar: React.FC<ShoppingListProgressBarProps> = ({
  completed,
  total,
  showLabel = true,
  showPercentage = true,
  height,
  size = 'medium',
  animated = true
}) => {
  const [progressAnim] = useState(new Animated.Value(0));
  
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: percentage / 100,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(percentage / 100);
    }
  }, [percentage, animated]);

  const sizeConfig = {
    small: {
      height: 4,
      fontSize: 12,
      spacing: 6,
    },
    medium: {
      height: 6,
      fontSize: 14,
      spacing: 8,
    },
    large: {
      height: 8,
      fontSize: 16,
      spacing: 10,
    }
  };

  const config = sizeConfig[size];
  const barHeight = height || config.height;

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Progress Info */}
      {(showLabel || showPercentage) && (
        <View style={[styles.progressInfo, { marginBottom: config.spacing }]}>
          {showLabel && (
            <Text style={[styles.progressText, { fontSize: config.fontSize }]}>
              {completed}/{total} articles
            </Text>
          )}
          {showPercentage && (
            <Text style={[styles.progressPercentage, { fontSize: config.fontSize + 2 }]}>
              {percentage}%
            </Text>
          )}
        </View>
      )}

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { height: barHeight }]}>
        <Animated.View
          style={[
            styles.progressFillContainer,
            {
              width: animatedWidth,
              height: barHeight,
            }
          ]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { height: barHeight }]}
          />
        </Animated.View>
      </View>
    </View>
  );
};

// Mini version for category headers
interface MiniProgressBarProps {
  completed: number;
  total: number;
  width?: number;
}

export const MiniProgressBar: React.FC<MiniProgressBarProps> = ({
  completed,
  total,
  width = 60
}) => {
  const [progressAnim] = useState(new Animated.Value(0));
  const percentage = total > 0 ? (completed / total) : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.miniTrack, { width }]}>
      <Animated.View
        style={[
          styles.miniFillContainer,
          { width: animatedWidth }
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.miniFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressText: {
    color: '#2c3e50',
    fontWeight: '600',
  },

  progressPercentage: {
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#764ba2',
  },

  progressTrack: {
    width: '100%',
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFillContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    width: '100%',
    borderRadius: 10,
  },

  // Mini progress bar styles
  miniTrack: {
    height: 4,
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    overflow: 'hidden',
  },

  miniFillContainer: {
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },

  miniFill: {
    height: '100%',
    width: '100%',
    borderRadius: 10,
  },
});