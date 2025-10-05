import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const PendingCashDeposits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingDeposits, isLoading } = useQuery({
    queryKey: ['pending-cash-deposits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('transaction_type', 'DEPOSIT')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000 // Refetch every 5 seconds to ensure fresh data
  });

  // Real-time subscription for cash transactions
  useEffect(() => {
    const channel = supabase
      .channel('cash-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finance_cash_transactions'
        },
        () => {
          // Refetch queries when any change happens
          queryClient.invalidateQueries({ queryKey: ['pending-cash-deposits'] });
          queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
          queryClient.invalidateQueries({ queryKey: ['completed-transactions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleConfirm = async (transactionId: string, amount: number) => {
    try {
      console.log('Starting confirmation for transaction:', transactionId);
      
      // Get the transaction to check its balance_after value
      const { data: transaction, error: fetchError } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('Transaction data:', transaction);

      // Only update the balance if this is truly a pending transaction
      if (transaction.status !== 'pending') {
        toast.error('This deposit has already been confirmed');
        await queryClient.refetchQueries({ queryKey: ['pending-cash-deposits'] });
        return;
      }

      // Optimistically update the UI by removing this deposit from the list
      queryClient.setQueryData(['pending-cash-deposits'], (old: any) => {
        if (!old) return [];
        return old.filter((d: any) => d.id !== transactionId);
      });

      // Update transaction status to confirmed
      const { data: updateResult, error: transactionError } = await supabase
        .from('finance_cash_transactions')
        .update({
          status: 'confirmed',
          confirmed_by: user?.email || 'Finance',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select();

      if (transactionError) {
        console.error('Transaction update error:', transactionError);
        // Rollback optimistic update
        await queryClient.refetchQueries({ queryKey: ['pending-cash-deposits'] });
        throw transactionError;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('No rows updated - transaction may have already been confirmed');
        // Rollback optimistic update
        await queryClient.refetchQueries({ queryKey: ['pending-cash-deposits'] });
        toast.error('Transaction has already been confirmed');
        return;
      }

      console.log('Transaction status updated successfully');

      // Get the current balance and add the deposit amount to it
      const { data: currentBalance, error: balanceError } = await supabase
        .from('finance_cash_balance')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (balanceError) {
        console.error('Balance fetch error:', balanceError);
        throw balanceError;
      }

      const newBalance = (currentBalance?.current_balance || 0) + Number(transaction.amount);

      const { error: updateError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: newBalance,
          updated_by: user?.email || 'Finance'
        })
        .eq('id', currentBalance?.id || '');

      if (updateError) {
        console.error('Balance update error:', updateError);
        throw updateError;
      }

      console.log('Balance updated successfully');

      toast.success('Cash deposit confirmed successfully');
      
      // Force refetch all relevant queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['pending-cash-deposits'] }),
        queryClient.refetchQueries({ queryKey: ['finance-stats'] }),
        queryClient.refetchQueries({ queryKey: ['completed-transactions'] }),
        queryClient.refetchQueries({ queryKey: ['finance-cash-balance'] })
      ]);
      
      console.log('All queries refetched');
    } catch (error: any) {
      console.error('Error confirming deposit:', error);
      toast.error(error.message || 'Failed to confirm deposit');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Cash Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!pendingDeposits || pendingDeposits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Cash Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending deposits</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Cash Deposits
          <Badge variant="secondary">{pendingDeposits.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingDeposits.map((deposit) => (
          <div 
            key={deposit.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <p className="font-bold text-lg">
                  UGX {Number(deposit.amount).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Added by {deposit.created_by}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(deposit.created_at).toLocaleString()}
              </p>
              {deposit.notes && (
                <p className="text-sm mt-1 italic">{deposit.notes}</p>
              )}
            </div>
            <Button 
              onClick={() => handleConfirm(deposit.id, Number(deposit.amount))}
              className="ml-4"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Receipt
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
