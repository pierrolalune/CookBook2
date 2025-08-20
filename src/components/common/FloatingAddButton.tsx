import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  Animated,
  Platform 
} from 'react-native';
import { colors, spacing, typography } from '../../styles';

interface FloatingAddButtonProps {
  onPress: () => void;
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onPress,
  style,
  size = 'medium'
}) => {
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const getSizeStyle = () => {
    const sizes = {
      small: { width: 48, height: 48 },
      medium: { width: 56, height: 56 },
      large: { width: 64, height: 64 },
    };
    return sizes[size];
  };

  const getIconSize = () => {
    const iconSizes = {
      small: 24,
      medium: 28,
      large: 32,
    };
    return iconSizes[size];
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        getSizeStyle(),
        { transform: [{ scale: scaleAnim }] },
        style
      ]}
    >
      <TouchableOpacity
        style={[styles.button, getSizeStyle()]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={[styles.plusIcon, { fontSize: getIconSize() }]}>+</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: spacing.screenPadding,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  
  button: {
    backgroundColor: colors.primary,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    // Gradient effect would require react-native-linear-gradient
    // For now using solid color
  },
  
  plusIcon: {
    color: colors.textWhite,
    fontWeight: typography.weights.bold,
    lineHeight: undefined, // Remove line height for better centering
  },
});