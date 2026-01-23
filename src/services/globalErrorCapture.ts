import { supabase } from '@/integrations/supabase/client';

// Singleton service for capturing global errors
class GlobalErrorCaptureService {
  private isInitialized = false;
  private userContext: { id?: string; email?: string; name?: string; department?: string } = {};

  setUserContext(context: { id?: string; email?: string; name?: string; department?: string }) {
    this.userContext = context;
  }

  private async logError(errorData: {
    title: string;
    description: string;
    error_type: string;
    severity: string;
    component: string;
    stack_trace?: string;
    metadata?: any;
  }) {
    try {
      await supabase.from('system_errors').insert({
        ...errorData,
        user_id: this.userContext.id,
        user_email: this.userContext.email,
        url: window.location.href,
        user_agent: navigator.userAgent,
        status: 'open',
        recommendation: this.getRecommendation(errorData.error_type, errorData.description)
      });
    } catch (err) {
      // Silently fail to prevent infinite loops
    }
  }

  private getRecommendation(errorType: string, message: string): string {
    const lower = message.toLowerCase();
    
    if (errorType === 'network' || lower.includes('fetch') || lower.includes('network')) {
      return '1. Check internet connection\n2. Verify API endpoints\n3. Check CORS settings';
    }
    if (lower.includes('permission') || lower.includes('denied') || lower.includes('unauthorized')) {
      return '1. Check user permissions\n2. Verify authentication\n3. Review RLS policies';
    }
    if (lower.includes('timeout')) {
      return '1. Check server response time\n2. Optimize queries\n3. Increase timeout settings';
    }
    
    return '1. Check system logs\n2. Review recent changes\n3. Contact IT support';
  }

  private getSeverity(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('critical') || lower.includes('fatal') || lower.includes('crash')) return 'critical';
    if (lower.includes('error') || lower.includes('failed') || lower.includes('unauthorized')) return 'high';
    if (lower.includes('warning') || lower.includes('timeout')) return 'medium';
    return 'low';
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.logError({
        title: 'Unhandled JavaScript Error',
        description: event.message || 'Unknown error',
        error_type: 'system',
        severity: this.getSeverity(event.message),
        component: event.filename || 'Unknown',
        stack_trace: event.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || String(event.reason);
      this.logError({
        title: 'Unhandled Promise Rejection',
        description: message,
        error_type: 'system',
        severity: this.getSeverity(message),
        component: 'Promise',
        stack_trace: event.reason?.stack
      });
    });

    // Intercept fetch for network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Get URL safely
        const getUrl = (input: RequestInfo | URL): string => {
          if (typeof input === 'string') return input;
          if (input instanceof URL) return input.href;
          if (input instanceof Request) return input.url;
          return 'Unknown URL';
        };
        
        // Log failed HTTP responses (4xx, 5xx)
        if (!response.ok && response.status >= 400) {
          const url = getUrl(args[0]);
          
          // Skip logging for Supabase internal calls
          if (!url.includes('system_errors') && !url.includes('system_console_logs')) {
            this.logError({
              title: `HTTP ${response.status} Error`,
              description: `Request to ${url} failed with status ${response.status}`,
              error_type: 'network',
              severity: response.status >= 500 ? 'high' : 'medium',
              component: 'Network',
              metadata: { 
                url, 
                status: response.status, 
                statusText: response.statusText 
              }
            });
          }
        }
        
        return response;
      } catch (error: any) {
        const getUrl = (input: RequestInfo | URL): string => {
          if (typeof input === 'string') return input;
          if (input instanceof URL) return input.href;
          if (input instanceof Request) return input.url;
          return 'Unknown URL';
        };
        const url = getUrl(args[0]);
        
        // Skip logging for Supabase internal calls
        if (!url.includes('system_errors') && !url.includes('system_console_logs')) {
          this.logError({
            title: 'Network Request Failed',
            description: error.message || 'Fetch request failed',
            error_type: 'network',
            severity: 'high',
            component: 'Network',
            stack_trace: error.stack,
            metadata: { url }
          });
        }
        
        throw error;
      }
    };

    console.log('Global error capture initialized');
  }
}

export const globalErrorCapture = new GlobalErrorCaptureService();
