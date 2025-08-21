import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { RecipeInstruction } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';

interface RecipeInstructionsListProps {
  instructions: RecipeInstruction[];
  editable?: boolean;
  onInstructionPress?: (instruction: RecipeInstruction, index: number) => void;
  onInstructionComplete?: (instruction: RecipeInstruction, completed: boolean) => void;
  showTimer?: boolean;
  interactive?: boolean;
}

interface InstructionItemProps {
  instruction: RecipeInstruction;
  index: number;
  isCompleted: boolean;
  onPress?: () => void;
  onToggleComplete?: (completed: boolean) => void;
  showTimer: boolean;
  interactive: boolean;
}

const InstructionItem: React.FC<InstructionItemProps> = ({
  instruction,
  index,
  isCompleted,
  onPress,
  onToggleComplete,
  showTimer,
  interactive
}) => {
  const [checkScale] = useState(new Animated.Value(1));

  const handleToggleComplete = () => {
    if (!interactive) return;

    // Animate check mark
    Animated.sequence([
      Animated.timing(checkScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(checkScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onToggleComplete?.(!isCompleted);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.instructionContainer,
        isCompleted && styles.completedInstruction,
        !interactive && styles.nonInteractive
      ]}
      onPress={onPress}
      activeOpacity={interactive ? 0.7 : 1}
      disabled={!interactive}
    >
      {/* Step Number / Checkbox */}
      <TouchableOpacity
        style={[
          styles.stepNumber,
          isCompleted && styles.completedStepNumber
        ]}
        onPress={handleToggleComplete}
        disabled={!interactive}
      >
        {interactive && isCompleted ? (
          <Animated.Text
            style={[
              styles.checkmark,
              { transform: [{ scale: checkScale }] }
            ]}
          >
            ✓
          </Animated.Text>
        ) : (
          <Text style={[
            styles.stepNumberText,
            isCompleted && styles.completedStepNumberText
          ]}>
            {instruction.stepNumber}
          </Text>
        )}
      </TouchableOpacity>

      {/* Instruction Content */}
      <View style={styles.instructionContent}>
        <Text style={[
          styles.instructionText,
          isCompleted && styles.completedInstructionText
        ]}>
          {instruction.instruction}
        </Text>

        {/* Duration Badge */}
        {showTimer && instruction.duration && (
          <View style={[styles.durationBadge, isCompleted && styles.completedBadge]}>
            <Text style={styles.durationText}>
              ⏱️ {formatDuration(instruction.duration)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const RecipeInstructionsList: React.FC<RecipeInstructionsListProps> = ({
  instructions,
  editable = false,
  onInstructionPress,
  onInstructionComplete,
  showTimer = true,
  interactive = false
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const handleInstructionPress = (instruction: RecipeInstruction, index: number) => {
    if (editable) {
      onInstructionPress?.(instruction, index);
    }
  };

  const handleToggleComplete = (instruction: RecipeInstruction, completed: boolean) => {
    const newCompleted = new Set(completedSteps);
    if (completed) {
      newCompleted.add(instruction.id);
    } else {
      newCompleted.delete(instruction.id);
    }
    setCompletedSteps(newCompleted);
    onInstructionComplete?.(instruction, completed);
  };

  const sortedInstructions = [...instructions].sort((a, b) => a.stepNumber - b.stepNumber);

  const renderInstruction = ({ item, index }: { item: RecipeInstruction, index: number }) => (
    <InstructionItem
      instruction={item}
      index={index}
      isCompleted={completedSteps.has(item.id)}
      onPress={() => handleInstructionPress(item, index)}
      onToggleComplete={(completed) => handleToggleComplete(item, completed)}
      showTimer={showTimer}
      interactive={interactive}
    />
  );

  if (sortedInstructions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucune instruction disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Header (for interactive mode) */}
      {interactive && (
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            Étapes complétées: {completedSteps.size}/{instructions.length}
          </Text>
          {completedSteps.size > 0 && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setCompletedSteps(new Set())}
            >
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Instructions List */}
      <View style={styles.listContainer}>
        {sortedInstructions.map((item, index) => (
          <View key={item.id}>
            {renderInstruction({ item, index })}
            {index < sortedInstructions.length - 1 && <View style={styles.separator} />}
          </View>
        ))}
      </View>

      {/* Summary Footer (for interactive mode) */}
      {interactive && completedSteps.size === instructions.length && instructions.length > 0 && (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>
            🎉 Toutes les étapes sont terminées !
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  listContainer: {
    paddingVertical: spacing.sm,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
  },

  progressText: {
    ...typography.styles.body,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },

  resetButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.textLight,
    borderRadius: spacing.borderRadius.sm,
  },

  resetButtonText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.medium,
  },

  instructionContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  completedInstruction: {
    backgroundColor: colors.backgroundLight,
    borderLeftColor: colors.success,
    opacity: 0.8,
  },

  nonInteractive: {
    borderLeftColor: colors.textLight,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },

  completedStepNumber: {
    backgroundColor: colors.success,
  },

  stepNumberText: {
    ...typography.styles.body,
    fontWeight: typography.weights.bold,
    color: colors.textWhite,
  },

  completedStepNumberText: {
    color: colors.textWhite,
  },

  checkmark: {
    ...typography.styles.body,
    fontWeight: typography.weights.bold,
    color: colors.textWhite,
    fontSize: 18,
  },

  instructionContent: {
    flex: 1,
    justifyContent: 'center',
  },

  instructionText: {
    ...typography.styles.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },

  completedInstructionText: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },

  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: spacing.borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },

  completedBadge: {
    backgroundColor: colors.textLight,
  },

  durationText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.medium,
    fontSize: 11,
  },

  separator: {
    height: spacing.sm,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  emptyText: {
    ...typography.styles.body,
    color: colors.textLight,
    textAlign: 'center',
  },

  completionContainer: {
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  completionText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});