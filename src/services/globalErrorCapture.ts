import { supabase } from '@/integrations/supabase/client';

const RECIPIENTS = ['tatwanzire@greatpearlcoffee.com', 'fauzakusa@greatpearlcoffee.com'];
const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // suppress identical error for 10 min
const BATCH_FLUSH_MS = 30 * 1000;        // flush every 30s
const NETWORK_STORAGE_KEY = 'network_errors_pending_v1';
const NETWORK_LAST_SENT_KEY = 'network_errors_last_sent_date';
const NETWORK_DIGEST_HOUR = 17; // 5 PM local time
const NETWORK_CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 min

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
  private buffer: CapturedError[] = [];
  private dedupe = new Map<string, number>();
  private flushTimer: number | null = null;

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

      // Network errors: never send immediately — batch into daily 5 PM digest
      if (errorData.error_type === 'network') {
        this.persistNetworkError({ ...errorData, ts: now });
        return;
      }

      this.buffer.push({ ...errorData, ts: now });
      this.scheduleFlush();
    } catch {
      // never throw from error capture
    }
  }

  private persistNetworkError(e: CapturedError) {
    try {
      const raw = localStorage.getItem(NETWORK_STORAGE_KEY);
      const list: CapturedError[] = raw ? JSON.parse(raw) : [];
      list.push(e);
      // cap at 500 to avoid runaway storage
      const trimmed = list.slice(-500);
      localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // storage full / unavailable — drop silently
    }
  }

  private async flushNetworkDigestIfDue() {
    try {
      const now = new Date();
      if (now.getHours() < NETWORK_DIGEST_HOUR) return;
      const todayKey = now.toISOString().slice(0, 10);
      if (localStorage.getItem(NETWORK_LAST_SENT_KEY) === todayKey) return;

      const raw = localStorage.getItem(NETWORK_STORAGE_KEY);
      const list: CapturedError[] = raw ? JSON.parse(raw) : [];
      // Mark as sent for today even if list is empty, so we don't keep checking
      localStorage.setItem(NETWORK_LAST_SENT_KEY, todayKey);
      if (list.length === 0) return;

      // Clear pending before sending so we don't double-send on retry
      localStorage.removeItem(NETWORK_STORAGE_KEY);

      const lines: string[] = [];
      lines.push(`Daily Network Issues Digest — ${list.length} event(s) captured today.`);
      lines.push(`User: ${this.userContext.name || ''} (${this.userContext.email || 'n/a'}) — Dept: ${this.userContext.department || 'n/a'}`);
      lines.push('');
      list.forEach((e, i) => {
        lines.push(`${i + 1}. ${e.title}`);
        lines.push(`   ${e.description || 'n/a'}`);
        if (e.metadata?.url) lines.push(`   URL: ${e.metadata.url}`);
        lines.push(`   Time: ${new Date(e.ts).toLocaleString()}`);
        lines.push('');
      });

      const subject = `[Network Digest] ${list.length} network event(s) — ${todayKey}`;
      const idem = `network-digest-${todayKey}-${this.userContext.email || 'anon'}`;

      for (const recipient of RECIPIENTS) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'general-notification',
              recipientEmail: recipient,
              idempotencyKey: `${idem}-${recipient}`,
              templateData: {
                title: `Daily Network Digest — ${list.length} events`,
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

  private scheduleFlush() {
    if (this.flushTimer != null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, BATCH_FLUSH_MS);
  }

  private async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const top = batch.reduce((acc, e) => (sevRank[e.severity] || 0) > (sevRank[acc.severity] || 0) ? e : acc, batch[0]);
    const lines: string[] = [];
    lines.push(`Captured ${batch.length} client error(s) from ${this.userContext.email || 'unknown user'}.`);
    lines.push(`URL: ${window.location.href}`);
    lines.push('');
    batch.forEach((e, i) => {
      lines.push(`${i + 1}. [${e.severity.toUpperCase()}] ${e.title}`);
      lines.push(`   Description: ${e.description || 'n/a'}`);
      lines.push(`   Type: ${e.error_type} | Component: ${e.component}`);
      if (e.stack_trace) lines.push(`   Stack: ${String(e.stack_trace).split('\n').slice(0, 3).join(' | ')}`);
      lines.push(`   Time: ${new Date(e.ts).toLocaleString()}`);
      lines.push('');
    });
    lines.push(`User: ${this.userContext.name || ''} (${this.userContext.email || 'n/a'}) — Dept: ${this.userContext.department || 'n/a'}`);
    lines.push(`Agent: ${navigator.userAgent}`);

    const subject = `[Client Error] ${batch.length} error(s) — ${top.severity.toUpperCase()}: ${top.title}`;
    const idem = `client-err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    for (const recipient of RECIPIENTS) {
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: recipient,
            idempotencyKey: `${idem}-${recipient}`,
            templateData: {
              title: `Client Error Report — ${batch.length} new`,
              subject,
              message: lines.join('\n'),
              recipientName: recipient.split('@')[0],
            },
          },
        });
      } catch {
        // swallow — never propagate
      }
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

    // Flush remaining errors on unload
    window.addEventListener('beforeunload', () => { void this.flush(); });

    // Schedule the daily 5 PM network digest check
    void this.flushNetworkDigestIfDue();
    window.setInterval(() => { void this.flushNetworkDigestIfDue(); }, NETWORK_CHECK_INTERVAL_MS);

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
