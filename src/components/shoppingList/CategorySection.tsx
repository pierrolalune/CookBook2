import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingListItem, IngredientCategory } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ShoppingListItemCard } from './ShoppingListItemCard';
import { MiniProgressBar } from './ShoppingListProgressBar';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface CategorySectionProps {
  category: string;
  items: ShoppingListItem[];
  onToggleItemComplete: (item: ShoppingListItem) => void;
  onUpdateItemQuantity?: (item: ShoppingListItem, quantity: number, unit: string) => void;
  onItemPress?: (item: ShoppingListItem) => void;
  onItemLongPress?: (item: ShoppingListItem) => void;
  initialExpanded?: boolean;
  searchQuery?: string;
}

const CATEGORY_ICONS = {
  fruits: '🍎',
  legumes: '🥕', 
  peche: '🐟',
  viande: '🥩',
  produits_laitiers: '🥛',
  epicerie: '🛒',
  autres: '📦'
};

const CategorySectionComponent: React.FC<CategorySectionProps> = ({
  category,
  items,
  onToggleItemComplete,
  onUpdateItemQuantity,
  onItemPress,
  onItemLongPress,
  initialExpanded = true,
  searchQuery = ''
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [animation] = useState(new Animated.Value(initialExpanded ? 1 : 0));
  const [hasEditingItem, setHasEditingItem] = useState(false);

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    
    Animated.timing(animation, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  // Filter items based on search query
  const filteredItems = searchQuery.trim() 
    ? items.filter(item => item.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  const completedItems = filteredItems.filter(item => item.isCompleted);
  const totalItems = filteredItems.length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0;

  const categoryDisplayName = ShoppingListUtils.getCategoryDisplayName(category);
  const categoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.autres;

  // Don't render if no items match search
  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, hasEditingItem && styles.elevatedContainer]}>
      <TouchableOpacity 
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.categoryIcon}>{categoryIcon}</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>
              {categoryDisplayName}
            </Text>
            <Text style={styles.itemCount}>
              {completedItems.length}/{totalItems} articles
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <MiniProgressBar
            completed={completedItems.length}
            total={totalItems}
            width={60}
          />
          
          <Text style={styles.progressPercentage}>
            {completionPercentage}%
          </Text>
          
          <Animated.View style={{
            transform: [{
              rotate: animation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg']
              })
            }]
          }}>
            <Text style={styles.chevron}>⌄</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>

      <Animated.View style={{
        maxHeight: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1000] // Large enough to accommodate content
        }),
        opacity: animation,
        overflow: 'visible'
      }}>
        <View style={styles.itemsContainer}>
          {filteredItems
            .sort((a, b) => {
              // Sort by completion status (uncompleted first), then by order
              if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
              }
              return a.orderIndex - b.orderIndex;
            })
            .map((item, index, array) => (
              <ShoppingListItemCard
                key={item.id}
                item={item}
                onToggleComplete={() => onToggleItemComplete(item)}
                onUpdateQuantity={onUpdateItemQuantity ? (quantity, unit) => onUpdateItemQuantity(item, quantity, unit) : undefined}
                onPress={onItemPress ? () => onItemPress(item) : undefined}
                onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined}
                isLastInCategory={index === array.length - 1}
                searchQuery={searchQuery}
              />
            ))}
        </View>
      </Animated.View>
    </View>
  );
};

export const CategorySection: React.FC<CategorySectionProps> = (props) => (
  <ErrorBoundary>
    <CategorySectionComponent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginBottom: 8,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'visible',
  },
  elevatedContainer: {
    elevation: 10,
    zIndex: 10,
  },
  header: {
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f7fa',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#764ba2',
    minWidth: 35,
    textAlign: 'right',
  },
  chevron: {
    fontSize: 16,
    color: '#95a5a6',
    paddingHorizontal: 5,
  },
  itemsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    overflow: 'visible',
  },
});