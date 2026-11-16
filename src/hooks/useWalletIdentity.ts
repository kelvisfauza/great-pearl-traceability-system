import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useWalletIdentity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wallet-account-identity', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_wallet_account_identity');
      if (error) throw error;
      const identity = data?.[0];
      if (!identity) throw new Error('Wallet account number is unavailable');
      return identity;
    },
    staleTime: 300_000,
  });
}