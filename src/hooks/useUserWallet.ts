import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WalletData {
  balance: number;
  pendingWithdrawals: number;
  availableToRequest: number;
  employeeName: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  phone_number: string;
  status: string;
  request_ref?: string;
  channel?: string;
  created_at: string;
}

const PENDING_WITHDRAWAL_STATUSES = [
  'pending_approval',
  'pending_admin_2',
  'pending_admin_3',
  'pending_finance',
];

export const useUserWallet = () => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [unifiedUserId, setUnifiedUserId] = useState<string | null>(null);
  const { user, employee } = useAuth();
  const { toast } = useToast();

  const fetchWalletData = async () => {
    const walletOwnerEmail = employee?.email || user?.email;

    if (!walletOwnerEmail) {
      setLoading(false);
      return;
    }

    try {
      console.log('💰 Fetching wallet data for:', walletOwnerEmail, '(auth email:', user?.email, ')');

      // Get balance data using the safe function
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_user_balance_safe', { user_email: walletOwnerEmail });
      
      if (balanceError) {
        throw balanceError;
      }
      
      const userData = balanceData?.[0];
      if (userData) {
        const wallet: WalletData = {
          balance: Number(userData.wallet_balance) || 0,
          pendingWithdrawals: Number(userData.pending_withdrawals) || 0,
          availableToRequest: Number(userData.available_balance) || 0,
          employeeName: userData.name || employee.name || 'Unknown'
        };

        setWalletData(wallet);
        console.log('✅ Wallet loaded:', { balance: wallet.balance });
      } else {
        setWalletData({
          balance: 0,
          pendingWithdrawals: 0,
          availableToRequest: 0,
          employeeName: employee.name || 'Unknown'
        });
        console.log('⚠️ No wallet data found, using defaults');
      }
      
      // Get unified user ID for withdrawal requests and realtime matching
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: walletOwnerEmail });
      
      const unifiedId = userIdData || user?.id;
      setUnifiedUserId(unifiedId || null);

      if (!unifiedId) {
        setWithdrawalRequests([]);
        return;
      }
      
      // Fetch withdrawal requests
      const { data: withdrawalRequestsData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', unifiedId)
        .order('created_at', { ascending: false });

      const allWithdrawals = withdrawalRequestsData || [];
      setWithdrawalRequests(allWithdrawals);

      const frozenPending = allWithdrawals
        .filter((withdrawal) => PENDING_WITHDRAWAL_STATUSES.includes((withdrawal.status || '').toLowerCase()))
        .reduce((sum, withdrawal) => sum + (Number(withdrawal.amount) || 0), 0);

      setWalletData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          pendingWithdrawals: frozenPending,
          availableToRequest: Math.max(0, prev.balance - frozenPending),
        };
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching wallet data:', error);
      
      // Provide default wallet data even on error
      setWalletData({
        balance: 0,
        pendingWithdrawals: 0,
        availableToRequest: 0,
        employeeName: employee?.name || 'Unknown'
      });
    } finally {
      setLoading(false);
    }
  };

  const createWithdrawalRequest = async (amount: number, phoneNumber: string, channel: string = 'ZENGAPAY') => {
    const walletOwnerEmail = employee?.email || user?.email;

    if (!walletOwnerEmail || !walletData) return;

    if (amount > walletData.availableToRequest) {
      toast({
        title: "Insufficient Available Balance",
        description: `You can only request UGX ${walletData.availableToRequest.toLocaleString()}. This prevents double-spending while you have pending withdrawals.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Get unified user ID for withdrawal requests
      const { data: userIdData, error: userIdError } = await supabase
        .rpc('get_unified_user_id', { input_email: walletOwnerEmail });
      
      if (userIdError) {
        throw new Error('Error getting user ID');
      }
      
      const unifiedUserId = userIdData || user?.id;
      if (!unifiedUserId) {
        throw new Error('No unified user ID found');
      }
      
      // Generate request reference
      const requestRef = `WR-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
      
      // Auto-complete: insert as 'completed' immediately
      const { error } = await supabase
        .from('withdrawal_requests' as any)
        .insert([{
          user_id: unifiedUserId,
          amount,
          phone_number: phoneNumber,
          payment_channel: channel,
          request_ref: requestRef,
          printed_at: new Date().toISOString(),
          status: 'completed',
          processed_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      // Deduct from ledger immediately
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert([{
          user_id: unifiedUserId,
          entry_type: 'WITHDRAWAL',
          amount: -amount,
          reference: `WITHDRAWAL-${requestRef}`,
          metadata: {
            withdrawal_ref: requestRef,
            phone_number: phoneNumber,
            channel: channel
          }
        }]);
      
      if (ledgerError) {
        console.error('Ledger deduction error:', ledgerError);
      }

      toast({
        title: "Withdrawal Completed!",
        description: `Reference: ${requestRef}. Amount UGX ${amount.toLocaleString()} has been deducted from your loyalty balance.`,
        duration: 8000,
      });

      // Refresh wallet data after a short delay to let DB settle
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchWalletData();
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchWalletData();
    } else {
      setLoading(false);
    }
  }, [user, employee]);

  // Passive refresh to avoid stale wallet values when realtime misses events
  useEffect(() => {
    if (!user?.id) return;

    const onFocus = () => fetchWalletData();
    const intervalId = window.setInterval(() => fetchWalletData(), 30000);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user?.id, user?.email]);

  // Real-time subscription for balance changes
  useEffect(() => {
    const trackedUserId = unifiedUserId || user?.id;
    if (!trackedUserId) return;

    const channel = supabase
      .channel('wallet-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ledger_entries',
        filter: `user_id=eq.${trackedUserId}`,
      }, () => {
        console.log('📡 Ledger entry changed, refreshing wallet...');
        fetchWalletData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'withdrawal_requests',
        filter: `user_id=eq.${trackedUserId}`,
      }, () => {
        console.log('📡 Withdrawal request changed, refreshing wallet...');
        fetchWalletData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, unifiedUserId]);

  return {
    walletData,
    withdrawalRequests,
    loading,
    createWithdrawalRequest,
    refreshWallet: fetchWalletData
  };
};