import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../styles';
import { SearchBar } from './SearchBar';

interface FilterPill {
  id: string;
  label: string;
  icon: string;
}

interface GradientHeaderProps {
  title: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (text: string) => void;
  onSearch?: (text: string) => void;
  pills?: FilterPill[];
  activePillId?: string;
  onPillPress?: (pillId: string) => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  categoryIcon?: string;
  categoryCount?: string;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  searchValue = '',
  searchPlaceholder = 'Rechercher un ingrédient...',
  onSearchChange,
  onSearch,
  pills = [],
  activePillId,
  onPillPress,
  showBackButton = false,
  onBackPress,
  categoryIcon,
  categoryCount,
}) => {
  const insets = useSafeAreaInsets();

  const renderBackButton = () => (
    <TouchableOpacity 
      style={styles.backButton} 
      onPress={onBackPress}
      activeOpacity={0.7}
    >
      <Text style={styles.backButtonText}>←</Text>
    </TouchableOpacity>
  );

  const renderCategoryInfo = () => (
    <View style={styles.categoryInfo}>
      <Text style={styles.categoryIcon}>{categoryIcon}</Text>
      <View style={styles.categoryTextContainer}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categoryCount}>{categoryCount}</Text>
      </View>
    </View>
  );

  const renderMainTitle = () => (
    <Text style={styles.mainTitle}>{title}</Text>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <SearchBar
        value={searchValue}
        placeholder={searchPlaceholder}
        onSearch={onSearch}
        onChangeText={onSearchChange}
        style={styles.searchBar}
      />
    </View>
  );

  const renderFilterPills = () => {
    if (pills.length === 0) return null;

    return (
      <View style={styles.pillsContainer}>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          {pills.map((pill) => (
            <TouchableOpacity
              key={pill.id}
              style={[
                styles.pill,
                activePillId === pill.id && styles.pillActive
              ]}
              onPress={() => onPillPress?.(pill.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pillText,
                activePillId === pill.id && styles.pillTextActive
              ]}>
                {pill.icon} {pill.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={colors.primaryGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {showBackButton && renderBackButton()}
      
      {categoryIcon ? renderCategoryInfo() : renderMainTitle()}
      
      {renderSearchBar()}
      
      {renderFilterPills()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },

  backButtonText: {
    fontSize: 24,
    color: colors.textWhite,
    fontWeight: '300',
  },

  mainTitle: {
    ...typography.styles.h1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: spacing.lg,
  },

  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  categoryIcon: {
    fontSize: 48,
    marginRight: spacing.md,
  },

  categoryTextContainer: {
    flex: 1,
  },

  categoryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 5,
  },

  categoryCount: {
    fontSize: 16,
    color: colors.textWhite,
    opacity: 0.9,
  },

  searchContainer: {
    marginBottom: spacing.lg,
  },

  searchBar: {
    backgroundColor: colors.backgroundGlass,
    borderRadius: 15,
    ...colors.shadow.medium,
  },

  pillsContainer: {
    marginHorizontal: -spacing.lg, // Extend to edges
  },

  pillsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 5,
  },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: spacing.sm,
  },

  pillActive: {
    backgroundColor: colors.textWhite,
    ...colors.shadow.small,
  },

  pillText: {
    fontSize: 14,
    color: colors.textWhite,
    fontWeight: '500',
  },

  pillTextActive: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
});