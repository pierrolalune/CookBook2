import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../styles';

interface MonthData {
  id: number;
  name: string;
  fullName: string;
}

interface MonthCardProps {
  month: MonthData;
  isSelected: boolean;
  isPeakMonth?: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const MonthCard: React.FC<MonthCardProps> = ({
  month,
  isSelected,
  isPeakMonth = false,
  onToggle,
  disabled = false,
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

  if (isSelected) {
    const gradientColors: [string, string] = isPeakMonth 
      ? ['#ff6b6b', '#feca57'] // Warm gradient for peak months
      : ['#667eea', '#764ba2']; // Cool gradient for regular months

    return (
      <Animated.View
        style={[
          styles.card,
          { 
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.selectedCard}
          >
            <Text style={styles.selectedText}>{month.name}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        disabled && styles.disabledCard,
        { 
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.unselectedCard}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.unselectedText,
          disabled && styles.disabledText,
        ]}>
          {month.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 2,
    minWidth: 70,
  },

  selectedCard: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },

  unselectedCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e8ecf1',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },

  disabledCard: {
    opacity: 0.5,
  },

  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },

  unselectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    textAlign: 'center',
  },

  disabledText: {
    color: '#95a5a6',
  },
});