import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAlerts } from './useSecurityAlerts';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  reason: string;
  performed_by: string;
  created_at: string;
}

export const useRealTimeSecurityData = () => {
  const { alerts: firebaseAlerts, openAlerts, loading: firebaseLoading } = useSecurityAlerts();

  // Fetch recent security-related audit logs from Supabase
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['security-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .or('action.eq.failed_login,action.eq.unauthorized_access,action.eq.permission_violation,table_name.eq.security_events')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AuditLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch authentication events from Supabase (using analytics if available)
  const { data: authEvents, isLoading: authLoading } = useQuery({
    queryKey: ['auth-events'],
    queryFn: async () => {
      // This would ideally query Supabase auth logs
      // For now, we'll return empty array as direct auth log access is limited
      return [];
    },
  });

  // Calculate security metrics
  const metrics = {
    totalAlerts: openAlerts.length,
    highSeverityAlerts: firebaseAlerts.filter(a => a.severity === 'high' && (a.status === 'open' || a.status === 'investigating')).length,
    mediumSeverityAlerts: firebaseAlerts.filter(a => a.severity === 'medium' && (a.status === 'open' || a.status === 'investigating')).length,
    recentAuditEvents: auditLogs?.length || 0,
    failedLoginAttempts: firebaseAlerts.filter(a => a.type.includes('Login')).length,
    unauthorizedAccess: firebaseAlerts.filter(a => a.type.includes('Unauthorized')).length,
  };

  // Combine all security events
  const allSecurityEvents = [
    ...firebaseAlerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      details: alert.details,
      timestamp: alert.created_at,
      status: alert.status,
      source: 'firebase' as const,
    })),
    ...(auditLogs || []).map(log => ({
      id: log.id,
      type: log.action,
      severity: log.action.includes('unauthorized') || log.action.includes('violation') ? 'high' : 'medium' as const,
      details: log.reason,
      timestamp: log.created_at,
      status: 'logged' as const,
      source: 'supabase' as const,
      performedBy: log.performed_by,
    })),
  ].sort((a, b) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  return {
    metrics,
    alerts: firebaseAlerts,
    openAlerts,
    auditLogs: auditLogs || [],
    allSecurityEvents,
    loading: firebaseLoading || auditLoading || authLoading,
  };
};
