import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorReporting } from '@/hooks/useErrorReporting';

export interface ConsoleLog {
  id: string;
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  source: string;
  userId?: string;
  userName?: string;
  userDepartment?: string;
  url: string;
  userAgent: string;
  stackTrace?: string;
  metadata?: any;
}

export const useSystemConsoleMonitor = () => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { employee } = useAuth();
  
  // Get error reporting system to create system errors from console errors
  let reportError: any = null;
  try {
    const errorReporting = useErrorReporting();
    reportError = errorReporting.reportError;
  } catch (error) {
    console.log('Error reporting not available');
  }

  // Original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  const captureLogs = useCallback(async (level: string, args: any[]) => {
    try {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // Don't log our own logging operations to prevent infinite loops
      if (message.includes('system_console_logs') || 
          message.includes('Console captured') ||
          message.includes('system_errors') ||
          message.includes('Error reporting not available')) {
        return;
      }

      const logEntry: Omit<ConsoleLog, 'id'> = {
        timestamp: new Date().toISOString(),
        level: level as any,
        message,
        source: 'browser-console',
        userId: employee?.id,
        userName: employee?.name,
        userDepartment: employee?.department,
        url: window.location.href,
        userAgent: navigator.userAgent,
        stackTrace: level === 'error' ? new Error().stack : undefined
      };

      // Store in Firebase for IT monitoring
      await addDoc(collection(db, 'system_console_logs'), logEntry);
      
      // If this is an error, also create a system error report
      if (level === 'error' && reportError) {
        try {
          await reportError(
            'Console Error Detected',
            message,
            'system',
            `${employee?.department || 'Unknown'} - Console`,
            logEntry.stackTrace,
            employee?.id
          );
        } catch (errorReportingError) {
          // Silently fail to avoid infinite loops
          originalConsole.error('Failed to create system error report:', errorReportingError);
        }
      }
    } catch (error) {
      // Silently fail to avoid console spam
      originalConsole.error('Failed to capture console log:', error);
    }
  }, [employee, reportError]);

  const initializeConsoleCapture = useCallback(() => {
    // Override console methods to capture all logs
    console.log = (...args) => {
      originalConsole.log(...args);
      captureLogs('log', args);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      captureLogs('warn', args);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      captureLogs('error', args);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      captureLogs('info', args);
    };

    console.debug = (...args) => {
      originalConsole.debug(...args);
      captureLogs('debug', args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      const errorMessage = `Unhandled Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      captureLogs('error', [errorMessage, event.error]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorMessage = `Unhandled Promise Rejection: ${event.reason}`;
      captureLogs('error', [errorMessage]);
    });
  }, [captureLogs]);

  const fetchLogs = async (filters?: {
    level?: string;
    userId?: string;
    department?: string;
    timeRange?: number; // hours
    limit?: number;
  }) => {
    try {
      setLoading(true);
      let logsQuery = query(
        collection(db, 'system_console_logs'),
        orderBy('timestamp', 'desc')
      );

      if (filters?.limit) {
        logsQuery = query(logsQuery, limit(filters.limit));
      } else {
        logsQuery = query(logsQuery, limit(1000)); // Default limit
      }

      const snapshot = await getDocs(logsQuery);
      let logsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConsoleLog[];

      // Apply client-side filters
      if (filters) {
        if (filters.level) {
          logsList = logsList.filter(log => log.level === filters.level);
        }
        if (filters.userId) {
          logsList = logsList.filter(log => log.userId === filters.userId);
        }
        if (filters.department) {
          logsList = logsList.filter(log => log.userDepartment === filters.department);
        }
        if (filters.timeRange) {
          const cutoffTime = new Date(Date.now() - filters.timeRange * 60 * 60 * 1000);
          logsList = logsList.filter(log => new Date(log.timestamp) >= cutoffTime);
        }
      }

      setLogs(logsList);
    } catch (error) {
      originalConsole.error('Failed to fetch console logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLogStats = () => {
    const stats = {
      total: logs.length,
      errors: logs.filter(log => log.level === 'error').length,
      warnings: logs.filter(log => log.level === 'warn').length,
      info: logs.filter(log => log.level === 'info').length,
      debug: logs.filter(log => log.level === 'debug').length,
      byDepartment: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      recentErrors: logs.filter(log => 
        log.level === 'error' && 
        new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length
    };

    logs.forEach(log => {
      if (log.userDepartment) {
        stats.byDepartment[log.userDepartment] = (stats.byDepartment[log.userDepartment] || 0) + 1;
      }
      if (log.userName) {
        stats.byUser[log.userName] = (stats.byUser[log.userName] || 0) + 1;
      }
    });

    return stats;
  };

  const clearOldLogs = async (daysOld: number = 7) => {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const oldLogsQuery = query(
        collection(db, 'system_console_logs'),
        where('timestamp', '<', cutoffDate.toISOString())
      );
      
      const snapshot = await getDocs(oldLogsQuery);
      const batch = snapshot.docs.slice(0, 500); // Firebase batch limit
      
      // Use deleteDoc from Firebase v9
      const { deleteDoc } = await import('firebase/firestore');
      for (const docSnapshot of batch) {
        await deleteDoc(docSnapshot.ref);
      }
      
      originalConsole.log(`Cleared ${batch.length} old console logs`);
    } catch (error) {
      originalConsole.error('Failed to clear old logs:', error);
    }
  };

  // Initialize console capture on mount
  useEffect(() => {
    initializeConsoleCapture();
    
    // Cleanup function to restore original console methods
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    };
  }, [initializeConsoleCapture]);

  return {
    logs,
    loading,
    fetchLogs,
    getLogStats,
    clearOldLogs,
    initializeConsoleCapture
  };
};