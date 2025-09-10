import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../styles';

interface ModernToggleProps {
  label: string;
  icon?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  containerStyle?: any;
}

export const ModernToggle: React.FC<ModernToggleProps> = ({
  label,
  icon,
  value,
  onValueChange,
  disabled = false,
  containerStyle,
}) => {
  const [slideAnim] = useState(new Animated.Value(value ? 1 : 0));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: value ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const handlePress = () => {
    if (disabled) return;

    // Scale animation for press feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onValueChange(!value);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 27],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        { transform: [{ scale: scaleAnim }] },
        disabled && styles.disabled,
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.labelContainer}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {label}
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          {value ? (
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toggleTrack}
            >
              <Animated.View
                style={[
                  styles.toggleSlider,
                  {
                    transform: [{ translateX }],
                  },
                ]}
              />
            </LinearGradient>
          ) : (
            <View style={styles.toggleTrackInactive}>
              <Animated.View
                style={[
                  styles.toggleSlider,
                  {
                    transform: [{ translateX }],
                  },
                ]}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e8ecf1',
    borderRadius: 15,
    marginBottom: spacing.xl,
  },

  disabled: {
    opacity: 0.6,
  },

  touchable: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },

  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },

  labelDisabled: {
    color: '#95a5a6',
  },

  toggleContainer: {
    marginLeft: spacing.md,
  },

  toggleTrack: {
    width: 52,
    height: 28,
    borderRadius: 20,
    justifyContent: 'center',
    position: 'relative',
  },

  toggleTrackInactive: {
    width: 52,
    height: 28,
    backgroundColor: '#e8ecf1',
    borderRadius: 20,
    justifyContent: 'center',
    position: 'relative',
  },

  toggleSlider: {
    position: 'absolute',
    width: 22,
    height: 22,
    backgroundColor: '#ffffff',
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});