import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const todayKey = () => {
  const d = new Date();
  return `balance_revealed_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

type Status = { checks_today: number; fees_today: number; next_fee: number; daily_cap: number };

/**
 * The wallet balance stays hidden until the user asks to see it.
 * The first look each day is free; each extra look costs UGX 200,
 * capped at UGX 1,000 of charges per day.
 */
export const useBalanceReveal = () => {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState(() => sessionStorage.getItem(todayKey()) === 'true');
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const { data } = await supabase.rpc('balance_check_status' as never);
    if (data) setStatus(data as unknown as Status);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const reveal = useCallback(async () => {
    if (revealed || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('charge_balance_check' as never);
    setBusy(false);
    if (error) {
      toast({ title: 'Could not show your balance', description: error.message, variant: 'destructive' });
      return;
    }
    const res = data as unknown as { fee: number; checks_today: number; fees_today: number; cap_reached: boolean };
    sessionStorage.setItem(todayKey(), 'true');
    setRevealed(true);
    await loadStatus();
    if (res?.fee > 0) {
      toast({
        title: `UGX ${Number(res.fee).toLocaleString()} charged`,
        description: `Balance check ${res.checks_today} today. UGX ${Number(res.fees_today).toLocaleString()} of your UGX 1,000 daily limit used.`,
      });
    } else if (res?.cap_reached) {
      toast({ title: 'Balance shown', description: 'You have reached today\u2019s UGX 1,000 charge limit \u2014 further checks today are free.' });
    } else {
      toast({ title: 'Balance shown', description: 'This was your free check for today. Each extra check costs UGX 200.' });
    }
  }, [revealed, busy, toast, loadStatus]);

  const hide = useCallback(() => {
    sessionStorage.removeItem(todayKey());
    setRevealed(false);
  }, []);

  return { revealed, reveal, hide, busy, status };
};

export default useBalanceReveal;
