export * from './colors';
export * from './typography';
export * from './spacing';

import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

// Common styles used across components
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPadding,
  },
  
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardMargin,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  
  button: {
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.component.buttonPadding,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  primaryButton: {
    backgroundColor: colors.primary,
  },
  
  secondaryButton: {
    backgroundColor: colors.backgroundDark,
  },
  
  buttonText: {
    ...typography.styles.button,
    color: colors.textWhite,
  },
  
  secondaryButtonText: {
    ...typography.styles.button,
    color: colors.textSecondary,
  },
  
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.component.inputPadding,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.lg,
    backgroundColor: colors.backgroundLight,
  },
  
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundLight,
  },
  
  textH1: {
    ...typography.styles.h1,
    color: colors.textPrimary,
  },
  
  textH2: {
    ...typography.styles.h2,
    color: colors.textPrimary,
  },
  
  textH3: {
    ...typography.styles.h3,
    color: colors.textPrimary,
  },
  
  textBody: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },
  
  textCaption: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  
  textSmall: {
    ...typography.styles.small,
    color: colors.textLight,
  },
  
  // Layout helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spaceBetween: {
    justifyContent: 'space-between',
  },
  
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
});