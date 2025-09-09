import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { ShoppingListItem } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ShoppingListItemCard } from './ShoppingListItemCard';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface CategorySectionProps {
  category: string;
  items: ShoppingListItem[];
  onToggleItemComplete: (item: ShoppingListItem) => void;
  onItemPress?: (item: ShoppingListItem) => void;
  onItemLongPress?: (item: ShoppingListItem) => void;
  initialExpanded?: boolean;
}

const CategorySectionComponent: React.FC<CategorySectionProps> = ({
  category,
  items,
  onToggleItemComplete,
  onItemPress,
  onItemLongPress,
  initialExpanded = true
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [animation] = useState(new Animated.Value(initialExpanded ? 1 : 0));

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

  const completedItems = items.filter(item => item.isCompleted);
  const totalItems = items.length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0;

  const categoryDisplayName = ShoppingListUtils.getCategoryDisplayName(category);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.categoryTitle}>
            {categoryDisplayName}
          </Text>
          <Text style={styles.itemCount}>
            {completedItems.length}/{totalItems} articles
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${completionPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {completionPercentage}%
            </Text>
          </View>
          
          <Animated.View style={{
            transform: [{
              rotate: animation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg']
              })
            }]
          }}>
            <Text style={styles.chevron}>▼</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>

      <Animated.View style={{
        maxHeight: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1000] // Large enough to accommodate content
        }),
        opacity: animation,
        overflow: 'hidden'
      }}>
        <View style={styles.itemsContainer}>
          {items
            .sort((a, b) => {
              // Sort by completion status (uncompleted first), then by order
              if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
              }
              return a.orderIndex - b.orderIndex;
            })
            .map(item => (
              <ShoppingListItemCard
                key={item.id}
                item={item}
                onToggleComplete={() => onToggleItemComplete(item)}
                onPress={onItemPress ? () => onItemPress(item) : undefined}
                onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined}
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
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  progressBackground: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  itemsContainer: {
    backgroundColor: '#FFFFFF',
  },
});