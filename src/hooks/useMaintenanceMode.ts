import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceStatus {
  is_active: boolean;
  reason: string | null;
  activated_by: string | null;
  activated_at: string | null;
  recovery_key: string | null;
  recovery_pin: string | null;
}

export const useMaintenanceMode = () => {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_maintenance')
        .select('is_active, reason, activated_by, activated_at, recovery_key, recovery_pin')
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

  const toggleMaintenance = useCallback(async (activate: boolean, reason?: string, activatedBy?: string) => {
    const { data: record } = await supabase
      .from('system_maintenance')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!record) throw new Error('No maintenance record found');

    const recoveryCode = activate ? generateCode() : null;
    const recoveryPin = activate ? generatePin() : null;

    const { data, error } = await supabase
      .from('system_maintenance')
      .update({
        is_active: activate,
        reason: activate ? (reason || 'System maintenance in progress') : null,
        activated_by: activate ? (activatedBy || 'Admin') : null,
        activated_at: activate ? new Date().toISOString() : null,
        recovery_key: recoveryCode,
        recovery_pin: recoveryPin,
        recovery_sms_sent: false,
      } as any)
      .eq('id', (record as any).id)
      .select('recovery_key, recovery_pin')
      .single();

    if (error) {
      console.error('Error toggling maintenance:', error);
      throw error;
    }

    // Send SMS with recovery codes to Fauza2 when activating
    if (activate && recoveryCode && recoveryPin) {
      try {
        // Get Fauza2's phone number
        const { data: fauza } = await supabase
          .from('employees')
          .select('phone')
          .eq('email', 'fauzakusa@greatagrocoffee.com')
          .single();

        if (fauza?.phone) {
          const smsMessage = `MAINTENANCE MODE ACTIVATED. Recovery Code: ${recoveryCode}. PIN: ${recoveryPin}. Use these at the recovery page to restore the system.`;

          await supabase.functions.invoke('send-sms', {
            body: {
              phone: fauza.phone,
              message: smsMessage,
            },
          });

          // Mark SMS as sent
          await supabase
            .from('system_maintenance')
            .update({ recovery_sms_sent: true, recovery_phone: fauza.phone } as any)
            .eq('id', (record as any).id);
        }
      } catch (smsErr) {
        console.error('Failed to send recovery SMS:', smsErr);
        // Don't throw - maintenance is still activated
      }
    }

    await fetchStatus();
    return { code: recoveryCode, pin: recoveryPin };
  }, [fetchStatus]);

  const deactivateWithKey = useCallback(async (code: string, pin: string) => {
    const normalizedCode = code.trim();
    const normalizedPin = pin.trim();

    const { data: record } = await supabase
      .from('system_maintenance')
      .select('id, recovery_key, recovery_pin, is_active')
      .limit(1)
      .maybeSingle();

    const storedCode = ((record as any)?.recovery_key || '').trim();
    const storedPin = ((record as any)?.recovery_pin || '').trim();

    if (!record || storedCode !== normalizedCode || storedPin !== normalizedPin) {
      throw new Error('Invalid recovery code or PIN');
    }

    const { error } = await supabase
      .from('system_maintenance')
      .update({
        is_active: false,
        reason: null,
        activated_by: null,
        activated_at: null,
        recovery_key: null,
        recovery_pin: null,
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
    recoveryPin: status?.recovery_pin,
    loading,
    toggleMaintenance,
    deactivateWithKey,
    refetch: fetchStatus,
  };
};
