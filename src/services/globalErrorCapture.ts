import { supabase } from '@/integrations/supabase/client';
import { explainError } from '@/lib/errorExplain';

const RECIPIENTS = ['tatwanzire@greatpearlcoffee.com', 'fauzakusa@greatpearlcoffee.com'];
const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // suppress identical error for 10 min
const PENDING_STORAGE_KEY = 'client_errors_pending_v1';
const LAST_SENT_KEY = 'client_errors_last_sent_date';
const DIGEST_HOUR = 17; // 5 PM local time
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 min

interface CapturedError {
  title: string;
  description: string;
  error_type: string;
  severity: string;
  component: string;
  stack_trace?: string;
  metadata?: any;
  ts: number;
}

// Singleton service for capturing global errors — emails only, no DB writes
class GlobalErrorCaptureService {
  private isInitialized = false;
  private userContext: { id?: string; email?: string; name?: string; department?: string } = {};
  private dedupe = new Map<string, number>();

  setUserContext(context: { id?: string; email?: string; name?: string; department?: string }) {
    this.userContext = context;
  }

  private signature(e: { title: string; description: string; component: string }) {
    return `${e.title}|${(e.description || '').slice(0, 200)}|${e.component}`;
  }

  private async logError(errorData: Omit<CapturedError, 'ts'>) {
    try {
      const sig = this.signature(errorData);
      const last = this.dedupe.get(sig) || 0;
      const now = Date.now();
      if (now - last < DEDUPE_WINDOW_MS) return; // suppress duplicate
      this.dedupe.set(sig, now);

      // All errors are batched into a single daily 5 PM digest — never sent immediately
      this.persistError({ ...errorData, ts: now, metadata: { ...(errorData.metadata || {}), page: window.location.pathname } });
    } catch {
      // never throw from error capture
    }
  }

  private persistError(e: CapturedError) {
    try {
      const raw = localStorage.getItem(PENDING_STORAGE_KEY);
      const list: CapturedError[] = raw ? JSON.parse(raw) : [];
      list.push(e);
      const trimmed = list.slice(-500);
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
    }
  }

  private async flushDigestIfDue() {
    try {
      const now = new Date();
      if (now.getHours() < DIGEST_HOUR) return;
      const todayKey = now.toISOString().slice(0, 10);
      if (localStorage.getItem(LAST_SENT_KEY) === todayKey) return;

      const raw = localStorage.getItem(PENDING_STORAGE_KEY);
      const list: CapturedError[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(LAST_SENT_KEY, todayKey);
      if (list.length === 0) return;

      localStorage.removeItem(PENDING_STORAGE_KEY);

      const who = this.userContext.name || this.userContext.email || 'A user';
      const groups = new Map<string, { text: string; count: number; first: number; last: number }>();
      for (const e of list) {
        const text = explainError(who, { page: e.metadata?.page, url: e.metadata?.url, method: e.metadata?.method, status: e.metadata?.status, body: e.metadata?.body, description: e.description, title: e.title });
        const g = groups.get(text);
        if (g) { g.count++; g.last = Math.max(g.last, e.ts); } else groups.set(text, { text, count: 1, first: e.ts, last: e.ts });
      }
      const lines: string[] = [];
      lines.push(`${who} (${this.userContext.email || 'n/a'}, ${this.userContext.department || 'no department'}) ran into ${list.length} problem(s) today — ${groups.size} different kind(s):`);
      lines.push('');
      [...groups.values()].sort((a, b) => b.count - a.count).forEach((g, i) => {
        const when = g.count > 1 ? `happened ${g.count} times, ${new Date(g.first).toLocaleTimeString()}–${new Date(g.last).toLocaleTimeString()}` : `at ${new Date(g.first).toLocaleString()}`;
        lines.push(`${i + 1}. ${g.text} (${when})`);
        lines.push('');
      });
      const subject = `[Daily Error Digest] ${who}: ${groups.size} kind(s) of problem — ${todayKey}`;
      const idem = `client-digest-${todayKey}-${this.userContext.email || 'anon'}`;

      for (const recipient of RECIPIENTS) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'general-notification',
              recipientEmail: recipient,
              idempotencyKey: `${idem}-${recipient}`,
              templateData: {
                title: `What went wrong for ${who} today`,
                subject,
                message: lines.join('\n'),
                recipientName: recipient.split('@')[0],
              },
            },
          });
        } catch {
          // swallow
        }
      }
    } catch {
      // never throw
    }
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

    // Schedule the daily 5 PM digest check (covers ALL client errors)
    void this.flushDigestIfDue();
    window.setInterval(() => { void this.flushDigestIfDue(); }, CHECK_INTERVAL_MS);

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
            const method = (args[1]?.method || (args[0] instanceof Request ? args[0].method : 'GET')).toUpperCase();
            let body: any = null;
            try { body = await response.clone().json(); } catch { /* not json */ }
            if (body && typeof body === 'object') body = { message: String(body.message || body.error_description || body.error || body.msg || '').slice(0, 300), code: body.code };
            this.logError({
              title: `HTTP ${response.status} Error`,
              description: `Request to ${url} failed with status ${response.status}`,
              error_type: 'network',
              severity: response.status >= 500 ? 'high' : 'medium',
              component: 'Network',
              metadata: { 
                url, 
                status: response.status,
                statusText: response.statusText,
                method,
                body
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
            metadata: { url, method: (args[1]?.method || 'GET').toUpperCase(), status: 0, body: { message: error.message } }
          });
        }
        
        throw error;
      }
    };

    console.log('Global error capture initialized');
  }
}

export const globalErrorCapture = new GlobalErrorCaptureService();
