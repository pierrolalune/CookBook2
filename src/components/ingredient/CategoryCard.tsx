import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../styles';

interface CategoryCardProps {
  icon: string;
  name: string;
  count: number;
  onPress: () => void;
  isSpecial?: boolean; // For "Produits de saison" card
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  icon,
  name,
  count,
  onPress,
  isSpecial = false,
}) => {
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const CardContent = () => (
    <>
      {/* Decorative corner element */}
      <View style={[styles.cornerDecoration, isSpecial && styles.cornerDecorationSpecial]} />
      
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.count}>{count} produits</Text>
    </>
  );

  if (isSpecial) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <LinearGradient
            colors={colors.seasonalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, styles.specialCard]}
          >
            <CardContent />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <CardContent />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 20,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'space-between',
    ...colors.shadow.medium,
  },

  specialCard: {
    backgroundColor: 'transparent', // Let gradient show through
  },

  cornerDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    transform: [{ rotate: '45deg' }],
    borderRadius: 20,
  },

  cornerDecorationSpecial: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  icon: {
    fontSize: 28,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },

  name: {
    ...typography.styles.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 5,
  },

  count: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '400',
  },
});