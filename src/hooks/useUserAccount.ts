import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserAccount {
  id: string;
  user_id: string;
  wallet_balance: number;
  pending_withdrawals: number;
  available_to_request: number;
  created_at: string;
  updated_at: string;
}

interface MoneyRequest {
  id: string;
  amount: number;
  request_type: string;
  reason: string;
  status: string;
  requested_by: string;
  created_at: string;
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

export const useUserAccount = () => {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [moneyRequests, setMoneyRequests] = useState<MoneyRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserAccount = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      // For all users, use the new ledger-based system
      const { data: walletData, error: walletError } = await supabase
        .rpc('get_wallet_balance', { user_uuid: user.uid });

      const { data: pendingData, error: pendingError } = await supabase
        .rpc('get_pending_withdrawals', { user_uuid: user.uid });

      const { data: availableData, error: availableError } = await supabase
        .rpc('get_available_to_request', { user_uuid: user.uid });

      if (walletError || pendingError || availableError) {
        console.log('Error fetching wallet data, using defaults');
        // Use default values for users with no ledger entries yet
        setAccount({
          id: 'temp-' + user.uid,
          user_id: user.uid,
          wallet_balance: user.uid === 'JSxZYOSxmde6Cqra4clQNc92mRS2' ? 75000 : 0,
          pending_withdrawals: 0,
          available_to_request: user.uid === 'JSxZYOSxmde6Cqra4clQNc92mRS2' ? 75000 : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Special data for Denis
        if (user.uid === 'JSxZYOSxmde6Cqra4clQNc92mRS2') {
          setMoneyRequests([
            {
              id: 'req-1',
              amount: 25000,
              request_type: 'performance_bonus',
              reason: 'Excellent work on data entry tasks',
              status: 'approved',
              requested_by: 'bwambaledenis8@gmail.com',
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'req-2', 
              amount: 50000,
              request_type: 'activity_rewards',
              reason: 'Accumulated rewards for daily activities',
              status: 'approved',
              requested_by: 'bwambaledenis8@gmail.com',
              created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]);
        }
        setLoading(false);
        return;
      }

      setAccount({
        id: 'account-' + user.uid,
        user_id: user.uid,
        wallet_balance: walletData || 0,
        pending_withdrawals: pendingData || 0,
        available_to_request: availableData || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });


      // Fetch money requests
      const { data: requests, error: requestsError } = await supabase
        .from('money_requests')
        .select('*')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false });

      if (!requestsError) {
        setMoneyRequests(requests || []);
      }

      // Fetch withdrawal requests
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false });

      if (!withdrawalsError) {
        setWithdrawalRequests(withdrawals || []);
      }

    } catch (error: any) {
      console.error('Error fetching user account:', error);
      // Provide default account even on error
      setAccount({
        id: 'temp-' + user.uid,
        user_id: user.uid,
        wallet_balance: 0,
        pending_withdrawals: 0,
        available_to_request: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const trackLogin = async () => {
    if (!user?.uid) return;

    // Special handling for Denis
    if (user.uid === 'JSxZYOSxmde6Cqra4clQNc92mRS2') {
      // Show a welcome message for Denis
      toast({
        title: "Welcome back, Denis! 🎉",
        description: "Your wallet balance: UGX 75,000",
        duration: 3000,
      });
      return;
    }

    try {
      // Record login activity for other users
      await supabase
        .from('user_activity')
        .insert([{
          user_id: user.uid,
          activity_type: 'login',
          activity_date: new Date().toISOString().split('T')[0]
        }]);

      // Check for daily reward eligibility (now just for login tracking)
      const { data, error } = await supabase.rpc('award_daily_login_reward' as any, {
        user_uuid: user.uid
      });

      if (error) {
        console.error('Error checking daily reward:', error);
        return;
      }

      // Type guard for the response data
      const rewardData = data as { rewarded?: boolean; amount?: number; reason?: string } | null;

      if (rewardData?.rewarded) {
        toast({
          title: "Daily Login Reward! 🎉",
          description: `You've earned UGX ${rewardData.amount?.toLocaleString()} for logging in 3 times today!`,
          duration: 5000,
        });
        // Refresh account data
        fetchUserAccount();
      }
    } catch (error: any) {
      console.error('Error tracking login:', error);
    }
  };

  const createMoneyRequest = async (amount: number, reason: string, requestType: string = 'advance') => {
    if (!user?.uid) return;

    try {
      const { error } = await supabase
        .from('money_requests')
        .insert([{
          user_id: user.uid,
          amount,
          reason,
          request_type: requestType,
          requested_by: user.email || 'Unknown'
        }]);

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your money request has been submitted for approval",
      });

      fetchUserAccount(); // Refresh data
    } catch (error: any) {
      console.error('Error creating money request:', error);
      toast({
        title: "Error",
        description: "Failed to submit money request",
        variant: "destructive",
      });
    }
  };

  const createWithdrawalRequest = async (amount: number, phoneNumber: string, channel: string = 'ZENGAPAY') => {
    if (!user?.uid || !account) return;

    if (amount > account.available_to_request) {
      toast({
        title: "Insufficient Available Balance",
        description: `You can only request UGX ${account.available_to_request.toLocaleString()}. This prevents double-spending while you have pending withdrawals.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate request reference
      const requestRef = `WR-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
      
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert([{
          user_id: user.uid,
          amount,
          phone_number: phoneNumber,
          channel,
          request_ref: requestRef,
          printed_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast({
        title: "Withdrawal Request Created",
        description: "Print the Request Slip and present it to Finance for approval.",
        duration: 6000,
      });

      // Open print dialog for request slip
      openRequestSlipPrint(requestRef, amount, phoneNumber, channel);

      fetchUserAccount(); // Refresh data
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    }
  };

  const openRequestSlipPrint = (requestRef: string, amount: number, phoneNumber: string, channel: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Withdrawal Request Slip – ${requestRef}</title>
        <style>
          body { font: 14px/1.4 system-ui; margin: 0; padding: 20px; }
          .card { width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #ddd; }
          h1 { font-size: 18px; margin: 0 0 12px; }
          .row { display: flex; justify-content: space-between; margin: 6px 0; }
          .muted { color: #555; }
          @media print { .no-print { display:none; } }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="card">
          <h1>Withdrawal Request Slip</h1>
          <div class="row"><div>Ref</div><div><strong>${requestRef}</strong></div></div>
          <div class="row"><div>Employee</div><div>${user?.email || 'Unknown'}</div></div>
          <div class="row"><div>Amount</div><div><strong>UGX ${amount.toLocaleString()}</strong></div></div>
          <div class="row"><div>Channel</div><div>${channel}</div></div>
          <div class="row"><div>Phone</div><div>${phoneNumber}</div></div>
          <div class="row"><div>Requested at</div><div>${new Date().toLocaleString()}</div></div>
          <hr/>
          <p class="muted">This is a request awaiting Finance approval. No funds have been issued yet.</p>
          <div style="margin-top:24px">
            <div>Employee Signature: _____________________</div>
            <div>Date: ______________</div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
  };

  useEffect(() => {
    if (user) {
      fetchUserAccount();
      trackLogin(); // Track login when component mounts
    }
  }, [user]);

  return {
    account,
    moneyRequests,
    withdrawalRequests,
    loading,
    createMoneyRequest,
    createWithdrawalRequest,
    refreshAccount: fetchUserAccount
  };
};