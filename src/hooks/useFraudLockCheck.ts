import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';

export const useFraudLockCheck = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const employee = authContext?.employee;
  const [lockData, setLockData] = useState<{ id: string; user_name: string } | null>(null);
  const [checked, setChecked] = useState(false);

  const checkLock = useCallback(async () => {
    if (!user?.id) {
      setChecked(true);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_fraud_locks')
        .select('id, user_name')
        .eq('user_id', user.id)
        .eq('is_locked', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLockData({ id: data.id, user_name: data.user_name || employee?.name || '' });
      } else {
        setLockData(null);
      }
    } catch (err) {
      console.error('Error checking fraud lock:', err);
    } finally {
      setChecked(true);
    }
  }, [user?.id, employee?.name]);

  useEffect(() => {
    checkLock();

    if (!user?.id) return;

    const interval = window.setInterval(() => {
      checkLock();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [checkLock, user?.id]);

  const clearLock = useCallback(() => {
    setLockData(null);
  }, []);

  const triggerLock = useCallback(() => {
    // Re-check from DB to get the latest lock
    checkLock();
  }, [checkLock]);

  return { lockData, checked, clearLock, triggerLock };
};
