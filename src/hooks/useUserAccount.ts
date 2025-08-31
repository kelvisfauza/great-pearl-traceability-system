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
  console.log('🏁 useUserAccount hook initializing...');
  
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [moneyRequests, setMoneyRequests] = useState<MoneyRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  console.log('👤 useUserAccount - user object:', user);

  const fetchUserAccount = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    console.log('🔍 fetchUserAccount called for user:', { id: user.id, email: user.email });

    try {
      // Use the safer unified function to get balance data
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_user_balance_safe', { user_email: user.email });
      
      if (balanceError) {
        console.error('Error fetching balance data:', balanceError);
        throw balanceError;
      }
      
      console.log('💰 Balance data from unified function:', balanceData);
      
      const userData = balanceData?.[0];
      if (userData) {
        const accountData: UserAccount = {
          id: `account-${user.id}`,
          user_id: user.id,
          wallet_balance: Number(userData.wallet_balance) || 0,
          pending_withdrawals: Number(userData.pending_withdrawals) || 0,
          available_to_request: Number(userData.available_balance) || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setAccount(accountData);
        
        console.log('✅ Account loaded successfully for', user.email, 'Balance:', userData.wallet_balance);
      } else {
        // No data found, set default values
        const defaultAccount: UserAccount = {
          id: `temp-${user.id}`,
          user_id: user.id,
          wallet_balance: 0,
          pending_withdrawals: 0,
          available_to_request: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setAccount(defaultAccount);
        console.log('⚠️ No balance data found for', user.email, 'using defaults');
      }
      
      // Get unified user ID for withdrawal requests
      const { data: userIdData, error: userIdError } = await supabase
        .rpc('get_unified_user_id', { input_email: user.email });
      
      if (userIdError) {
        console.error('Error getting unified user ID:', userIdError);
        return;
      }
      
      const unifiedUserId = userIdData || user.id;
      console.log('🆔 Using unified user ID:', unifiedUserId);
      
      // Fetch money requests using Supabase ID
      const { data: moneyRequestsData } = await supabase
        .from('money_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch withdrawal requests using unified user ID
      const { data: withdrawalRequestsData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', unifiedUserId)
        .order('created_at', { ascending: false });

      setMoneyRequests(moneyRequestsData || []);
      setWithdrawalRequests(withdrawalRequestsData || []);
      
    } catch (error: any) {
      console.error('❌ Error fetching user account:', error);
      // Provide default account even on error
      setAccount({
        id: `temp-${user.id}`,
        user_id: user.id,
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
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('money_requests')
        .insert([{
          user_id: user.id,
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
    if (!user?.email || !account) return;

    if (amount > account.available_to_request) {
      toast({
        title: "Insufficient Available Balance",
        description: `You can only request UGX ${account.available_to_request.toLocaleString()}. This prevents double-spending while you have pending withdrawals.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Get unified user ID for withdrawal requests
      const { data: userIdData, error: userIdError } = await supabase
        .rpc('get_unified_user_id', { input_email: user.email });
      
      if (userIdError) {
        throw new Error('Error getting user ID');
      }
      
      const unifiedUserId = userIdData || user.id;
      
      // Generate request reference
      const requestRef = `WR-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
      
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert([{
          user_id: unifiedUserId,
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