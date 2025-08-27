import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingList } from '../../types';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

interface ShoppingListCardProps {
  shoppingList: ShoppingList;
  onPress: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const ShoppingListCard: React.FC<ShoppingListCardProps> = ({
  shoppingList,
  onPress,
  onDelete,
  onDuplicate
}) => {
  const completedItemsCount = shoppingList.items.filter(item => item.isCompleted).length;
  const totalItemsCount = shoppingList.items.length;
  const progressPercentage = totalItemsCount > 0 
    ? (completedItemsCount / totalItemsCount) * 100 
    : 0;
  
  const isCompleted = totalItemsCount > 0 && completedItemsCount === totalItemsCount;

  const handleMoreOptions = () => {
    Alert.alert(
      shoppingList.name,
      'Que souhaitez-vous faire avec cette liste ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dupliquer',
          onPress: onDuplicate,
          style: 'default'
        },
        {
          text: 'Supprimer',
          onPress: onDelete,
          style: 'destructive'
        }
      ]
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons 
              name={isCompleted ? "checkmark-circle" : "basket-outline"} 
              size={24} 
              color={isCompleted ? colors.success : colors.primary} 
            />
            <Text style={[styles.title, isCompleted && styles.completedTitle]} numberOfLines={1}>
              {shoppingList.name}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.moreButton}
            onPress={handleMoreOptions}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Description */}
        {shoppingList.description && (
          <Text style={styles.description} numberOfLines={2}>
            {shoppingList.description}
          </Text>
        )}

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {completedItemsCount}/{totalItemsCount} articles
            </Text>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark" size={14} color={colors.textWhite} />
                <Text style={styles.completedBadgeText}>Terminé</Text>
              </View>
            )}
          </View>
          
          {totalItemsCount > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${progressPercentage}%` },
                    isCompleted && styles.completedProgressBar
                  ]} 
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.round(progressPercentage)}%
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={14} color={colors.textLight} />
            <Text style={styles.dateText}>
              Créée {formatDate(shoppingList.createdAt)}
            </Text>
          </View>
          
          {totalItemsCount > 0 && (
            <View style={styles.statsContainer}>
              <Ionicons name="list-outline" size={14} color={colors.textLight} />
              <Text style={styles.statsText}>
                {totalItemsCount} article{totalItemsCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  completedCard: {
    borderColor: colors.success,
    borderWidth: 1.5
  },
  cardContent: {
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginLeft: 10,
    flex: 1
  },
  completedTitle: {
    color: colors.success
  },
  moreButton: {
    padding: 4
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12
  },
  progressSection: {
    marginBottom: 12
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  progressText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  completedBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textWhite,
    marginLeft: 4
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginRight: 8
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3
  },
  completedProgressBar: {
    backgroundColor: colors.success
  },
  progressPercentage: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    minWidth: 35,
    textAlign: 'right'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginLeft: 4
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statsText: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginLeft: 4
  }
});

export default ShoppingListCard;