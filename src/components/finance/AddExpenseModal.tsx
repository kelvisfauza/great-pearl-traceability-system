import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Receipt } from 'lucide-react';

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddExpenseModal = ({ open, onClose, onSuccess }: AddExpenseModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    reference: '',
    notes: ''
  });
  const { toast } = useToast();
  const { employee } = useAuth();

  const categories = [
    'Office Supplies',
    'Transport',
    'Utilities',
    'Maintenance',
    'Staff Welfare',
    'Communication',
    'Professional Services',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Check available cash balance
      const { data: cashBalance } = await supabase
        .from('finance_cash_balance')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      const availableCash = cashBalance?.current_balance || 0;

      if (availableCash < amount) {
        toast({
          title: "Insufficient Funds",
          description: `Available: UGX ${availableCash.toLocaleString()}, Required: UGX ${amount.toLocaleString()}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Calculate new balance
      const newBalance = availableCash - amount;

      // Update cash balance
      const { error: balanceError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: newBalance,
          updated_by: employee?.name || 'Finance'
        })
        .eq('id', cashBalance?.id);

      if (balanceError) throw balanceError;

      // Record the expense transaction
      const { error: transactionError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'EXPENSE',
          amount: -amount,
          balance_after: newBalance,
          reference: formData.reference || `EXP-${Date.now()}`,
          notes: `${formData.category}: ${formData.description}${formData.notes ? ' - ' + formData.notes : ''}`,
          created_by: employee?.name || 'Finance',
          status: 'confirmed',
          confirmed_by: employee?.name || 'Finance',
          confirmed_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      // Also record in daily tasks for tracking
      await supabase
        .from('daily_tasks')
        .insert({
          task_type: 'expense',
          description: `${formData.category}: ${formData.description}`,
          amount: amount,
          completed_by: employee?.name || 'Finance Department',
          department: 'Finance',
          date: new Date().toISOString().split('T')[0]
        });

      toast({
        title: "Expense Added",
        description: `Successfully recorded expense of UGX ${amount.toLocaleString()}`,
        duration: 3000,
      });

      setFormData({
        description: '',
        amount: '',
        category: '',
        reference: '',
        notes: ''
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Add Direct Expense
          </DialogTitle>
          <DialogDescription>
            Record an expense that deducts immediately from the daily cash float
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="What is this expense for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UGX) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  className="pl-10"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                placeholder="Receipt number, invoice, etc."
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? 'Recording...' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};