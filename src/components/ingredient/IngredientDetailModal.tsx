import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ingredient } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';
import { SeasonalUtils } from '../../utils/seasonalUtils';
import { AddToShoppingListModal } from '../shoppingList/AddToShoppingListModal';

interface IngredientDetailModalProps {
  ingredient: Ingredient | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart?: (ingredient: Ingredient, unit: string) => void;
  onToggleFavorite?: (ingredient: Ingredient) => void;
  isFavorite?: boolean;
}

export const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
  ingredient,
  visible,
  onClose,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [shoppingListModalVisible, setShoppingListModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      // Set default unit when modal opens
      if (ingredient?.units && ingredient.units.length > 0) {
        setSelectedUnit(ingredient.units[0]);
      }
      
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, ingredient]);

  if (!ingredient) return null;

  const seasonalInfo = SeasonalUtils.getSeasonalInfo(ingredient);

  const getCategoryIcon = (category: string): string => {
    const categoryIcons: { [key: string]: string } = {
      'fruits': '🍎',
      'legumes': '🥬',
      'peche': '🐟',
      'viande': '🥩',
      'produits_laitiers': '🥛',
      'epicerie': '🛒',
    };
    return categoryIcons[category] || '📋';
  };

  const getMonthsDisplay = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();
    
    if (!ingredient.seasonal || !ingredient.seasonal.months || ingredient.seasonal.months.length === 0) {
      return null;
    }

    return months.map((month, index) => {
      const isActive = ingredient.seasonal?.months.includes(index + 1);
      const isPeak = ingredient.seasonal?.peak_months?.includes(index + 1);
      const isCurrent = index === currentMonth;
      
      return {
        name: month,
        isActive,
        isPeak,
        isCurrent,
      };
    });
  };

  const handleAddToCart = () => {
    setShoppingListModalVisible(true);
  };

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(ingredient);
    }
  };

  const monthsDisplay = getMonthsDisplay();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}>
          {/* Modern Gradient Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.ingredientIcon}>
                {getCategoryIcon(ingredient.category)}
              </Text>
              <View style={styles.headerText}>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                <Text style={styles.subcategory}>{ingredient.subcategory}</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Seasonal Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📅</Text>
                <Text style={styles.sectionTitle}>Disponibilité</Text>
              </View>
              <View style={styles.sectionContent}>
                {ingredient.seasonal && monthsDisplay ? (
                  <View style={styles.seasonInfo}>
                    <View style={styles.seasonTimeline}>
                      {monthsDisplay.map((month, index) => (
                        <View
                          key={index}
                          style={[
                            styles.seasonMonth,
                            month.isActive && styles.seasonMonthActive,
                          ]}
                        >
                          <Text style={[
                            styles.seasonMonthText,
                            month.isActive && styles.seasonMonthActiveText,
                          ]}>
                            {month.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                    
                    {ingredient.seasonal?.peak_months && ingredient.seasonal.peak_months.length > 0 && (
                      <View style={styles.peakIndicator}>
                        <View style={styles.peakBadge}>
                          <Text style={styles.peakBadgeText}>🔥 Pic de saison</Text>
                        </View>
                        <Text style={styles.peakMonthText}>
                          {seasonalInfo.peakPeriod || 'Période optimale'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.allYearContainer}>
                    <Text style={styles.allYearText}>Toute l'année</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Units Section */}
            {ingredient.units && ingredient.units.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>⚖️</Text>
                  <Text style={styles.sectionTitle}>Unités disponibles</Text>
                </View>
                <View style={styles.sectionContent}>
                  <View style={styles.unitsContainer}>
                    {ingredient.units.map((unit, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.unitPill,
                          selectedUnit === unit && styles.unitPillSelected,
                        ]}
                        onPress={() => setSelectedUnit(unit)}
                      >
                        <Text style={[
                          styles.unitPillText,
                          selectedUnit === unit && styles.unitPillSelectedText,
                        ]}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Description */}
            {ingredient.description && ingredient.description.trim() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📝</Text>
                  <Text style={styles.sectionTitle}>Description</Text>
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.descriptionText}>{ingredient.description}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  isFavorite && styles.favoriteButtonActive,
                ]}
                onPress={handleToggleFavorite}
              >
                <Text style={[
                  styles.favoriteButtonIcon,
                  isFavorite && styles.favoriteButtonIconActive,
                ]}>
                  ❤️
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddToCart}
                disabled={!selectedUnit}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonIcon}>🛒</Text>
                  <Text style={styles.primaryButtonText}>Ajouter au panier</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bottom padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>

        {/* Add to Shopping List Modal */}
        <AddToShoppingListModal
          visible={shoppingListModalVisible}
          onClose={() => setShoppingListModalVisible(false)}
          ingredient={ingredient}
          mode="ingredient"
        />
      </Animated.View>
    </Modal>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    width: '100%',
    maxWidth: 380,
    minHeight: 600,
    maxHeight: screenHeight * 0.9,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 15,
    overflow: 'hidden',
  },

  header: {
    padding: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    position: 'relative',
  },

  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  ingredientIcon: {
    fontSize: 64,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },

  headerText: {
    flex: 1,
  },

  ingredientName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },

  subcategory: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },

  section: {
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    paddingHorizontal: 25,
  },

  sectionIcon: {
    fontSize: 20,
    color: '#667eea',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },

  sectionContent: {
    paddingHorizontal: 25,
  },

  // Seasonal Information Styles
  seasonInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },

  seasonTimeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingHorizontal: 5,
  },

  seasonMonth: {
    minWidth: 32,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginVertical: 2,
    marginHorizontal: 1,
    borderRadius: 6,
  },

  seasonMonthActive: {
    backgroundColor: '#667eea',
  },

  seasonMonthText: {
    fontSize: 11,
    color: '#95a5a6',
    fontWeight: '500',
    textAlign: 'center',
  },

  seasonMonthActiveText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },

  peakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },

  peakBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#e67e22',
  },

  peakBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  peakMonthText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },

  allYearContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },

  allYearText: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: '600',
  },

  // Units Section Styles
  unitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  unitPill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },

  unitPillSelected: {
    backgroundColor: '#667eea',
    borderColor: 'transparent',
  },

  unitPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },

  unitPillSelectedText: {
    color: '#ffffff',
  },

  descriptionText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
  },

  // Action Buttons
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
    paddingHorizontal: 25,
  },

  favoriteButton: {
    padding: 18,
    borderRadius: 15,
    backgroundColor: '#f5f7fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteButtonActive: {
    backgroundColor: '#ff6b6b',
  },

  favoriteButtonIcon: {
    fontSize: 16,
  },

  favoriteButtonIconActive: {
    color: '#ffffff',
  },

  primaryButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },

  primaryButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  primaryButtonIcon: {
    fontSize: 16,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  bottomPadding: {
    height: 25,
  },
});
