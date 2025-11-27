import { useState } from 'react';

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

  // System console monitoring disabled - Firebase has been migrated to Supabase
  const initializeConsoleCapture = () => {
    console.log('Console monitoring disabled (Firebase migration)');
  };

  const fetchLogs = async (
    levelFilter?: string,
    userFilter?: string,
    departmentFilter?: string,
    startDate?: string,
    endDate?: string
  ) => {
    console.log('Console log fetching disabled (Firebase migration)');
    setLogs([]);
    setLoading(false);
  };

  const getLogStats = () => {
    return {
      totalLogs: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      total: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      debug: 0,
      byDepartment: {},
      byUser: {},
      recentErrors: []
    };
  };

  const clearOldLogs = async (daysToKeep: number = 30) => {
    console.log('Console log clearing disabled (Firebase migration)');
  };

  return {
    logs,
    loading,
    fetchLogs,
    getLogStats,
    clearOldLogs,
    initializeConsoleCapture
  };
};
