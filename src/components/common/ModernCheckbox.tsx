import React, { useState } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../styles';

interface ModernCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ModernCheckbox: React.FC<ModernCheckboxProps> = ({
  checked,
  onToggle,
  disabled = false,
  size = 'medium'
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    onToggle();
  };

  const sizeStyles = {
    small: { width: 20, height: 20, borderRadius: 6 },
    medium: { width: 24, height: 24, borderRadius: 8 },
    large: { width: 28, height: 28, borderRadius: 10 }
  };

  const checkIconSize = {
    small: 12,
    medium: 14,
    large: 16
  };

  if (checked) {
    return (
      <Animated.View
        style={[
          styles.checkbox,
          sizeStyles[size],
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabled,
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
          style={[sizeStyles[size], { borderRadius: sizeStyles[size].borderRadius }]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.checkedGradient, sizeStyles[size]]}
          >
            <Text style={[styles.checkIcon, { fontSize: checkIconSize[size] }]}>
              ✓
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.checkbox,
        styles.unchecked,
        sizeStyles[size],
        { transform: [{ scale: scaleAnim }] },
        disabled && styles.disabled,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.7}
        style={[styles.touchable, sizeStyles[size]]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  unchecked: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },

  checkedGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkIcon: {
    color: '#ffffff',
    fontWeight: 'bold',
  },

  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabled: {
    opacity: 0.5,
  },
});