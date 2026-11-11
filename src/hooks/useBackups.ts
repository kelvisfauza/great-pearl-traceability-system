import { useCallback, useEffect, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface BackupJob { id: number; inserted_at: string; status: string; physical: boolean }
export interface BackupProtection {
  checked_at: string; backups: BackupJob[]; pitr_enabled: boolean; can_restore: boolean;
  schedule: { schedule_for: string } | null; schedule_error: string | null;
  recovery_point: { name: string; status: string; completed_on: string | null } | null; recovery_point_error: string | null;
}
async function invoke(body: object) {
  const { data, error } = await supabase.functions.invoke('backup-management', { body });
  if (error) {
    let message = 'Backup service could not be reached. Try refreshing.';
    if (error instanceof FunctionsHttpError) {
      try { const response = await error.context.json(); if (response.error) message = response.error; } catch { /* Do not display raw HTML. */ }
    }
    throw new Error(message);
  }
  if (!data?.ok) throw new Error(data?.error || 'Backup request was not completed');
  return data;
}
export const useBackups = () => {
  const [protection, setProtection] = useState<BackupProtection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(null);
    try { setProtection(await invoke({ action: 'status' })); } catch (e) { setError(e instanceof Error ? e.message : 'Backup check failed'); }
    finally { busy.current = false; setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 60000); return () => window.clearInterval(timer); }, [refresh]);
  const restore = useCallback(async (backup: BackupJob, confirmation: string) => invoke({ action: 'restore', id: backup.id, confirmation, acknowledge: true }), []);
  return { protection, loading, error, refresh, restore };
};
