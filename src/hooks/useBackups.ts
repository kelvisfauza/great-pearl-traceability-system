import { useCallback, useMemo, useState } from 'react';

export type BackupStatus = 'completed' | 'failed' | 'running' | 'queued';

export interface BackupStats {
  storage_used_gb: number;
  capacity_gb: number;
  last_backup_status?: BackupStatus;
  last_backup_time?: any;
  next_backup_time?: any;
}

export interface BackupJob {
  id: string;
  date: any;
  type: 'Full Backup' | 'Incremental' | 'Database Backup';
  size?: string;
  status: BackupStatus;
  duration?: string;
}

export interface BackupSchedule {
  id: string;
  name: string;
  cron: string;
  active: boolean;
}

export const useBackups = () => {
  // Backup functionality disabled - Firebase has been migrated to Supabase
  const [stats, setStats] = useState<BackupStats | null>({
    storage_used_gb: 0,
    capacity_gb: 100,
    last_backup_status: 'completed'
  });
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const percentUsed = useMemo(() => {
    if (!stats || !stats.capacity_gb) return 0;
    return Math.round(((stats.storage_used_gb || 0) / stats.capacity_gb) * 100);
  }, [stats?.storage_used_gb, stats?.capacity_gb]);

  const startJob = useCallback(async (type: BackupJob['type']) => {
    console.log('Backup functionality disabled (Firebase migration):', type);
  }, []);

  const startFullBackup = useCallback(async () => startJob('Full Backup'), [startJob]);
  const startIncremental = useCallback(async () => startJob('Incremental'), [startJob]);
  
  const restoreData = useCallback(async (jobId: string) => {
    console.log('Restore functionality disabled (Firebase migration):', jobId);
  }, []);

  const upsertStats = useCallback(async (payload: Partial<BackupStats>) => {
    console.log('Backup stats update disabled (Firebase migration):', payload);
  }, []);

  const toggleSchedule = useCallback(async (id: string, active: boolean) => {
    console.log('Schedule toggle disabled (Firebase migration):', id, active);
  }, []);

  return { 
    stats, 
    percentUsed, 
    jobs, 
    schedules, 
    loading, 
    startFullBackup, 
    startIncremental, 
    restoreData, 
    upsertStats, 
    toggleSchedule 
  };
};
