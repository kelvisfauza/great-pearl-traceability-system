import { useErrorReporting } from '@/hooks/useErrorReporting';

// Global error handler for catching and reporting all application errors
export const useGlobalErrorHandler = () => {
  // Always call the hook unconditionally
  const errorReporting = useErrorReporting();
  const reportError = errorReporting.reportError;

  // Initialize global error handlers
  const initializeErrorHandlers = () => {
    // Global error handlers disabled - Firebase has been migrated to Supabase
    console.log('Global error handlers disabled (Firebase migration)');
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
