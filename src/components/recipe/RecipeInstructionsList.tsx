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
      onPress={interactive ? handleToggleComplete : onPress}
      activeOpacity={0.7}
      disabled={false}
    >
      {/* Step Number / Checkbox */}
      <View
        style={[
          styles.stepNumber,
          isCompleted && styles.completedStepNumber
        ]}
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
      </View>

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
    paddingVertical: 2,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xs,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.xs,
  },

  progressText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },

  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.textLight,
    borderRadius: spacing.borderRadius.sm,
  },

  resetButtonText: {
    fontSize: 10,
    color: colors.textWhite,
    fontWeight: typography.weights.medium,
  },

  instructionContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    marginBottom: 4,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },

  completedStepNumber: {
    backgroundColor: colors.success,
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.textWhite,
  },

  completedStepNumberText: {
    color: colors.textWhite,
  },

  checkmark: {
    fontWeight: typography.weights.bold,
    color: colors.textWhite,
    fontSize: 14,
  },

  instructionContent: {
    flex: 1,
    justifyContent: 'center',
  },

  instructionText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },

  completedInstructionText: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },

  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },

  completedBadge: {
    backgroundColor: colors.textLight,
  },

  durationText: {
    color: colors.textWhite,
    fontWeight: typography.weights.medium,
    fontSize: 10,
  },

  separator: {
    height: 0,
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
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  completionText: {
    fontSize: 12,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});