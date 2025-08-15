import { useErrorReporting } from '@/hooks/useErrorReporting';

// Global error handler for catching and reporting all application errors
export const useGlobalErrorHandler = () => {
  const { reportError } = useErrorReporting();

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
      const errorMessage = args.join(' ');
      
      // Filter React-specific errors to avoid spam
      if (errorMessage.includes('React') || errorMessage.includes('Warning:')) {
        if (errorMessage.includes('Error:') || errorMessage.includes('Failed')) {
          reportError(
            'React Error',
            errorMessage,
            'system',
            'React',
            new Error().stack
          );
        }
      }
      
      // Call original console.error
      originalError.apply(console, args);
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