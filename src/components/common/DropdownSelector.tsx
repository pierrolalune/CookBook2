import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography } from '../../styles';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectorProps {
  label: string;
  required?: boolean;
  value?: string;
  placeholder?: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  error?: string;
  containerStyle?: any;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  label,
  required = false,
  value,
  placeholder = "Sélectionner une option",
  options,
  onSelect,
  error,
  containerStyle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0));

  const toggleDropdown = () => {
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);

    // Animate arrow rotation
    Animated.timing(rotateAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate dropdown scale
    Animated.timing(scaleAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    setIsOpen(false);
    
    // Reset animations
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.dropdown,
          error && styles.dropdownError,
          isOpen && styles.dropdownActive,
        ]}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dropdownText,
          !selectedOption && styles.placeholderText,
        ]}>
          {displayText}
        </Text>
        <Animated.View
          style={[
            styles.arrowContainer,
            { transform: [{ rotate: rotateInterpolate }] },
          ]}
        >
          <Text style={styles.arrow}>▼</Text>
        </Animated.View>
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {isOpen && (
        <Animated.View
          style={[
            styles.optionsContainer,
            {
              transform: [{ scaleY: scaleAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.optionsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  value === option.value && styles.selectedOption,
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={[
                  styles.optionText,
                  value === option.value && styles.selectedOptionText,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
    zIndex: 1000,
  },

  labelContainer: {
    marginBottom: spacing.sm,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },

  required: {
    color: '#e74c3c',
  },

  dropdown: {
    borderWidth: 2,
    borderColor: '#e8ecf1',
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 56,
  },

  dropdownActive: {
    borderColor: colors.primary,
    backgroundColor: '#ffffff',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  dropdownError: {
    borderColor: colors.error,
  },

  dropdownText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },

  placeholderText: {
    color: '#95a5a6',
  },

  arrowContainer: {
    marginLeft: spacing.sm,
  },

  arrow: {
    fontSize: 14,
    color: '#95a5a6',
  },

  optionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginTop: 5,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1000,
  },

  optionsScroll: {
    padding: 8,
  },

  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },

  selectedOption: {
    backgroundColor: colors.primaryLight,
  },

  optionText: {
    fontSize: 15,
    color: '#2c3e50',
  },

  selectedOptionText: {
    color: colors.primary,
    fontWeight: '500',
  },

  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
});