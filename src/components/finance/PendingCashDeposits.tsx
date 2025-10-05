import React from 'react';
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
    }
  });

  const handleConfirm = async (transactionId: string, amount: number) => {
    try {
      // Update transaction status
      const { error: transactionError } = await supabase
        .from('finance_cash_transactions')
        .update({
          status: 'confirmed',
          confirmed_by: user?.email || 'Finance',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (transactionError) throw transactionError;

      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('finance_cash_balance')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (balanceError) throw balanceError;

      // Update balance
      const newBalance = (balanceData.current_balance || 0) + amount;
      
      const { error: updateError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: newBalance,
          updated_by: user?.email || 'Finance'
        })
        .eq('id', balanceData.id);

      if (updateError) throw updateError;

      toast.success('Cash deposit confirmed successfully');
      queryClient.invalidateQueries({ queryKey: ['pending-cash-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
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
