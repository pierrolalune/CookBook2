import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MonthCard } from './MonthCard';
import { colors, spacing, typography } from '../../styles';

interface MonthData {
  id: number;
  name: string;
  fullName: string;
}

interface SeasonalMonthSelectorProps {
  selectedMonths: number[];
  peakMonths: number[];
  onMonthToggle: (monthId: number) => void;
  onPeakMonthToggle: (monthId: number) => void;
  isVisible: boolean;
}

const MONTHS: MonthData[] = [
  { id: 1, name: 'Jan', fullName: 'Janvier' },
  { id: 2, name: 'Fév', fullName: 'Février' },
  { id: 3, name: 'Mar', fullName: 'Mars' },
  { id: 4, name: 'Avr', fullName: 'Avril' },
  { id: 5, name: 'Mai', fullName: 'Mai' },
  { id: 6, name: 'Juin', fullName: 'Juin' },
  { id: 7, name: 'Juil', fullName: 'Juillet' },
  { id: 8, name: 'Août', fullName: 'Août' },
  { id: 9, name: 'Sep', fullName: 'Septembre' },
  { id: 10, name: 'Oct', fullName: 'Octobre' },
  { id: 11, name: 'Nov', fullName: 'Novembre' },
  { id: 12, name: 'Déc', fullName: 'Décembre' },
];

export const SeasonalMonthSelector: React.FC<SeasonalMonthSelectorProps> = ({
  selectedMonths,
  peakMonths,
  onMonthToggle,
  onPeakMonthToggle,
  isVisible,
}) => {
  if (!isVisible) return null;

  const availablePeakMonths = MONTHS.filter(month => 
    selectedMonths.includes(month.id)
  );

  return (
    <View style={styles.container}>
      {/* Regular Season Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🌿</Text>
          <Text style={styles.sectionTitle}>Mois de disponibilité</Text>
        </View>
        <View style={styles.monthsGrid}>
          {MONTHS.map((month) => (
            <MonthCard
              key={month.id}
              month={month}
              isSelected={selectedMonths.includes(month.id)}
              isPeakMonth={false}
              onToggle={() => onMonthToggle(month.id)}
            />
          ))}
        </View>
      </View>

      {/* Peak Season Selection */}
      {selectedMonths.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔥</Text>
            <Text style={styles.sectionTitle}>Mois de pic de saison</Text>
            <Text style={styles.sectionSubtitle}>(optionnel)</Text>
          </View>
          <Text style={styles.helperText}>
            Sélectionnez les mois où l'ingrédient est à son pic de qualité/disponibilité
          </Text>
          <View style={styles.monthsGrid}>
            {availablePeakMonths.map((month) => (
              <MonthCard
                key={month.id}
                month={month}
                isSelected={peakMonths.includes(month.id)}
                isPeakMonth={true}
                onToggle={() => onPeakMonthToggle(month.id)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },

  section: {
    marginBottom: spacing.lg,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  sectionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },

  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#95a5a6',
    fontStyle: 'italic',
  },

  helperText: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: spacing.sm,
    lineHeight: 16,
  },

  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
});