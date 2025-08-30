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
      // Special handling for Denis using Firebase ID
      if (user.uid === 'JSxZYOSxmde6Cqra4clQNc92mRS2') {
        // For Denis, use his Firebase ID for all queries now
        const { data: denisLedger, error: denisError } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('user_id', 'JSxZYOSxmde6Cqra4clQNc92mRS2'); // Use Firebase ID

        console.log('Denis ledger query result:', { denisLedger, denisError });

        const denisBalance = denisLedger?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
        
        // Also fetch pending withdrawals for Denis
        const { data: denisPendingWithdrawals } = await supabase
          .from('withdrawal_requests')
          .select('amount')
          .eq('user_id', 'JSxZYOSxmde6Cqra4clQNc92mRS2')
          .in('status', ['pending', 'approved', 'processing']);

        const pendingAmount = denisPendingWithdrawals?.reduce((sum, req) => sum + (req.amount || 0), 0) || 0;
        const availableAmount = Math.max(0, denisBalance - pendingAmount);

        setAccount({
          id: 'denis-account',
          user_id: user.uid,
          wallet_balance: denisBalance,
          pending_withdrawals: pendingAmount,
          available_to_request: availableAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        console.log('Denis account set with balance:', denisBalance, 'pending:', pendingAmount, 'available:', availableAmount);
        setLoading(false);
        return;
      }

      // For all other users, use the new TEXT-compatible functions
      const { data: walletData, error: walletError } = await supabase
        .rpc('get_wallet_balance_text', { user_uuid: user.uid });

      const { data: pendingData, error: pendingError } = await supabase
        .rpc('get_pending_withdrawals_text', { user_uuid: user.uid });

      const { data: availableData, error: availableError } = await supabase
        .rpc('get_available_to_request_text', { user_uuid: user.uid });

      if (walletError || pendingError || availableError) {
        console.error('Wallet data errors:', { walletError, pendingError, availableError });
        console.log('Error fetching wallet data, using defaults');
        
        // For users with no ledger entries yet, create default account
        const defaultBalance = 0; // Use 0 as default, real balances come from database
        setAccount({
          id: 'temp-' + user.uid,
          user_id: user.uid,
          wallet_balance: defaultBalance,
          pending_withdrawals: 0,
          available_to_request: defaultBalance,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        setLoading(false);
        return;
      }

      console.log('Wallet data fetched successfully:', { walletData, pendingData, availableData });

      setAccount({
        id: 'account-' + user.uid,
        user_id: user.uid,
        wallet_balance: Number(walletData) || 0,
        pending_withdrawals: Number(pendingData) || 0,
        available_to_request: Number(availableData) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Fetch money requests for current user (use Firebase ID for Denis)
      const currentUserId = user.uid === 'JSxZYOSxmde6Cqra4clQNc92mRS2' ? 'JSxZYOSxmde6Cqra4clQNc92mRS2' : user.uid;
      
      const { data: requests, error: requestsError } = await supabase
        .from('money_requests')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (!requestsError) {
        setMoneyRequests(requests || []);
      }

      // Fetch withdrawal requests using correct user ID
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', currentUserId)
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
    // Disable all login tracking and popups
    return;
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

      // Show success popup with reference number
      showWithdrawalSuccessPopup(requestRef, amount, phoneNumber, channel);

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

  const showWithdrawalSuccessPopup = (requestRef: string, amount: number, phoneNumber: string, channel: string) => {
    toast({
      title: "Withdrawal Request Created Successfully!",
      description: `Reference: ${requestRef}. Take this reference to Finance for approval and payout.`,
      duration: 8000,
    });

    // Also open print dialog for request slip
    openRequestSlipPrint(requestRef, amount, phoneNumber, channel);
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