import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingList } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ShoppingListCardProps {
  shoppingList: ShoppingList;
  onPress: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
}

const ShoppingListCardComponent: React.FC<ShoppingListCardProps> = ({
  shoppingList,
  onPress,
  onLongPress,
  onDelete
}) => {
  const stats = ShoppingListUtils.getCompletionStats(shoppingList.items);
  const timeEstimate = ShoppingListUtils.estimateShoppingTime(shoppingList.items);

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        stats.allItemsCompleted && styles.completedCard
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {shoppingList.name}
          </Text>
          <Text style={styles.createdDate}>
            {shoppingList.createdAt.toLocaleDateString('fr-FR')}
          </Text>
        </View>
        
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      {shoppingList.description && (
        <Text style={styles.description} numberOfLines={2}>
          {shoppingList.description}
        </Text>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${stats.completionPercentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {stats.completedItems}/{stats.totalItems} articles
          </Text>
        </View>
        
        <Text style={styles.percentage}>
          {stats.completionPercentage}%
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.badges}>
          {shoppingList.createdFromRecipes && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🍽️ Recettes</Text>
            </View>
          )}
          
          {stats.allItemsCompleted && (
            <View style={[styles.badge, styles.completedBadge]}>
              <Text style={styles.completedBadgeText}>✅ Terminé</Text>
            </View>
          )}
        </View>

        <Text style={styles.timeEstimate}>
          ⏱️ {timeEstimate.estimatedTimeText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const ShoppingListCard: React.FC<ShoppingListCardProps> = (props) => (
  <ErrorBoundary>
    <ShoppingListCardComponent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completedCard: {
    backgroundColor: '#F8F9FA',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  createdDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressContainer: {
    flex: 1,
    marginRight: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  percentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    flex: 1,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
  },
  completedBadgeText: {
    color: '#059669',
  },
  timeEstimate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});