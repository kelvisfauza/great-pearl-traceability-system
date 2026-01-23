import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

// Global flag to prevent multiple initializations
let isConsoleMonitorInitialized = false;
let originalConsole: {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
  info: typeof console.info;
  debug: typeof console.debug;
} | null = null;

export const useSupabaseConsoleMonitor = () => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee, user } = useAuth();
  const batchQueue = useRef<any[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Batch insert logs to reduce database calls
  const flushLogBatch = useCallback(async () => {
    if (batchQueue.current.length === 0) return;
    
    const logsToInsert = [...batchQueue.current];
    batchQueue.current = [];
    
    try {
      await supabase.from('system_console_logs').insert(logsToInsert);
    } catch (err) {
      // Silently fail to avoid infinite loops
    }
  }, []);

  const queueLog = useCallback((logData: any) => {
    batchQueue.current.push(logData);
    
    // Flush after 2 seconds or when batch reaches 10 items
    if (batchQueue.current.length >= 10) {
      if (batchTimeout.current) clearTimeout(batchTimeout.current);
      flushLogBatch();
    } else if (!batchTimeout.current) {
      batchTimeout.current = setTimeout(() => {
        flushLogBatch();
        batchTimeout.current = null;
      }, 2000);
    }
  }, [flushLogBatch]);

  const initializeConsoleCapture = useCallback(() => {
    if (isConsoleMonitorInitialized) {
      return;
    }

    isConsoleMonitorInitialized = true;
    
    // Store original console methods
    originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };

    const captureLog = (level: ConsoleLog['level'], args: any[]) => {
      // Don't capture our own logs or Supabase internal logs
      const message = args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');

      // Skip internal logs
      if (message.includes('[Supabase]') || 
          message.includes('system_console_logs') ||
          message.includes('system_errors')) {
        return;
      }

      const logData = {
        level,
        message: message.substring(0, 5000), // Limit message length
        source: 'browser',
        user_id: user?.id || employee?.id,
        user_name: employee?.name,
        user_department: employee?.department,
        url: window.location.href,
        user_agent: navigator.userAgent.substring(0, 500)
      };

      queueLog(logData);
    };

    // Override console methods
    console.log = (...args) => {
      originalConsole?.log(...args);
      captureLog('log', args);
    };

    console.warn = (...args) => {
      originalConsole?.warn(...args);
      captureLog('warn', args);
    };

    console.error = (...args) => {
      originalConsole?.error(...args);
      captureLog('error', args);
    };

    console.info = (...args) => {
      originalConsole?.info(...args);
      captureLog('info', args);
    };

    console.debug = (...args) => {
      originalConsole?.debug(...args);
      captureLog('debug', args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      const logData = {
        level: 'error' as const,
        message: `Unhandled Error: ${event.message}`,
        source: 'window.onerror',
        stack_trace: event.error?.stack,
        user_id: user?.id || employee?.id,
        user_name: employee?.name,
        user_department: employee?.department,
        url: window.location.href,
        user_agent: navigator.userAgent.substring(0, 500),
        metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno }
      };
      queueLog(logData);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const logData = {
        level: 'error' as const,
        message: `Unhandled Promise Rejection: ${event.reason}`,
        source: 'unhandledrejection',
        stack_trace: event.reason?.stack,
        user_id: user?.id || employee?.id,
        user_name: employee?.name,
        user_department: employee?.department,
        url: window.location.href,
        user_agent: navigator.userAgent.substring(0, 500)
      };
      queueLog(logData);
    });

  }, [user, employee, queueLog]);

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

      // Refresh logs
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
      .channel('console-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_console_logs' },
        (payload) => {
          setLogs(prev => [payload.new as ConsoleLog, ...prev.slice(0, 199)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Flush any remaining logs on unmount
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
        flushLogBatch();
      }
    };
  }, [fetchLogs, flushLogBatch]);

  return {
    logs,
    loading,
    fetchLogs,
    getLogStats,
    clearOldLogs,
    initializeConsoleCapture
  };
};
