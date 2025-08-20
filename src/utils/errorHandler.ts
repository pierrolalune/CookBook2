/**
 * Secure error handling utilities
 * Prevents sensitive information leakage in error messages
 */

interface ErrorContext {
  userId?: string;
  action?: string;
  resource?: string;
  timestamp?: string;
}

interface SanitizedError {
  message: string;
  code?: string;
  timestamp: string;
  context?: Partial<ErrorContext>;
}

export class SecureErrorHandler {
  private static readonly SAFE_ERROR_MESSAGES: Record<string, string> = {
    // Database errors
    'SQLITE_CONSTRAINT': 'Les données fournies ne respectent pas les contraintes',
    'SQLITE_BUSY': 'Le système est temporairement indisponible',
    'SQLITE_LOCKED': 'Opération impossible, ressource verrouillée',
    'SQLITE_IOERR': 'Erreur d\'accès aux données',
    'SQLITE_CORRUPT': 'Données corrompues détectées',
    'SQLITE_FULL': 'Espace de stockage insuffisant',
    
    // Network errors
    'NETWORK_ERROR': 'Erreur de connexion réseau',
    'TIMEOUT_ERROR': 'Délai d\'attente dépassé',
    'SERVER_ERROR': 'Erreur serveur temporaire',
    
    // Validation errors
    'VALIDATION_ERROR': 'Données invalides fournies',
    'MISSING_REQUIRED_FIELD': 'Champ requis manquant',
    'INVALID_FORMAT': 'Format de données invalide',
    'INVALID_LENGTH': 'Longueur de données invalide',
    
    // General errors
    'UNAUTHORIZED': 'Accès non autorisé',
    'FORBIDDEN': 'Action interdite',
    'NOT_FOUND': 'Ressource introuvable',
    'ALREADY_EXISTS': 'Cette ressource existe déjà',
    'OPERATION_FAILED': 'Opération échouée',
  };

  private static readonly SENSITIVE_PATTERNS = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /key/gi,
    /api[_-]?key/gi,
    /auth/gi,
    /session/gi,
    /cookie/gi,
    /sql.*from.*where/gi,
    /select.*from/gi,
    /insert.*into/gi,
    /update.*set/gi,
    /delete.*from/gi,
    /\/[a-z0-9-_.]+@[a-z0-9-_.]+/gi, // email patterns
    /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // card numbers
    /\b[a-f0-9]{32}\b/gi, // potential hashes
  ];

  /**
   * Sanitizes error messages to remove sensitive information
   */
  public static sanitizeErrorMessage(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;
    
    // Check for sensitive patterns and redact them
    let sanitized = message;
    this.SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Remove file paths and line numbers in production
    if (!__DEV__) {
      sanitized = sanitized.replace(/\s+at\s+.*\(.*\)/g, '');
      sanitized = sanitized.replace(/\/[a-zA-Z0-9._\-\/]+:\d+:\d+/g, '[FILE]');
    }

    return sanitized;
  }

  /**
   * Gets a user-friendly error message based on error type
   */
  public static getUserFriendlyMessage(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;
    const errorCode = this.extractErrorCode(message);
    
    if (errorCode && this.SAFE_ERROR_MESSAGES[errorCode]) {
      return this.SAFE_ERROR_MESSAGES[errorCode];
    }

    // Check for common error patterns
    if (message.toLowerCase().includes('constraint')) {
      return this.SAFE_ERROR_MESSAGES['SQLITE_CONSTRAINT'];
    }
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('connection')) {
      return this.SAFE_ERROR_MESSAGES['NETWORK_ERROR'];
    }
    if (message.toLowerCase().includes('validation') || message.toLowerCase().includes('invalid')) {
      return this.SAFE_ERROR_MESSAGES['VALIDATION_ERROR'];
    }
    if (message.toLowerCase().includes('not found')) {
      return this.SAFE_ERROR_MESSAGES['NOT_FOUND'];
    }
    if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('permission')) {
      return this.SAFE_ERROR_MESSAGES['UNAUTHORIZED'];
    }

    // Default safe message
    return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
  }

  /**
   * Extracts error code from error message
   */
  private static extractErrorCode(message: string): string | null {
    // SQLite error codes
    const sqliteMatch = message.match(/SQLITE_[A-Z_]+/);
    if (sqliteMatch) return sqliteMatch[0];

    // Custom error codes
    const customMatch = message.match(/^([A-Z_]+):/);
    if (customMatch) return customMatch[1];

    return null;
  }

  /**
   * Creates a sanitized error object for logging
   */
  public static createSanitizedError(
    error: Error | string,
    context?: ErrorContext
  ): SanitizedError {
    const originalMessage = typeof error === 'string' ? error : error.message;
    
    return {
      message: this.sanitizeErrorMessage(originalMessage),
      code: this.extractErrorCode(originalMessage) || undefined,
      timestamp: new Date().toISOString(),
      context: context ? this.sanitizeContext(context) : undefined,
    };
  }

  /**
   * Sanitizes error context to remove sensitive information
   */
  private static sanitizeContext(context: ErrorContext): Partial<ErrorContext> {
    const sanitized: Partial<ErrorContext> = {};

    if (context.action) {
      sanitized.action = context.action;
    }
    if (context.resource && !this.containsSensitiveInfo(context.resource)) {
      sanitized.resource = context.resource;
    }
    if (context.timestamp) {
      sanitized.timestamp = context.timestamp;
    }
    // Never include userId in logs for privacy

    return sanitized;
  }

  /**
   * Checks if a string contains potentially sensitive information
   */
  private static containsSensitiveInfo(text: string): boolean {
    return this.SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Logs error securely (for development)
   */
  public static logError(
    error: Error | string,
    context?: ErrorContext
  ): void {
    if (__DEV__) {
      const sanitizedError = this.createSanitizedError(error, context);
      console.error('Error:', sanitizedError);
      
      // In development, also log original error for debugging
      if (typeof error !== 'string') {
        console.error('Original Error Stack:', error.stack);
      }
    } else {
      // In production, only log sanitized version
      const sanitizedError = this.createSanitizedError(error, context);
      console.error('Error:', sanitizedError.message);
      
      // TODO: Send to crash reporting service with sanitized data
      // this.sendToCrashReporting(sanitizedError);
    }
  }

  /**
   * Handles database errors specifically
   */
  public static handleDatabaseError(
    error: Error,
    operation: string,
    resource?: string
  ): never {
    this.logError(error, {
      action: operation,
      resource: resource,
      timestamp: new Date().toISOString(),
    });

    const userMessage = this.getUserFriendlyMessage(error);
    const sanitizedError = new Error(userMessage);
    sanitizedError.name = 'DatabaseError';
    
    throw sanitizedError;
  }

  /**
   * Handles validation errors specifically
   */
  public static handleValidationError(
    message: string,
    field?: string
  ): never {
    const context: ErrorContext = {
      action: 'validation',
      resource: field,
      timestamp: new Date().toISOString(),
    };

    this.logError(`VALIDATION_ERROR: ${message}`, context);

    const sanitizedError = new Error(this.getUserFriendlyMessage(message));
    sanitizedError.name = 'ValidationError';
    
    throw sanitizedError;
  }
}

export default SecureErrorHandler;