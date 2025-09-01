import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMillingData } from '@/hooks/useMillingData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MillingTransaction } from '@/hooks/useMillingData';

interface MillingTransactionEditModalProps {
  open: boolean;
  onClose: () => void;
  transaction: MillingTransaction | null;
}

const MillingTransactionEditModal = ({ open, onClose, transaction }: MillingTransactionEditModalProps) => {
  const { customers, updateMillingTransaction } = useMillingData();
  const { employee } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    date: '',
    kgs_hulled: 0,
    rate_per_kg: 0,
    amount_paid: 0,
    notes: '',
    change_reason: ''
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        customer_id: transaction.customer_id,
        customer_name: transaction.customer_name,
        date: transaction.date,
        kgs_hulled: transaction.kgs_hulled,
        rate_per_kg: transaction.rate_per_kg,
        amount_paid: transaction.amount_paid,
        notes: transaction.notes || '',
        change_reason: ''
      });
    }
  }, [transaction]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        customer_name: customer.full_name
      }));
    }
  };

  const calculateTotalAmount = () => {
    const kgs = formData.kgs_hulled || 0;
    const ratePerKg = formData.rate_per_kg || 0;
    
    if (kgs < 20) {
      return 3000;
    } else {
      return kgs * ratePerKg;
    }
  };

  const getChanges = () => {
    if (!transaction) return [];
    
    const changes = [];
    if (formData.customer_name !== transaction.customer_name) {
      changes.push(`Customer: ${transaction.customer_name} → ${formData.customer_name}`);
    }
    if (formData.date !== transaction.date) {
      changes.push(`Date: ${transaction.date} → ${formData.date}`);
    }
    if (formData.kgs_hulled !== transaction.kgs_hulled) {
      changes.push(`KGs Hulled: ${transaction.kgs_hulled} → ${formData.kgs_hulled}`);
    }
    if (formData.rate_per_kg !== transaction.rate_per_kg) {
      changes.push(`Rate/KG: UGX ${transaction.rate_per_kg} → UGX ${formData.rate_per_kg}`);
    }
    if (formData.amount_paid !== transaction.amount_paid) {
      changes.push(`Amount Paid: UGX ${transaction.amount_paid} → UGX ${formData.amount_paid}`);
    }
    if (formData.notes !== (transaction.notes || '')) {
      changes.push(`Notes: "${transaction.notes || ''}" → "${formData.notes}"`);
    }
    
    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !formData.change_reason.trim()) return;

    const changes = getChanges();
    if (changes.length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const newTotalAmount = calculateTotalAmount();
      const balance = newTotalAmount - formData.amount_paid;

      const updatedData = {
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        date: formData.date,
        kgs_hulled: formData.kgs_hulled,
        rate_per_kg: formData.rate_per_kg,
        total_amount: newTotalAmount,
        amount_paid: formData.amount_paid,
        balance: balance,
        notes: formData.notes,
        updated_at: new Date().toISOString()
      };

      await updateMillingTransaction(transaction.id, updatedData);

      // Log the action for audit purposes
      console.log('AUDIT LOG - Milling Transaction Edited:', {
        action: 'edit_milling_transaction',
        transactionId: transaction.id,
        originalData: transaction,
        updatedData: updatedData,
        changes: changes,
        reason: formData.change_reason,
        performedBy: employee?.name || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Transaction Updated",
        description: "Milling transaction has been updated successfully"
      });

      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = getChanges().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Milling Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={formData.customer_id} onValueChange={handleCustomerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name} (Balance: UGX {customer.current_balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kgs_hulled">KGs Hulled</Label>
              <Input
                id="kgs_hulled"
                type="number"
                value={formData.kgs_hulled}
                onChange={(e) => handleInputChange('kgs_hulled', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate_per_kg">Rate per KG (UGX)</Label>
              <Input
                id="rate_per_kg"
                type="number"
                value={formData.rate_per_kg}
                onChange={(e) => handleInputChange('rate_per_kg', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid (UGX)</Label>
              <Input
                id="amount_paid"
                type="number"
                value={formData.amount_paid}
                onChange={(e) => handleInputChange('amount_paid', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Total Amount: UGX {calculateTotalAmount().toLocaleString()}</Label>
            <Label>New Balance: UGX {(calculateTotalAmount() - formData.amount_paid).toLocaleString()}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          {hasChanges && (
            <div className="space-y-2">
              <Label>Changes to be made:</Label>
              <div className="bg-muted p-3 rounded text-sm">
                {getChanges().map((change, index) => (
                  <div key={index}>{change}</div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="change_reason">Reason for Changes *</Label>
            <Textarea
              id="change_reason"
              value={formData.change_reason}
              onChange={(e) => handleInputChange('change_reason', e.target.value)}
              placeholder="Explain why these changes are needed..."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasChanges || !formData.change_reason.trim()}
            >
              {loading ? "Updating..." : "Update Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MillingTransactionEditModal;