/**
 * Centralized Logging System
 * Provides consistent logging across the application with environment-aware behavior
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log error messages
   * In development: logs to console
   * In production: can be extended to send to external service (Sentry, LogRocket, etc.)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context);
    }

    // In production, send to external error tracking service
    if (this.isProduction) {
      // TODO: Integrate with Sentry, LogRocket, or other error tracking service
      // Example: Sentry.captureException(error, { extra: { message, ...context } });
      
      // For now, still log to console in production for debugging
      console.error(`[ERROR] ${message}`, error);
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context);
    }
  }

  /**
   * Log info messages (only in development)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context);
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Log API errors with structured data
   */
  apiError(endpoint: string, error: Error | unknown, statusCode?: number): void {
    this.error(
      `API Error: ${endpoint}`,
      error,
      {
        endpoint,
        statusCode,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Log database errors
   */
  dbError(operation: string, error: Error | unknown, query?: string): void {
    this.error(
      `Database Error: ${operation}`,
      error,
      {
        operation,
        query: query?.substring(0, 200), // Truncate long queries
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Log validation errors
   */
  validationError(field: string, message: string, context?: LogContext): void {
    this.warn(
      `Validation Error: ${field} - ${message}`,
      {
        field,
        ...context,
        timestamp: new Date().toISOString(),
      }
    );
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogContext };
