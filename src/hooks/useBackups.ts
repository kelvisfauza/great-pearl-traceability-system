import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, addDoc, updateDoc } from 'firebase/firestore';

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
  date: any; // Firestore timestamp
  type: 'Full Backup' | 'Incremental' | 'Database Backup';
  size?: string; // e.g., "2.4 GB"
  status: BackupStatus;
  duration?: string; // e.g., "23 minutes"
}

export interface BackupSchedule {
  id: string;
  name: string;
  cron: string; // human-readable or CRON expr
  active: boolean;
}

export const useBackups = () => {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, 'backup_stats', 'summary'), (d) => {
      setStats((d.exists() ? (d.data() as any) : null));
      setLoading(false);
    });

    const unsubJobs = onSnapshot(
      query(collection(db, 'backup_jobs'), orderBy('date', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as BackupJob[];
        setJobs(list);
      }
    );

    const unsubSchedules = onSnapshot(collection(db, 'backup_schedules'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as BackupSchedule[];
      setSchedules(list);
    });

    return () => {
      unsubStats();
      unsubJobs();
      unsubSchedules();
    };
  }, []);

  const percentUsed = useMemo(() => {
    if (!stats || !stats.capacity_gb) return 0;
    return Math.round(((stats.storage_used_gb || 0) / stats.capacity_gb) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.storage_used_gb, stats?.capacity_gb]);

  const startJob = useCallback(async (type: BackupJob['type']) => {
    await addDoc(collection(db, 'backup_jobs'), {
      type,
      status: 'running',
      date: serverTimestamp(),
    });
  }, []);

  const startFullBackup = useCallback(async () => startJob('Full Backup'), [startJob]);
  const startIncremental = useCallback(async () => startJob('Incremental'), [startJob]);
  const restoreData = useCallback(async (jobId: string) => {
    // Mark a restore attempt in the job document
    await updateDoc(doc(db, 'backup_jobs', jobId), { status: 'running' as BackupStatus });
  }, []);

  const upsertStats = useCallback(async (payload: Partial<BackupStats>) => {
    await setDoc(doc(db, 'backup_stats', 'summary'), { ...payload, updated_at: serverTimestamp() }, { merge: true });
  }, []);

  const toggleSchedule = useCallback(async (id: string, active: boolean) => {
    await updateDoc(doc(db, 'backup_schedules', id), { active });
  }, []);

  return { stats, percentUsed, jobs, schedules, loading, startFullBackup, startIncremental, restoreData, upsertStats, toggleSchedule };
};
