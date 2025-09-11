import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingList, Recipe } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ShoppingListProgressBar } from './ShoppingListProgressBar';
import { colors, spacing, typography } from '../../styles';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ModernShoppingListCardProps {
  shoppingList: ShoppingList;
  onPress: () => void;
  onDelete?: () => void;
  recipe?: Recipe; // Optional recipe data for recipe-generated lists
}

export const ModernShoppingListCard: React.FC<ModernShoppingListCardProps> = ({
  shoppingList,
  onPress,
  onDelete,
  recipe
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const stats = ShoppingListUtils.getCompletionStats(shoppingList.items);
  const timeEstimate = ShoppingListUtils.estimateShoppingTime(shoppingList.items);
  
  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleDeletePress = (event: any) => {
    event.stopPropagation();
    onDelete?.();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isRecipeList = recipe || shoppingList.name.includes('Liste pour "');

  return (
    <ErrorBoundary>
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          stats.allItemsCompleted && styles.completedCard
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={styles.touchable}
        >
          {/* Gradient accent border */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.accentBorder}
          />

          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {shoppingList.name}
              </Text>
              <Text style={styles.date}>
                {formatDate(shoppingList.createdAt)}
              </Text>
            </View>

            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeletePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recipe subtitle for recipe-generated lists */}
          {isRecipeList && recipe && (
            <Text style={styles.subtitle}>
              Généré depuis "{recipe.name}" pour {recipe.servings || 1} portion{(recipe.servings || 1) > 1 ? 's' : ''}
            </Text>
          )}

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <ShoppingListProgressBar
              completed={stats.completedItems}
              total={stats.totalItems}
              showLabel={true}
              showPercentage={true}
              size="small"
            />
          </View>

          {/* Meta Information */}
          <View style={styles.metaSection}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱</Text>
              <Text style={styles.metaText}>
                {timeEstimate.estimatedTimeText}
              </Text>
            </View>

            {isRecipeList && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📖</Text>
                <Text style={styles.recipeLink}>Recettes</Text>
              </View>
            )}

            {stats.allItemsCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓ Terminé</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },

  completedCard: {
    opacity: 0.85,
  },

  touchable: {
    padding: 20,
    paddingLeft: 24, // Extra padding for accent border
  },

  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: '100%',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },

  titleContainer: {
    flex: 1,
    marginRight: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 5,
    lineHeight: 22,
  },

  date: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '500',
  },

  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fee',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteIcon: {
    fontSize: 16,
  },

  subtitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 15,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  progressSection: {
    marginBottom: 12,
  },

  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  metaIcon: {
    fontSize: 14,
  },

  metaText: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '500',
  },

  recipeLink: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },

  completedBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },

  completedBadgeText: {
    fontSize: 12,
    color: '#2ecc71',
    fontWeight: '600',
  },
});