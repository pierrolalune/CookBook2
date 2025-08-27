import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { ShoppingListItem } from '../../types';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onToggleCompletion: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (item: ShoppingListItem) => void;
}

export const ShoppingListItemCard: React.FC<ShoppingListItemCardProps> = ({
  item,
  onToggleCompletion,
  onDelete,
  onEdit
}) => {
  const [animatedValue] = useState(new Animated.Value(item.isCompleted ? 1 : 0));

  const handleToggleCompletion = () => {
    // Animate the completion state
    Animated.timing(animatedValue, {
      toValue: item.isCompleted ? 0 : 1,
      duration: 300,
      useNativeDriver: false
    }).start();

    onToggleCompletion(item.id);
  };

  const handleLongPress = () => {
    if (onEdit) {
      onEdit(item);
    } else {
      Alert.alert(
        'Actions',
        `Que souhaitez-vous faire avec "${getItemDisplayName()}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            onPress: () => handleDelete(),
            style: 'destructive'
          }
        ]
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'article',
      `Êtes-vous sûr de vouloir supprimer "${getItemDisplayName()}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: () => onDelete(item.id),
          style: 'destructive'
        }
      ]
    );
  };

  const getItemDisplayName = () => {
    return item.ingredient?.name || item.customName || 'Article';
  };

  const formatQuantity = (quantity: number) => {
    return quantity % 1 === 0 
      ? quantity.toString()
      : quantity.toFixed(1).replace(/\.0$/, '');
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      fruits: 'leaf-outline',
      legumes: 'nutrition-outline',
      viande: 'restaurant-outline',
      peche: 'fish-outline',
      produits_laitiers: 'water-outline',
      epicerie: 'storefront-outline',
      autres: 'cube-outline'
    };
    return icons[category] || 'cube-outline';
  };

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      {onEdit && (
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEdit(item)}
        >
          <Ionicons name="pencil" size={20} color={colors.textWhite} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={handleDelete}
      >
        <Ionicons name="trash" size={20} color={colors.textWhite} />
      </TouchableOpacity>
    </View>
  );

  const interpolatedOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6]
  });

  const interpolatedStrikethrough = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <Animated.View
        style={[
          styles.container,
          { opacity: interpolatedOpacity }
        ]}
      >
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={handleToggleCompletion}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          {/* Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleToggleCompletion}
          >
            <View style={[
              styles.checkbox,
              item.isCompleted && styles.checkboxCompleted
            ]}>
              {item.isCompleted && (
                <Ionicons name="checkmark" size={18} color={colors.textWhite} />
              )}
            </View>
          </TouchableOpacity>

          {/* Item Details */}
          <View style={styles.itemDetails}>
            <View style={styles.itemHeader}>
              <View style={styles.nameContainer}>
                <Animated.Text
                  style={[
                    styles.itemName,
                    item.isCompleted && styles.completedItemName
                  ]}
                  numberOfLines={1}
                >
                  {getItemDisplayName()}
                </Animated.Text>
                
                {/* Strikethrough effect */}
                <Animated.View
                  style={[
                    styles.strikethrough,
                    {
                      transform: [
                        {
                          scaleX: interpolatedStrikethrough
                        }
                      ]
                    }
                  ]}
                />
              </View>

              <Text style={styles.quantity}>
                {formatQuantity(item.quantity)} {item.unit}
              </Text>
            </View>

            {/* Notes */}
            {item.notes && (
              <Text style={[styles.notes, item.isCompleted && styles.completedNotes]} numberOfLines={2}>
                {item.notes}
              </Text>
            )}

            {/* Category indicator */}
            <View style={styles.categoryContainer}>
              <Ionicons 
                name={getCategoryIcon(item.category)} 
                size={14} 
                color={colors.textLight} 
              />
              <Text style={styles.categoryText}>
                {item.category}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundLight,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12
  },
  checkboxContainer: {
    marginRight: 12,
    paddingTop: 2
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  itemDetails: {
    flex: 1
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  nameContainer: {
    flex: 1,
    position: 'relative',
    marginRight: 12
  },
  itemName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    lineHeight: 20
  },
  completedItemName: {
    color: colors.textSecondary
  },
  strikethrough: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.textSecondary,
    transformOrigin: 'left'
  },
  quantity: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  notes: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18
  },
  completedNotes: {
    color: colors.textLight
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginLeft: 4,
    textTransform: 'capitalize'
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%'
  },
  editButton: {
    backgroundColor: colors.info
  },
  deleteButton: {
    backgroundColor: colors.error
  }
});

export default ShoppingListItemCard;