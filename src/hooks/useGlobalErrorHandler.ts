import { useErrorReporting } from '@/hooks/useErrorReporting';

// Global error handler for catching and reporting all application errors
export const useGlobalErrorHandler = () => {
  // Make error reporting optional to avoid auth dependency issues
  let reportError: any = null;
  try {
    const errorReporting = useErrorReporting();
    reportError = errorReporting.reportError;
  } catch (error) {
    // If auth context is not available, create a fallback reporter
    reportError = (title: string, message: string) => {
      console.error('Error (no auth context):', { title, message });
    };
  }

  // Initialize global error handlers
  const initializeErrorHandlers = () => {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      reportError(
        'Unhandled Promise Rejection',
        event.reason?.message || String(event.reason),
        'system',
        'Global',
        event.reason?.stack
      );
    });

    // Catch global JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      
      reportError(
        'JavaScript Error',
        event.message || 'Unknown error',
        'system',
        event.filename || 'Global',
        event.error?.stack
      );
    });

    // Catch React errors (if using error boundaries)
    const originalError = console.error;
    console.error = (...args) => {
      // Call original console.error first to preserve logging
      originalError.apply(console, args);
      
      try {
        // Safely serialize error arguments
        const errorMessage = args.map(arg => {
          // Handle Error objects
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}`;
          }
          
          // Handle Request objects (can't be cloned)
          if (arg && typeof arg === 'object' && arg.constructor && arg.constructor.name === 'Request') {
            return '[Request Object]';
          }
          
          // Handle Response objects
          if (arg && typeof arg === 'object' && arg.constructor && arg.constructor.name === 'Response') {
            return '[Response Object]';
          }
          
          // Handle DOM elements
          if (arg instanceof Element) {
            return `[DOM Element: ${arg.tagName}]`;
          }
          
          // Handle other objects
          if (typeof arg === 'object' && arg !== null) {
            try {
              // Try shallow serialization first
              const keys = Object.keys(arg);
              if (keys.length > 0) {
                const preview = keys.slice(0, 3).map(k => `${k}=${String(arg[k])}`).join(', ');
                return `{${preview}${keys.length > 3 ? '...' : ''}}`;
              }
              return JSON.stringify(arg);
            } catch {
              return `[Object: ${arg.constructor?.name || 'Unknown'}]`;
            }
          }
          
          // Primitive values
          return String(arg);
        }).join(' ');
        
        // Skip Lovable-specific and DataClone errors to avoid loops
        if (errorMessage.includes('DataCloneError') || 
            errorMessage.includes('postMessage') ||
            errorMessage.includes('lovable.js')) {
          return;
        }
        
        // Filter and report significant React errors
        if (errorMessage.includes('React') || errorMessage.includes('Warning:')) {
          if (errorMessage.includes('Error:') || errorMessage.includes('Failed')) {
            reportError(
              'React Error',
              errorMessage.substring(0, 500), // Limit message length
              'system',
              'React',
              new Error().stack
            );
          }
        }
        
        // Report other significant errors
        if (errorMessage.includes('Error') && 
            !errorMessage.includes('Warning') &&
            errorMessage.length > 10) {
          reportError(
            'Console Error',
            errorMessage.substring(0, 500), // Limit message length
            'system',
            'Application',
            new Error().stack
          );
        }
      } catch (err) {
        // Silently ignore errors in error handler to prevent infinite loops
        originalError('[Error Handler] Failed to process error:', err);
      }
    };
  };

  // Report specific error types
  const reportDatabaseError = (error: any, operation: string, table?: string) => {
    const component = table ? `Database.${table}` : 'Database';
    const title = `Database Error: ${operation}`;
    
    reportError(
      title,
      error.message || String(error),
      'database',
      component,
      error.stack
    );
  };

  const reportNetworkError = (error: any, url: string, method: string = 'GET') => {
    const title = `Network Error: ${method} ${url}`;
    
    reportError(
      title,
      error.message || `Failed to ${method} ${url}`,
      'network',
      'Network',
      error.stack
    );
  };

  const reportAuthenticationError = (error: any, operation: string) => {
    const title = `Authentication Error: ${operation}`;
    
    reportError(
      title,
      error.message || String(error),
      'authentication',
      'Auth',
      error.stack
    );
  };

  const reportPermissionError = (error: any, resource: string, action: string) => {
    const title = `Permission Denied: ${action} on ${resource}`;
    
    reportError(
      title,
      error.message || `Access denied for ${action} on ${resource}`,
      'permission',
      'Security',
      error.stack
    );
  };

  const reportWorkflowError = (error: any, operation: string) => {
    const title = `Workflow Error: ${operation}`;
    
    reportError(
      title,
      error.message || String(error),
      'workflow',
      'Workflow',
      error.stack
    );
  };

  const reportValidationError = (error: any, field: string, value: any) => {
    const title = `Validation Error: ${field}`;
    
    reportError(
      title,
      error.message || `Invalid value for ${field}: ${value}`,
      'validation',
      'Validation',
      error.stack
    );
  };

  return {
    initializeErrorHandlers,
    reportDatabaseError,
    reportNetworkError,
    reportAuthenticationError,
    reportPermissionError,
    reportWorkflowError,
    reportValidationError,
    reportError
  };
};