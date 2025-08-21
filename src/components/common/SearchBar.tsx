import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text,
  TouchableOpacity,
  Animated 
} from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onChangeText?: (query: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  value?: string;
  style?: any;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Rechercher un ingrédient...',
  onSearch,
  onChangeText,
  onClear,
  debounceMs = 300,
  value = '',
  style
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = new Animated.Value(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(searchQuery);
      onChangeText?.(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs, onSearch, onChangeText]);

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handleClear = () => {
    setSearchQuery('');
    onClear?.();
  };

  const animatedBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const animatedBackgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background, colors.backgroundLight],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            borderColor: animatedBorderColor,
            backgroundColor: animatedBackgroundColor,
          }
        ]}
      >
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
        
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styling is now handled by parent
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 0.5,
  },
  
  searchIcon: {
    marginRight: spacing.sm,
  },
  
  searchIconText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
  },
  
  input: {
    flex: 1,
    paddingVertical: spacing.cardPadding,
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
  },
  
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  
  clearButtonText: {
    fontSize: typography.sizes.lg,
    color: colors.textLight,
    fontWeight: typography.weights.bold,
  },
});