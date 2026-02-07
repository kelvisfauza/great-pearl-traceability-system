import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConsoleLog {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  source?: string;
  user_id?: string;
  user_name?: string;
  user_department?: string;
  url?: string;
  user_agent?: string;
  stack_trace?: string;
  metadata?: any;
  created_at: string;
}

// Global singleton to manage console capture and user context
class ConsoleCaptureSingleton {
  private static instance: ConsoleCaptureSingleton;
  private isInitialized = false;
  private userContext: { id?: string; name?: string; department?: string; email?: string } = {};
  private batchQueue: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
  } | null = null;

  private constructor() {}

  static getInstance(): ConsoleCaptureSingleton {
    if (!ConsoleCaptureSingleton.instance) {
      ConsoleCaptureSingleton.instance = new ConsoleCaptureSingleton();
    }
    return ConsoleCaptureSingleton.instance;
  }

  setUserContext(context: { id?: string; name?: string; department?: string; email?: string }) {
    this.userContext = context;
  }

  private async flushBatch() {
    if (this.batchQueue.length === 0) return;
    
    const logsToInsert = [...this.batchQueue];
    this.batchQueue = [];
    
    try {
      await supabase.from('system_console_logs').insert(logsToInsert);
    } catch (err) {
      // Silently fail to avoid infinite loops
    }
  }

  private queueLog(logData: any) {
    // Always use latest user context
    logData.user_id = this.userContext.id || logData.user_id;
    logData.user_name = this.userContext.name || logData.user_name;
    logData.user_department = this.userContext.department || logData.user_department;
    
    this.batchQueue.push(logData);
    
    // Flush after 3 seconds or when batch reaches 10 items
    if (this.batchQueue.length >= 10) {
      if (this.batchTimeout) clearTimeout(this.batchTimeout);
      this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
        this.batchTimeout = null;
      }, 3000);
    }
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };

    const captureLog = (level: ConsoleLog['level'], args: any[]) => {
      const message = args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');

      // Skip internal logs to prevent loops
      if (message.includes('[Supabase]') || 
          message.includes('system_console_logs') ||
          message.includes('system_errors') ||
          message.includes('postgres_changes')) {
        return;
      }

      const logData = {
        level,
        message: message.substring(0, 5000),
        source: 'browser',
        user_id: this.userContext.id,
        user_name: this.userContext.name,
        user_department: this.userContext.department,
        url: window.location.href,
        user_agent: navigator.userAgent.substring(0, 500)
      };

      this.queueLog(logData);
    };

    // Override console methods — only capture warn and error to prevent table bloat
    // log, info, and debug are too noisy and cause the system_console_logs table to grow unboundedly
    console.log = (...args) => {
      this.originalConsole?.log(...args);
      // NOT captured to database — too noisy
    };

    console.warn = (...args) => {
      this.originalConsole?.warn(...args);
      captureLog('warn', args);
    };

    console.error = (...args) => {
      this.originalConsole?.error(...args);
      captureLog('error', args);
    };

    console.info = (...args) => {
      this.originalConsole?.info(...args);
      // NOT captured to database — too noisy
    };

    console.debug = (...args) => {
      this.originalConsole?.debug(...args);
      // NOT captured to database — too noisy
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.queueLog({
        level: 'error',
        message: `Unhandled Error: ${event.message}`,
        source: 'window.onerror',
        stack_trace: event.error?.stack,
        url: window.location.href,
        user_agent: navigator.userAgent.substring(0, 500),
        metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno }
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.queueLog({
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        source: 'unhandledrejection',
        stack_trace: event.reason?.stack,
        url: window.location.href,
        user_agent: navigator.userAgent.substring(0, 500)
      });
    });
  }
}

// Export singleton for use in other components
export const consoleCapture = ConsoleCaptureSingleton.getInstance();

export const useSupabaseConsoleMonitor = () => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [loading, setLoading] = useState(true);

  const initializeConsoleCapture = useCallback(() => {
    consoleCapture.initialize();
  }, []);

  const setUserContext = useCallback((context: { id?: string; name?: string; department?: string; email?: string }) => {
    consoleCapture.setUserContext(context);
  }, []);

  const fetchLogs = useCallback(async (
    levelFilter?: string,
    userFilter?: string,
    departmentFilter?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 200
  ) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('system_console_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (levelFilter && levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }
      if (userFilter) {
        query = query.ilike('user_name', `%${userFilter}%`);
      }
      if (departmentFilter && departmentFilter !== 'all') {
        query = query.eq('user_department', departmentFilter);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setLogs((data || []) as ConsoleLog[]);
    } catch (err) {
      console.error('Failed to fetch console logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getLogStats = useCallback(() => {
    return {
      total: logs.length,
      errors: logs.filter(l => l.level === 'error').length,
      warnings: logs.filter(l => l.level === 'warn').length,
      info: logs.filter(l => l.level === 'info' || l.level === 'log').length,
      debug: logs.filter(l => l.level === 'debug').length,
      byDepartment: logs.reduce((acc, log) => {
        const dept = log.user_department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byUser: logs.reduce((acc, log) => {
        const name = log.user_name || 'Unknown';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentErrors: logs.filter(l => l.level === 'error').slice(0, 10)
    };
  }, [logs]);

  const clearOldLogs = useCallback(async (daysToKeep: number = 30) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await supabase
        .from('system_console_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      await fetchLogs();
      return true;
    } catch (err) {
      console.error('Failed to clear old logs:', err);
      return false;
    }
  }, [fetchLogs]);

  // Set up real-time subscription for logs
  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('console-logs-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'system_console_logs' 
        },
        (payload) => {
          setLogs(prev => [payload.new as ConsoleLog, ...prev.slice(0, 199)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  return {
    logs,
    loading,
    fetchLogs,
    getLogStats,
    clearOldLogs,
    initializeConsoleCapture,
    setUserContext
  };
};
