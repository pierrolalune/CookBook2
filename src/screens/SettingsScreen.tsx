import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../styles';
import { resetDatabase, initializeDatabase } from '../database';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';

export const SettingsScreen: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);

  const handleDatabaseReset = () => {
    Alert.alert(
      'Réinitialiser la base de données',
      'Cette action supprimera TOUTES les données (ingrédients, recettes, favoris) et rechargera les données par défaut.\n\n⚠️ Cette action est IRRÉVERSIBLE !\n\nÊtes-vous sûr de vouloir continuer ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'CONFIRMER LA SUPPRESSION',
          style: 'destructive',
          onPress: () => performDatabaseReset()
        }
      ]
    );
  };

  const performDatabaseReset = async () => {
    try {
      setIsResetting(true);
      
      console.log('🧹 [Settings] Starting database hard reset...');
      
      // Reset the database completely
      await resetDatabase();
      console.log('✅ [Settings] Database reset complete');
      
      // Reinitialize with fresh data
      await initializeDatabase();
      console.log('✅ [Settings] Database reinitialized');
      
      Alert.alert(
        'Réinitialisation terminée',
        'La base de données a été complètement réinitialisée avec les données par défaut.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ [Settings] Database reset failed:', error);
      Alert.alert(
        'Erreur de réinitialisation',
        `Impossible de réinitialiser la base de données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsResetting(false);
    }
  };

  const SettingItem: React.FC<{
    title: string;
    description: string;
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    danger?: boolean;
    loading?: boolean;
  }> = ({ title, description, onPress, icon, danger = false, loading = false }) => (
    <TouchableOpacity 
      style={[styles.settingItem, danger && styles.dangerItem]} 
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.settingIcon}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={danger ? colors.error : colors.primary} 
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>
      <View style={styles.settingAction}>
        {loading ? (
          <ActivityIndicator size="small" color={danger ? colors.error : colors.primary} />
        ) : (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={colors.textSecondary} 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenErrorBoundary>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Paramètres</Text>
          <Text style={styles.subtitle}>Configuration de l'application</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base de données</Text>
          
          <SettingItem
            title="Réinitialiser la base de données"
            description="Supprimer toutes les données et recharger les données par défaut"
            icon="trash-outline"
            onPress={handleDatabaseReset}
            danger={true}
            loading={isResetting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version de l'application</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Base de données</Text>
            <Text style={styles.infoValue}>SQLite</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            CookBookP - Application de gestion d'ingrédients et de recettes
          </Text>
        </View>
      </ScrollView>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  title: {
    ...typography.styles.h1,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },

  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  sectionTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  dangerItem: {
    borderColor: colors.error + '20',
    backgroundColor: colors.error + '05',
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  settingContent: {
    flex: 1,
  },

  settingTitle: {
    ...typography.styles.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  dangerText: {
    color: colors.error,
  },

  settingDescription: {
    ...typography.styles.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  settingAction: {
    marginLeft: spacing.sm,
  },

  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  infoLabel: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },

  infoValue: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },

  footer: {
    margin: spacing.xl,
    alignItems: 'center',
  },

  footerText: {
    ...typography.styles.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});