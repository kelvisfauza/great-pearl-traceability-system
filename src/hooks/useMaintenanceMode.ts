import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceStatus {
  is_active: boolean;
  reason: string | null;
  activated_by: string | null;
  activated_at: string | null;
  recovery_key: string | null;
}

export const useMaintenanceMode = () => {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_maintenance')
        .select('is_active, reason, activated_by, activated_at, recovery_key')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching maintenance status:', error);
        return;
      }

      setStatus(data as MaintenanceStatus);
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleMaintenance = useCallback(async (activate: boolean, reason?: string, activatedBy?: string) => {
    // First get the record id
    const { data: record } = await supabase
      .from('system_maintenance')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!record) throw new Error('No maintenance record found');

    const { data, error } = await supabase
      .from('system_maintenance')
      .update({
        is_active: activate,
        reason: activate ? (reason || 'System maintenance in progress') : null,
        activated_by: activate ? (activatedBy || 'Admin') : null,
        activated_at: activate ? new Date().toISOString() : null,
      } as any)
      .eq('id', (record as any).id)
      .select('recovery_key')
      .single();

    if (error) {
      console.error('Error toggling maintenance:', error);
      throw error;
    }

    await fetchStatus();
    return data?.recovery_key;
  }, [fetchStatus]);

  const deactivateWithKey = useCallback(async (key: string) => {
    const normalizedInput = key.trim().toLowerCase();

    // Verify recovery key
    const { data: record } = await supabase
      .from('system_maintenance')
      .select('id, recovery_key, is_active')
      .limit(1)
      .maybeSingle();

    const storedKey = ((record as any)?.recovery_key || '').trim().toLowerCase();
    if (!record || !storedKey || storedKey !== normalizedInput) {
      throw new Error('Invalid recovery key');
    }

    const { error } = await supabase
      .from('system_maintenance')
      .update({
        is_active: false,
        reason: null,
        activated_by: null,
        activated_at: null,
      } as any)
      .eq('id', (record as any).id);

    if (error) throw error;
    await fetchStatus();
  }, [fetchStatus]);

  return {
    isActive: status?.is_active ?? false,
    reason: status?.reason,
    activatedBy: status?.activated_by,
    activatedAt: status?.activated_at,
    recoveryKey: status?.recovery_key,
    loading,
    toggleMaintenance,
    deactivateWithKey,
    refetch: fetchStatus,
  };
};
