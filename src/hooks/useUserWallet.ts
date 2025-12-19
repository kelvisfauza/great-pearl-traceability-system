import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WalletData {
  balance: number;
  pendingWithdrawals: number;
  availableToRequest: number;
  dailySalaryAmount: number;
  monthlySalary: number;
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

export const useUserWallet = () => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, employee } = useAuth();
  const { toast } = useToast();

  const fetchWalletData = async () => {
    if (!user?.email || !employee) {
      setLoading(false);
      return;
    }

    try {
      console.log('💰 Fetching wallet data for:', user.email);

      // Get balance data using the safe function
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_user_balance_safe', { user_email: user.email });
      
      if (balanceError) {
        throw balanceError;
      }
      
      const userData = balanceData?.[0];
      if (userData) {
        // Calculate daily salary based on employee's monthly salary
        const monthlySalary = employee.salary || 0;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dailySalaryAmount = Math.round((monthlySalary / daysInMonth) * 100) / 100;

        const wallet: WalletData = {
          balance: Number(userData.wallet_balance) || 0,
          pendingWithdrawals: Number(userData.pending_withdrawals) || 0,
          availableToRequest: Number(userData.available_balance) || 0,
          dailySalaryAmount,
          monthlySalary,
          employeeName: userData.name || employee.name || 'Unknown'
        };

        setWalletData(wallet);
        console.log('✅ Wallet loaded:', {
          balance: wallet.balance,
          monthlySalary: wallet.monthlySalary,
          dailySalary: wallet.dailySalaryAmount
        });
      } else {
        // Set default wallet data
        const monthlySalary = employee.salary || 0;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dailySalaryAmount = Math.round((monthlySalary / daysInMonth) * 100) / 100;

        setWalletData({
          balance: 0,
          pendingWithdrawals: 0,
          availableToRequest: 0,
          dailySalaryAmount,
          monthlySalary,
          employeeName: employee.name || 'Unknown'
        });
        console.log('⚠️ No wallet data found, using defaults with daily salary:', dailySalaryAmount);
      }
      
      // Get unified user ID for withdrawal requests
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: user.email });
      
      const unifiedUserId = userIdData || user.id;
      
      // Fetch withdrawal requests
      const { data: withdrawalRequestsData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', unifiedUserId)
        .order('created_at', { ascending: false });

      setWithdrawalRequests(withdrawalRequestsData || []);
      
    } catch (error: any) {
      console.error('❌ Error fetching wallet data:', error);
      
      // Provide default wallet data even on error
      const monthlySalary = employee?.salary || 0;
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dailySalaryAmount = Math.round((monthlySalary / daysInMonth) * 100) / 100;

      setWalletData({
        balance: 0,
        pendingWithdrawals: 0,
        availableToRequest: 0,
        dailySalaryAmount,
        monthlySalary,
        employeeName: employee?.name || 'Unknown'
      });
    } finally {
      setLoading(false);
    }
  };

  const createWithdrawalRequest = async (amount: number, phoneNumber: string, channel: string = 'ZENGAPAY') => {
    if (!user?.email || !walletData) return;

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

      toast({
        title: "Withdrawal Request Created Successfully!",
        description: `Reference: ${requestRef}. Take this reference to Finance for approval and payout.`,
        duration: 8000,
      });

      // Refresh wallet data
      fetchWalletData();
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
    if (user && employee) {
      fetchWalletData();
    } else if (user && !employee) {
      // User exists but no employee profile - stop loading
      setLoading(false);
    } else if (!user) {
      // No user - stop loading
      setLoading(false);
    }
  }, [user, employee]);

  return {
    walletData,
    withdrawalRequests,
    loading,
    createWithdrawalRequest,
    refreshWallet: fetchWalletData
  };
};