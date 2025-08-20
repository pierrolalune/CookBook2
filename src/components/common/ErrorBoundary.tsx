import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ErrorBoundaryState, ErrorInfo } from '../../types';
import { colors, spacing, typography, commonStyles } from '../../styles';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo | null, onReset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number | boolean | undefined | null>;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state when resetKeys change
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => {
        return prevProps.resetKeys?.[index] !== key;
      });

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback && error) {
        return fallback(error, errorInfo, this.resetErrorBoundary);
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Oops! Une erreur s'est produite</Text>
            <Text style={styles.errorMessage}>
              {error?.message || 'Une erreur inattendue s\'est produite'}
            </Text>
            
            {__DEV__ && errorInfo && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Informations de débogage:</Text>
                <Text style={styles.debugText} numberOfLines={10}>
                  {error?.stack}
                </Text>
                <Text style={styles.debugText} numberOfLines={5}>
                  {errorInfo.componentStack}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.retryButton}
              onPress={this.resetErrorBoundary}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specific error boundary for screens
export const ScreenErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Log to crash reporting service in production
      if (!__DEV__) {
        console.error('Screen Error:', error, errorInfo);
        // TODO: Send to crash reporting service (Sentry, Bugsnag, etc.)
      }
    }}
    fallback={(error, errorInfo, onReset) => (
      <View style={styles.screenErrorContainer}>
        <View style={styles.screenErrorContent}>
          <Text style={styles.errorIcon}>🛠️</Text>
          <Text style={styles.screenErrorTitle}>Écran indisponible</Text>
          <Text style={styles.screenErrorMessage}>
            Cette page ne peut pas être affichée pour le moment.
          </Text>
          <TouchableOpacity 
            style={[commonStyles.button, commonStyles.primaryButton]}
            onPress={onReset}
          >
            <Text style={commonStyles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  >
    {children}
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
  },

  errorContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing['3xl'],
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    ...commonStyles.shadow,
  },

  screenErrorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
  },

  screenErrorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },

  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.xl,
  },

  errorTitle: {
    ...typography.styles.h2,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  screenErrorTitle: {
    ...typography.styles.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  errorMessage: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },

  screenErrorMessage: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: 24,
  },

  debugContainer: {
    backgroundColor: colors.backgroundDark,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
  },

  debugTitle: {
    ...typography.styles.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  debugText: {
    ...typography.styles.small,
    color: colors.textLight,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    minWidth: 120,
  },

  retryButtonText: {
    ...typography.styles.button,
    color: colors.textWhite,
    textAlign: 'center',
  },
});