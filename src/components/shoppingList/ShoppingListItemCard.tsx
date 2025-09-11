import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Animated } from 'react-native';
import { ShoppingListItem } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ModernCheckbox } from '../common/ModernCheckbox';
import { QuantityEditor } from './QuantityEditor';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onToggleComplete: () => void;
  onUpdateQuantity?: (quantity: number, unit: string) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  onDropdownToggle?: (isOpen: boolean) => void;
  isLastInCategory?: boolean;
  searchQuery?: string;
  style?: any;
}

const ShoppingListItemCardComponent: React.FC<ShoppingListItemCardProps> = ({
  item,
  onToggleComplete,
  onUpdateQuantity,
  onPress,
  onLongPress,
  onDelete,
  onDropdownToggle: parentDropdownToggle,
  isLastInCategory = false,
  searchQuery = '',
  style
}) => {
  const [editQuantity, setEditQuantity] = useState(item.quantity?.toString() || '');
  const [editUnit, setEditUnit] = useState(item.unit || '');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [hasOpenDropdown, setHasOpenDropdown] = useState(false);

  const handleQuantityPress = () => {
    if (onUpdateQuantity && !item.isCompleted) {
      setIsEditingQuantity(true);
      setEditQuantity(item.quantity?.toString() || '');
      setEditUnit(item.unit || '');
      setShowUnitDropdown(false);
    }
  };

  const handleQuantitySubmit = () => {
    if (onUpdateQuantity) {
      const quantity = parseFloat(editQuantity) || 0;
      if (quantity > 0 && editUnit.trim()) {
        onUpdateQuantity(quantity, editUnit.trim());
      }
    }
    setIsEditingQuantity(false);
    setShowUnitDropdown(false);
  };

  const handleQuantityCancel = () => {
    setIsEditingQuantity(false);
    setEditQuantity(item.quantity?.toString() || '');
    setEditUnit(item.unit || '');
    setShowUnitDropdown(false);
  };

  const handleUnitSelect = (unit: string) => {
    setEditUnit(unit);
    setShowUnitDropdown(false);
  };

  const availableUnits = item.availableUnits || ['pièce', 'kg', 'g', 'L', 'ml'];

  const handleDropdownToggle = (isOpen: boolean) => {
    setHasOpenDropdown(isOpen);
    parentDropdownToggle?.(isOpen);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        item.isCompleted && styles.completedContainer,
        hasOpenDropdown && styles.elevatedContainer,
        style
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <View style={styles.checkboxContainer}>
        <ModernCheckbox
          checked={item.isCompleted}
          onToggle={onToggleComplete}
          size="medium"
        />
      </View>

      {/* Item Content */}
      <View style={styles.itemContent}>
        <View style={styles.itemInfo}>
          <Text style={[
            styles.itemName,
            item.isCompleted && styles.completedItemName
          ]} numberOfLines={1}>
            {item.ingredientName || 'Ingrédient sans nom'}
          </Text>

          {/* Quantity Display under ingredient name */}
          {(item.quantity || item.unit) && (
            <View style={styles.quantityDisplayContainer}>
              <QuantityEditor
                quantity={item.quantity || 1}
                unit={item.unit || 'pièce'}
                units={availableUnits}
                onQuantityChange={(quantity) => {
                  if (onUpdateQuantity) {
                    onUpdateQuantity(quantity, item.unit || 'pièce');
                  }
                }}
                onUnitChange={(unit) => {
                  if (onUpdateQuantity) {
                    onUpdateQuantity(item.quantity || 1, unit);
                  }
                }}
                onDropdownToggle={handleDropdownToggle}
                disabled={item.isCompleted}
                compact={true}
              />
            </View>
          )}

          {item.notes && (
            <Text style={[
              styles.itemNotes,
              item.isCompleted && styles.completedItemNotes
            ]} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
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
    backgroundColor: '#fafbfc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e8ecef',
    minHeight: 70,
    overflow: 'visible',
    zIndex: 1,
  },

  completedContainer: {
    opacity: 0.6,
    backgroundColor: '#f0f2f5',
  },

  elevatedContainer: {
    zIndex: 1000,
    elevation: 15,
  },

  checkboxContainer: {
    marginRight: 10,
    flexShrink: 0,
    marginTop: 8,
  },

  itemContent: {
    flex: 1,
    marginRight: 8,
  },

  itemInfo: {
    flex: 1,
  },

  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 1,
    minHeight: 16,
  },

  completedItemName: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },

  itemNotes: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },

  completedItemNotes: {
    color: '#bdc3c7',
  },

  quantityDisplayContainer: {
    marginTop: 2,
    marginBottom: 1,
    alignSelf: 'flex-start',
  },
});
