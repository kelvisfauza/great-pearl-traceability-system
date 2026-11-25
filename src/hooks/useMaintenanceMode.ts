import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceStatus {
  is_active: boolean;
  reason: string | null;
  activated_by: string | null;
  activated_at: string | null;
  recovery_key: string | null;
  recovery_pin: string | null;
  expected_back_online: string | null;
  scheduled_active?: boolean;
  scheduled_reason?: string | null;
  scheduled_back_online?: string | null;
}

export const useMaintenanceMode = () => {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      // Use safe RPC for unauthenticated polling — only returns is_active + reason
      const { data, error } = await supabase.rpc('get_maintenance_status').maybeSingle();

      if (error) {
        console.error('Error fetching maintenance status:', error);
        return;
      }

      const d: any = data;
      setStatus(d ? ({
        ...d,
        activated_by: null,
        activated_at: null,
        recovery_key: null,
        recovery_pin: null,
        expected_back_online: d.expected_back_online ?? null,
        scheduled_active: d.scheduled_active ?? false,
        scheduled_reason: d.scheduled_reason ?? null,
        scheduled_back_online: d.scheduled_back_online ?? null,
      }) as MaintenanceStatus : null);
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const generateCode = () => {
    // Generate 10-digit numeric code
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  };

  const generatePin = () => {
    // Generate 4-digit numeric PIN
    let pin = '';
    for (let i = 0; i < 4; i++) {
      pin += Math.floor(Math.random() * 10).toString();
    }
    return pin;
  };

  const toggleMaintenance = useCallback(async (activate: boolean, reason?: string, activatedBy?: string, expectedBackOnline?: string | null) => {
    const recoveryCode = activate ? generateCode() : null;
    const recoveryPin = activate ? generatePin() : null;

    // Go through the guarded server-side switch so any active admin can toggle,
    // even if their account is missing an entry in the user_roles list.
    const { data, error } = await supabase.rpc('set_maintenance_mode' as any, {
      p_activate: activate,
      p_reason: activate ? (reason || 'System maintenance in progress') : null,
      p_activated_by: activate ? (activatedBy || 'Admin') : null,
      p_expected_back_online: activate ? (expectedBackOnline || null) : null,
      p_recovery_key: recoveryCode,
      p_recovery_pin: recoveryPin,
    });

    if (error) {
      console.error('Error toggling maintenance:', error);
      throw error;
    }

    let smsSent = false;
    // Confirm provider acceptance before recording a recovery SMS as sent.
    if (activate && recoveryCode && recoveryPin) {
      try {
        const { data: fauza } = await supabase
          .from('employees')
          .select('phone')
          .eq('email', 'fauzakusa@greatpearlcoffee.com')
          .maybeSingle();

        if (fauza?.phone) {
          const smsMessage = `MAINTENANCE MODE ACTIVATED. Recovery Code: ${recoveryCode}. PIN: ${recoveryPin}. Use these at the recovery page to restore the system.`;

          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: fauza.phone,
              messageType: 'maintenance_recovery',
              message: smsMessage,
            },
          });

          if (smsError || smsResult?.success !== true) {
            throw new Error('Recovery SMS was not confirmed.');
          }
          smsSent = true;

          // Mark SMS as sent through the guarded server-side function
          await supabase.rpc('mark_maintenance_recovery_sms' as any, {
            p_id: (data as any)?.id,
            p_phone: fauza.phone,
          });
        }
      } catch (smsErr) {
        console.error('Failed to send recovery SMS:', smsErr);
        // Don't throw - maintenance is still activated
      }
    }

    await fetchStatus();
    return { code: recoveryCode, pin: recoveryPin, smsSent };
  }, [fetchStatus]);

  const deactivateWithKey = useCallback(async (code: string, pin: string) => {
    const { data, error } = await supabase
      .rpc('verify_and_deactivate_maintenance' as any, { _code: code, _pin: pin });
    if (error || !data) {
      throw new Error('Invalid recovery code or PIN');
    }
    const { data: current, error: statusError } = await supabase.rpc('get_maintenance_status').maybeSingle();
    if (statusError || !current) throw new Error('Recovery was processed, but the current system status could not be confirmed.');
    if (current.is_active || current.scheduled_active) throw new Error('Manual recovery was processed, but maintenance is still active. Scheduled downtime ends automatically.');
    await fetchStatus();
  }, [fetchStatus]);

  return {
    isActive: (status?.is_active ?? false) || (status?.scheduled_active ?? false),
    isManualActive: status?.is_active ?? false,
    isScheduledActive: status?.scheduled_active ?? false,
    reason: status?.is_active ? status?.reason : (status?.scheduled_active ? (status?.scheduled_reason ?? null) : status?.reason),
    expectedBackOnline: status?.is_active
      ? (status?.expected_back_online ?? null)
      : (status?.scheduled_active ? (status?.scheduled_back_online ?? null) : null),
    activatedBy: status?.activated_by,
    activatedAt: status?.activated_at,
    recoveryKey: status?.recovery_key,
    recoveryPin: status?.recovery_pin,
    loading,
    toggleMaintenance,
    deactivateWithKey,
    refetch: fetchStatus,
  };
};
