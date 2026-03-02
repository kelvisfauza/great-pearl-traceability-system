import { useEffect, useState, useMemo, useCallback } from 'react';

export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertStatus = 'open' | 'investigating' | 'dismissed' | 'resolved';

export interface SecurityAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  count: number;
  details: string;
  created_at?: any;
  updated_at?: any;
  status: AlertStatus;
}

export const useSecurityAlerts = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const markStatus = useCallback(async (id: string, status: AlertStatus) => {
    console.warn('Security alerts: Firebase migrated to Supabase');
  }, []);

  const dismiss = useCallback((id: string) => markStatus(id, 'dismissed'), [markStatus]);
  const investigate = useCallback((id: string) => markStatus(id, 'investigating'), [markStatus]);
  const resolve = useCallback((id: string) => markStatus(id, 'resolved'), [markStatus]);
  const addSample = useCallback(async () => {
    console.warn('Security alerts: Firebase migrated to Supabase');
  }, []);

  const openAlerts = useMemo(() => alerts.filter(a => a.status === 'open' || a.status === 'investigating'), [alerts]);

  return { alerts, openAlerts, loading, dismiss, investigate, resolve, addSample };
};
