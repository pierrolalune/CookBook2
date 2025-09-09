import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingListItem } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onToggleComplete: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}

const ShoppingListItemCardComponent: React.FC<ShoppingListItemCardProps> = ({
  item,
  onToggleComplete,
  onPress,
  onLongPress
}) => {
  const formatQuantity = () => {
    if (!item.quantity || !item.unit) return '';
    return ` (${item.quantity} ${item.unit})`;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        item.isCompleted && styles.completedContainer
      ]}
      onPress={onPress || onToggleComplete}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity 
        style={styles.checkboxContainer}
        onPress={onToggleComplete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[
          styles.checkbox,
          item.isCompleted && styles.checkedCheckbox
        ]}>
          {item.isCompleted && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.mainContent}>
          <Text style={[
            styles.name,
            item.isCompleted && styles.completedName
          ]} numberOfLines={2}>
            {item.ingredientName}
            {formatQuantity()}
          </Text>
          
          {item.notes && (
            <Text style={[
              styles.notes,
              item.isCompleted && styles.completedNotes
            ]} numberOfLines={1}>
              💬 {item.notes}
            </Text>
          )}
        </View>

        <View style={styles.categoryContainer}>
          <Text style={[
            styles.category,
            item.isCompleted && styles.completedCategory
          ]}>
            {ShoppingListUtils.getCategoryDisplayName(item.category).split(' ')[0]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ShoppingListItemCard: React.FC<ShoppingListItemCardProps> = (props) => (
  <ErrorBoundary>
    <ShoppingListItemCardComponent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  completedContainer: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  completedName: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  notes: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  completedNotes: {
    color: '#9CA3AF',
  },
  categoryContainer: {
    marginLeft: 8,
  },
  category: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  completedCategory: {
    color: '#D1D5DB',
  },
});