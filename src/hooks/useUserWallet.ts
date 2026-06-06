import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  approval_stage?: string;
  source?: 'wallet' | 'approval';
}

const PENDING_WITHDRAWAL_STATUSES = [
  'pending_approval',
  'pending_admin_2',
  'pending_admin_3',
  'pending_finance',
];

export const useUserWallet = () => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const walletOwnerEmail = employee?.email || user?.email || null;

  const isPendingWithdrawal = (withdrawal: Pick<WithdrawalRequest, 'status' | 'approval_stage'>) => {
    const normalizedStatus = (withdrawal.status || '').toLowerCase();
    const normalizedStage = (withdrawal.approval_stage || '').toLowerCase();

    return PENDING_WITHDRAWAL_STATUSES.includes(normalizedStatus)
      || PENDING_WITHDRAWAL_STATUSES.includes(normalizedStage)
      || normalizedStatus.includes('pending');
  };

  const normalizeApprovalChannel = (method?: string | null) => {
    switch ((method || '').toLowerCase()) {
      case 'mobile_money':
        return 'MOBILE_MONEY';
      case 'bank_transfer':
        return 'BANK';
      default:
        return 'CASH';
    }
  };

  const queryKey = ['user-wallet', walletOwnerEmail];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    enabled: !!walletOwnerEmail,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
    queryFn: async () => {
      console.log('💰 Fetching wallet data for:', walletOwnerEmail);

      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_user_balance_safe', { user_email: walletOwnerEmail! });
      if (balanceError) throw balanceError;

      const userData = balanceData?.[0];
      let wallet: WalletData = userData
        ? {
            balance: Number(userData.wallet_balance) || 0,
            pendingWithdrawals: Number(userData.pending_withdrawals) || 0,
            availableToRequest: Number(userData.available_balance) || 0,
            employeeName: userData.name || employee?.name || 'Unknown',
          }
        : {
            balance: 0,
            pendingWithdrawals: 0,
            availableToRequest: 0,
            employeeName: employee?.name || 'Unknown',
          };

      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: walletOwnerEmail! });
      const unifiedId = (userIdData as string | null) || user?.id || null;

      let allWithdrawals: WithdrawalRequest[] = [];
      if (unifiedId) {
        const [legacyRes, approvalRes] = await Promise.all([
          supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('user_id', unifiedId)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('approval_requests')
            .select('id, amount, status, created_at, approval_stage, disbursement_phone, disbursement_method, details')
            .eq('requestedby', walletOwnerEmail!)
            .eq('type', 'Withdrawal Request')
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        const legacyWithdrawals: WithdrawalRequest[] = (legacyRes.data || []).map((w: any) => ({
          id: w.id,
          amount: Number(w.amount) || 0,
          phone_number: w.phone_number || 'N/A',
          status: w.status || 'pending',
          request_ref: w.request_ref || w.id,
          channel: w.channel || 'CASH',
          created_at: w.created_at,
          source: 'wallet',
        }));

        const approvalWithdrawals: WithdrawalRequest[] = (approvalRes.data || []).map((w: any) => {
          const details = w.details && typeof w.details === 'object' ? (w.details as Record<string, any>) : null;
          return {
            id: w.id,
            amount: Number(w.amount) || 0,
            phone_number: w.disbursement_phone || 'N/A',
            status: w.status || 'pending',
            request_ref: details?.ref || details?.withdrawal_id || w.id,
            channel: normalizeApprovalChannel(w.disbursement_method),
            created_at: w.created_at,
            approval_stage: w.approval_stage || undefined,
            source: 'approval',
          };
        });

        allWithdrawals = [...approvalWithdrawals, ...legacyWithdrawals].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const frozenPending = allWithdrawals
          .filter(isPendingWithdrawal)
          .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        wallet = {
          ...wallet,
          pendingWithdrawals: frozenPending,
          availableToRequest: Math.max(0, wallet.balance - frozenPending),
        };
      }

      return { wallet, withdrawals: allWithdrawals, unifiedUserId: unifiedId };
    },
  });

  const walletData = data?.wallet ?? null;
  const withdrawalRequests = data?.withdrawals ?? [];
  const unifiedUserId = data?.unifiedUserId ?? null;
  const loading = isLoading;
  const fetchWalletData = () => { refetch(); };

  // Real-time: refetch immediately on any ledger entry or withdrawal change for this user
  useEffect(() => {
    if (!walletOwnerEmail) return;
    const channel = supabase
      .channel(`wallet-rt-${walletOwnerEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, (payload: any) => {
        const row = payload.new || payload.old;
        if (!row) return;
        if (unifiedUserId && row.user_id === unifiedUserId) {
          refetch();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, (payload: any) => {
        const row = payload.new || payload.old;
        if (unifiedUserId && row?.user_id === unifiedUserId) refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests', filter: `requestedby=eq.${walletOwnerEmail}` }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walletOwnerEmail, unifiedUserId, refetch]);

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

      // Server-side balance validation to prevent overdrawing
      const { data: isValid, error: validationError } = await supabase
        .rpc('validate_withdrawal_balance', { p_user_id: unifiedUserId, p_amount: amount });

      if (validationError || !isValid) {
        toast({
          title: "Insufficient Balance",
          description: `Your actual available balance is not enough for this withdrawal. Please check your wallet statement.`,
          variant: "destructive",
        });
        return;
      }
      
      // Generate request reference
      const requestRef = `WR-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
      
      // Insert withdrawal into approval_requests with correct schema columns
      const { error } = await supabase
        .from('approval_requests' as any)
        .insert([{
          department: employee?.department || 'General',
          type: 'Withdrawal Request',
          title: `Withdrawal Request - ${employee?.name || walletOwnerEmail}`,
          description: `Withdrawal via ${channel} - Ref: ${requestRef}`,
          amount,
          requestedby: walletOwnerEmail,
          daterequested: new Date().toISOString().split('T')[0],
          priority: amount > 100000 ? 'High' : 'Medium',
          status: 'Pending Admin',
          approval_stage: 'pending_admin',
          finance_approved: false,
          admin_approved: false,
          requestedby_name: employee?.name || walletOwnerEmail,
          requestedby_position: employee?.position || 'Staff',
          disbursement_method: channel === 'MOBILE_MONEY' ? 'mobile_money' : channel === 'BANK' ? 'bank_transfer' : 'cash',
          disbursement_phone: channel === 'MOBILE_MONEY' ? phoneNumber : (employee?.phone || ''),
          requires_three_approvals: amount > 100000,
          details: {
            request_type: 'withdrawal',
            payment_channel: channel,
            user_id: unifiedUserId,
            employee_id: employee?.id || null,
            employee_email: walletOwnerEmail,
            ref: requestRef,
            is_withdrawal: true,
            withdrawal_id: requestRef
          }
        }]);

      if (error) throw error;

      toast({
        title: "Withdrawal Submitted!",
        description: `Reference: ${requestRef}. Your request for UGX ${amount.toLocaleString()} has been submitted for Admin approval.`,
        duration: 8000,
      });

      // Refresh wallet data after a short delay to let DB settle
      await new Promise(resolve => setTimeout(resolve, 500));
      await refetch();
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    }
  };

  return {
    walletData,
    withdrawalRequests,
    loading,
    createWithdrawalRequest,
    refreshWallet: () => { refetch(); },
  };
};