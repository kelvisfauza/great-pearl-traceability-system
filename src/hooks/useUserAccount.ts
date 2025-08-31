import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserWallet } from '@/hooks/useUserWallet';

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
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use the unified wallet system
  const { 
    walletData, 
    withdrawalRequests, 
    loading: walletLoading, 
    createWithdrawalRequest,
    refreshWallet 
  } = useUserWallet();

  console.log('👤 useUserAccount - user object:', user);

  const fetchUserAccount = async () => {
    if (!user?.email) {
      return;
    }

    console.log('🔍 fetchUserAccount called for user:', { id: user.id, email: user.email });

    try {
      // Fetch money requests using Supabase ID
      const { data: moneyRequestsData } = await supabase
        .from('money_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setMoneyRequests(moneyRequestsData || []);
      
      // Convert wallet data to account format for compatibility
      if (walletData) {
        const accountData: UserAccount = {
          id: `account-${user.id}`,
          user_id: user.id,
          wallet_balance: walletData.balance,
          pending_withdrawals: walletData.pendingWithdrawals,
          available_to_request: walletData.availableToRequest,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setAccount(accountData);
        console.log('✅ Account synced with wallet data for', user.email, 'Balance:', walletData.balance);
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching money requests:', error);
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

  // Use the unified wallet's withdrawal creation function
  const handleWithdrawalRequest = createWithdrawalRequest;

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
  }, [user, walletData]);

  return {
    account,
    moneyRequests,
    withdrawalRequests,
    loading: walletLoading,
    createMoneyRequest,
    createWithdrawalRequest: handleWithdrawalRequest,
    refreshAccount: () => {
      fetchUserAccount();
      refreshWallet();
    }
  };
};