import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { ShoppingListItem } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onToggleComplete: () => void;
  onUpdateQuantity?: (quantity: number, unit: string) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  isLastInCategory?: boolean;
}

const ShoppingListItemCardComponent: React.FC<ShoppingListItemCardProps> = ({
  item,
  onToggleComplete,
  onUpdateQuantity,
  onPress,
  onLongPress,
  isLastInCategory = false
}) => {
  const [editQuantity, setEditQuantity] = useState(item.quantity?.toString() || '');
  const [editUnit, setEditUnit] = useState(item.unit || '');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);

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

  const handleQuantityBlur = () => {
    if (onUpdateQuantity) {
      const quantity = parseFloat(editQuantity) || 0;
      if (quantity > 0 && editUnit.trim()) {
        onUpdateQuantity(quantity, editUnit.trim());
      }
    }
    setIsEditingQuantity(false);
    setShowUnitDropdown(false);
  };

  const handleUnitSelect = (unit: string) => {
    setEditUnit(unit);
    setShowUnitDropdown(false);
    
    if (onUpdateQuantity) {
      const quantity = parseFloat(editQuantity) || 0;
      if (quantity > 0 && unit.trim()) {
        onUpdateQuantity(quantity, unit.trim());
      }
    }
    setIsEditingQuantity(false);
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        item.isCompleted && styles.completedContainer,
        isEditingQuantity && styles.editingItemContainer
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
          </Text>
          
          {(item.quantity || item.unit) && (
            <View style={styles.quantityRow}>
              {isEditingQuantity ? (
                <View style={styles.editingWrapper}>
                  <View style={styles.editingContainer}>
                    <TextInput
                      style={styles.quantityInput}
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      onBlur={handleQuantityBlur}
                      onSubmitEditing={handleQuantitySubmit}
                      keyboardType="numeric"
                      placeholder="Qté"
                      autoFocus
                      selectTextOnFocus
                      returnKeyType="done"
                    />
                    
                    {item.availableUnits && item.availableUnits.length > 0 ? (
                      <TouchableOpacity
                        style={styles.unitDropdownButton}
                        onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                      >
                        <Text style={styles.unitDropdownText}>
                          {editUnit || 'Unité'}
                        </Text>
                        <Text style={styles.unitDropdownArrow}>
                          {showUnitDropdown ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        style={styles.unitInput}
                        value={editUnit}
                        onChangeText={setEditUnit}
                        onBlur={handleQuantityBlur}
                        onSubmitEditing={handleQuantitySubmit}
                        placeholder="Unité"
                        returnKeyType="done"
                      />
                    )}
                  </View>
                  
                  {item.availableUnits && item.availableUnits.length > 0 && showUnitDropdown && (
                    <View style={[
                      styles.unitDropdownList,
                      isLastInCategory && styles.unitDropdownListAbove
                    ]}>
                      <ScrollView 
                        style={styles.unitScrollView}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {item.availableUnits.map((unitOption) => (
                          <TouchableOpacity
                            key={unitOption}
                            style={[
                              styles.unitOption,
                              editUnit === unitOption && styles.selectedUnitOption
                            ]}
                            onPress={() => handleUnitSelect(unitOption)}
                          >
                            <Text style={[
                              styles.unitOptionText,
                              editUnit === unitOption && styles.selectedUnitOptionText
                            ]}>
                              {unitOption}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.quantityContainer}
                  onPress={handleQuantityPress}
                  disabled={item.isCompleted}
                >
                  <Text style={[
                    styles.quantity,
                    item.isCompleted && styles.completedQuantity,
                    onUpdateQuantity && !item.isCompleted && styles.editableQuantity
                  ]}>
                    {item.quantity} {item.unit}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
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
    overflow: 'visible',
  },
  completedContainer: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  editingItemContainer: {
    zIndex: 9999,
    elevation: 9999,
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
  quantityRow: {
    marginTop: 4,
    marginBottom: 2,
    overflow: 'visible',
    zIndex: 1,
  },
  quantityContainer: {
    alignSelf: 'flex-start',
  },
  quantity: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  completedQuantity: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  editableQuantity: {
    backgroundColor: '#EFF6FF',
    color: '#3B82F6',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editingWrapper: {
    position: 'relative',
    zIndex: 999,
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
    minWidth: 50,
  },
  unitInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 14,
    minWidth: 60,
  },
  unitDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  unitDropdownText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  unitDropdownArrow: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
  },
  unitDropdownList: {
    position: 'absolute',
    top: 36,
    left: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    maxHeight: 120,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 1000,
    zIndex: 99999,
  },
  unitDropdownListAbove: {
    top: undefined,
    bottom: 36,
  },
  unitScrollView: {
    maxHeight: 120,
  },
  unitOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedUnitOption: {
    backgroundColor: '#EFF6FF',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedUnitOptionText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});