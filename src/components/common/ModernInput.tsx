import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Animated,
} from 'react-native';
import { colors, spacing, typography } from '../../styles';

interface ModernInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  characterLimit?: number;
  showCharacterCount?: boolean;
  containerStyle?: any;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  required = false,
  helperText,
  error,
  value,
  onChangeText,
  characterLimit,
  showCharacterCount = false,
  containerStyle,
  multiline = false,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [animatedFocus] = useState(new Animated.Value(0));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedFocus, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(animatedFocus, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const animatedBorderColor = animatedFocus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const animatedBackgroundColor = animatedFocus.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f8f9fa', '#ffffff'],
  });

  const animatedShadowOpacity = animatedFocus.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.1],
  });

  const currentLength = value?.length || 0;
  const isOverLimit = characterLimit ? currentLength > characterLimit : false;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.inputContainer,
          multiline && styles.textareaContainer,
          error && styles.inputContainerError,
          {
            borderColor: error ? colors.error : animatedBorderColor,
            backgroundColor: animatedBackgroundColor,
            shadowOpacity: animatedShadowOpacity,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            multiline && styles.textareaInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          placeholderTextColor="#95a5a6"
          {...textInputProps}
        />
      </Animated.View>

      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {showCharacterCount && characterLimit && (
        <Text style={[
          styles.characterCount,
          isOverLimit && styles.characterCountError
        ]}>
          {currentLength} / {characterLimit}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
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

  inputContainer: {
    borderWidth: 2,
    borderRadius: 15,
    borderColor: '#e8ecf1',
    backgroundColor: '#f8f9fa',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 4,
    elevation: 2,
  },

  textareaContainer: {
    minHeight: 100,
  },

  inputContainerError: {
    borderColor: colors.error,
  },

  input: {
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
  },

  textareaInput: {
    textAlignVertical: 'top',
    minHeight: 68,
  },

  helperText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: spacing.xs,
  },

  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },

  characterCount: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  characterCountError: {
    color: colors.error,
  },
});