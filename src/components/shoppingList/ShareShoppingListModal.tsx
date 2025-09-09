import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Share
} from 'react-native';
import { ShoppingList } from '../../types';
import { ShoppingListUtils } from '../../utils/shoppingListUtils';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ShareShoppingListModalProps {
  visible: boolean;
  shoppingList: ShoppingList | null;
  onClose: () => void;
}

const ShareShoppingListModalComponent: React.FC<ShareShoppingListModalProps> = ({
  visible,
  shoppingList,
  onClose
}) => {
  const [sharing, setSharing] = useState(false);

  const shareAsText = async () => {
    if (!shoppingList) return;

    try {
      setSharing(true);
      const textContent = ShoppingListUtils.exportToText(shoppingList);
      
      const shareOptions = {
        message: textContent,
        title: `Liste de courses: ${shoppingList.name}`,
      };

      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        Alert.alert('✅', 'Liste partagée avec succès !');
        onClose();
      }
    } catch (error) {
      console.error('Error sharing shopping list:', error);
      Alert.alert(
        'Erreur',
        'Impossible de partager la liste de courses. Veuillez réessayer.'
      );
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shoppingList) return;

    try {
      const textContent = ShoppingListUtils.exportToText(shoppingList);
      // Note: React Native doesn't have built-in clipboard, but we can use Share
      await Share.share({
        message: textContent,
        title: `Copier: ${shoppingList.name}`,
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Erreur', 'Impossible de copier le texte.');
    }
  };

  if (!shoppingList) return null;

  const stats = ShoppingListUtils.getCompletionStats(shoppingList.items);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Partager la liste</Text>
            <Text style={styles.listName} numberOfLines={2}>
              {shoppingList.name}
            </Text>
          </View>

          <View style={styles.stats}>
            <Text style={styles.statsText}>
              📋 {stats.totalItems} articles • {stats.completionPercentage}% terminé
            </Text>
            {shoppingList.createdFromRecipes && (
              <Text style={styles.recipesBadge}>
                🍽️ Généré à partir de recettes
              </Text>
            )}
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={[styles.option, sharing && styles.disabledOption]}
              onPress={shareAsText}
              disabled={sharing}
            >
              <Text style={styles.optionIcon}>📱</Text>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Partager en texte</Text>
                <Text style={styles.optionDescription}>
                  Partager via WhatsApp, SMS, email, etc.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, sharing && styles.disabledOption]}
              onPress={copyToClipboard}
              disabled={sharing}
            >
              <Text style={styles.optionIcon}>📋</Text>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Copier le texte</Text>
                <Text style={styles.optionDescription}>
                  Copier dans le presse-papier
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ShareShoppingListModal: React.FC<ShareShoppingListModalProps> = (props) => (
  <ErrorBoundary>
    <ShareShoppingListModalComponent {...props} />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  listName: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  stats: {
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  recipesBadge: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  options: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});