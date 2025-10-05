import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Plus, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CashManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CashManagementModal: React.FC<CashManagementModalProps> = ({
  open,
  onOpenChange
}) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchCashData();
    }
  }, [open]);

  const fetchCashData = async () => {
    try {
      // Fetch current balance
      const { data: balance } = await supabase
        .from('finance_cash_balance')
        .select('current_balance')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      setCurrentBalance(balance?.current_balance || 0);

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTransactions(transactions || []);
    } catch (error) {
      console.error('Error fetching cash data:', error);
    }
  };

  const handleAddCash = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const depositAmount = parseFloat(amount);
      const newBalance = currentBalance + depositAmount;

      // Get current balance record ID
      const { data: balanceRecord } = await supabase
        .from('finance_cash_balance')
        .select('id')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (!balanceRecord) {
        throw new Error('Cash balance record not found');
      }

      // Update balance
      const { error: balanceError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: newBalance,
          updated_by: 'Administrator'
        })
        .eq('id', balanceRecord.id);

      if (balanceError) throw balanceError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'DEPOSIT',
          amount: depositAmount,
          balance_after: newBalance,
          notes: notes || 'Cash deposit by administrator',
          created_by: 'Administrator'
        });

      if (transactionError) throw transactionError;

      toast.success('Cash added successfully');
      setAmount('');
      setNotes('');
      fetchCashData();
    } catch (error: any) {
      console.error('Error adding cash:', error);
      toast.error(error.message || 'Failed to add cash');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Finance Cash Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Balance */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Current Available Cash</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-50 mt-2">
                  UGX {currentBalance.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Add Cash Form */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Cash to Finance
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UGX)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this cash deposit..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleAddCash} 
              disabled={loading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Adding Cash...' : 'Add Cash'}
            </Button>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Recent Transactions
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentTransactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {transaction.transaction_type === 'DEPOSIT' ? 'Cash Deposit' : 'Payment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                    {transaction.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {transaction.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.transaction_type === 'DEPOSIT' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'DEPOSIT' ? '+' : ''}
                      UGX {Math.abs(Number(transaction.amount)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: UGX {Number(transaction.balance_after).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No recent transactions
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CashManagementModal;
