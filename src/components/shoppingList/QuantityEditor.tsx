import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../styles';

interface QuantityEditorProps {
  quantity: number;
  unit: string;
  units: string[];
  onQuantityChange: (quantity: number) => void;
  onUnitChange: (unit: string) => void;
  disabled?: boolean;
  step?: number;
  minValue?: number;
  compact?: boolean;
}

export const QuantityEditor: React.FC<QuantityEditorProps> = ({
  quantity,
  unit,
  units,
  onQuantityChange,
  onUnitChange,
  disabled = false,
  step = 1,
  minValue = 0,
  compact = false
}) => {
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [scaleAnimMinus] = useState(new Animated.Value(1));
  const [scaleAnimPlus] = useState(new Animated.Value(1));

  const handleIncrement = () => {
    if (disabled) return;
    
    // Animation feedback
    Animated.sequence([
      Animated.timing(scaleAnimPlus, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimPlus, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onQuantityChange(quantity + step);
  };

  const handleDecrement = () => {
    if (disabled) return;
    
    const newValue = quantity - step;
    if (newValue >= minValue) {
      // Animation feedback
      Animated.sequence([
        Animated.timing(scaleAnimMinus, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimMinus, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      onQuantityChange(newValue);
    }
  };

  const handleQuantityInputChange = (text: string) => {
    if (disabled) return;
    
    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue >= minValue) {
      onQuantityChange(numValue);
    }
  };

  const formatQuantity = (value: number): string => {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  return (
    <View style={[
      styles.container, 
      compact && styles.compactContainer, 
      disabled && styles.disabled,
      showUnitPicker && styles.elevatedContainer
    ]}>
      {/* Minus Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnimMinus }] }}>
        <TouchableOpacity
          style={[styles.quantityButton, compact && styles.compactButton]}
          onPress={handleDecrement}
          disabled={disabled || quantity <= minValue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>−</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Quantity Input */}
      <View style={[styles.quantityInputContainer, compact && styles.compactInputContainer]}>
        <TextInput
          style={[styles.quantityInput, compact && styles.compactInput]}
          value={formatQuantity(quantity)}
          onChangeText={handleQuantityInputChange}
          keyboardType="numeric"
          selectTextOnFocus
          disabled={disabled}
        />
      </View>

      {/* Plus Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnimPlus }] }}>
        <TouchableOpacity
          style={[styles.quantityButton, compact && styles.compactButton]}
          onPress={handleIncrement}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Unit Selector */}
      <TouchableOpacity
        style={styles.unitSelector}
        onPress={() => setShowUnitPicker(!showUnitPicker)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.unitText}>{unit}</Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>

      {/* Unit Picker Dropdown */}
      {showUnitPicker && (
        <View style={styles.unitPicker}>
          {units.map((unitOption) => (
            <TouchableOpacity
              key={unitOption}
              style={[
                styles.unitOption,
                unitOption === unit && styles.selectedUnitOption
              ]}
              onPress={() => {
                onUnitChange(unitOption);
                setShowUnitPicker(false);
              }}
            >
              <Text style={[
                styles.unitOptionText,
                unitOption === unit && styles.selectedUnitOptionText
              ]}>
                {unitOption}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
    gap: 8,
  },

  compactContainer: {
    padding: 3,
    borderRadius: 8,
    gap: 6,
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },

  elevatedContainer: {
    zIndex: 999,
    elevation: 10,
  },

  disabled: {
    opacity: 0.6,
  },

  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
  },

  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  quantityInputContainer: {
    minWidth: 50,
    alignItems: 'center',
  },

  quantityInput: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },

  // Compact mode styles
  compactButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },

  compactInputContainer: {
    minWidth: 40,
  },

  compactInput: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    gap: 4,
  },

  unitText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },

  dropdownIcon: {
    fontSize: 10,
    color: '#95a5a6',
  },

  unitPicker: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 15,
    zIndex: 1001,
    minWidth: 120,
    marginTop: 5,
  },

  unitOption: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },

  selectedUnitOption: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },

  unitOptionText: {
    fontSize: 14,
    color: '#2c3e50',
  },

  selectedUnitOptionText: {
    color: '#667eea',
    fontWeight: '600',
  },
});