import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserAccount {
  id: string;
  user_id: string;
  current_balance: number;
  total_earned: number;
  total_withdrawn: number;
  salary_approved: number;
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
      // Fetch or create user account
      let { data: accountData, error: accountError } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_id', user.uid)
        .single();

      if (accountError && accountError.code !== 'PGRST116') {
        // Table might not exist yet, create default account
        console.log('Supabase table not available, using default account');
        setAccount({
          id: 'temp-' + user.uid,
          user_id: user.uid,
          current_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
          salary_approved: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setLoading(false);
        return;
      }

      // If no account exists, create one
      if (!accountData) {
        const { data: newAccount, error: createError } = await supabase
          .from('user_accounts')
          .insert([{ user_id: user.uid }])
          .select()
          .single();

        if (createError) {
          console.log('Cannot create account, using default');
          setAccount({
            id: 'temp-' + user.uid,
            user_id: user.uid,
            current_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            salary_approved: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          setLoading(false);
          return;
        }
        accountData = newAccount;
      }

      setAccount(accountData);

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
        current_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
        salary_approved: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const trackLogin = async () => {
    if (!user?.uid) return;

    try {
      // Record login activity
      await supabase
        .from('user_activity')
        .insert([{
          user_id: user.uid,
          activity_type: 'login',
          activity_date: new Date().toISOString().split('T')[0]
        }]);

      // Check for daily reward eligibility
      const { data, error } = await supabase.rpc('award_daily_login_reward', {
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
          title: "Daily Reward!",
          description: `You've earned UGX ${rewardData.amount?.toLocaleString()} for being active today!`,
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

  const createWithdrawalRequest = async (amount: number, phoneNumber: string) => {
    if (!user?.uid || !account) return;

    if (amount > account.current_balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert([{
          user_id: user.uid,
          amount,
          phone_number: phoneNumber
        }]);

      if (error) throw error;

      toast({
        title: "Withdrawal Request Submitted",
        description: "Your withdrawal request is being processed",
      });

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