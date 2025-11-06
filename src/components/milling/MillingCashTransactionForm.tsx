import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMillingData } from '@/hooks/useMillingData';
import { useAuth } from '@/contexts/AuthContext';
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete';

interface MillingCashTransactionFormProps {
  open: boolean;
  onClose: () => void;
}

const MillingCashTransactionForm = ({ open, onClose }: MillingCashTransactionFormProps) => {
  const { customers, addCashTransaction } = useMillingData();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    amount_paid: 0,
    payment_method: 'Cash',
    notes: ''
  });

  // Filter customers with positive balances (debts)
  const customersWithDebts = customers.filter(c => c.current_balance > 0);

  const customerOptions = useMemo((): AutocompleteOption[] => {
    return customersWithDebts.map(customer => ({
      value: customer.id,
      label: customer.full_name,
      subtitle: `Balance: UGX ${customer.current_balance.toLocaleString()}`
    }));
  }, [customersWithDebts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.amount_paid || formData.amount_paid <= 0) {
      return;
    }

    // Validate payment amount doesn't exceed balance
    const selectedCustomer = customers.find(c => c.id === formData.customer_id);
    if (selectedCustomer && formData.amount_paid > selectedCustomer.current_balance) {
      return;
    }

    setLoading(true);
    try {
      await addCashTransaction({
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        amount_paid: formData.amount_paid,
        payment_method: formData.payment_method,
        notes: formData.notes.trim() || undefined,
        date: format(date, 'yyyy-MM-dd'),
        created_by: employee?.name || 'Unknown'
      });
      
      onClose();
      // Reset form
      setFormData({
        customer_id: '',
        customer_name: '',
        amount_paid: 0,
        payment_method: 'Cash',
        notes: ''
      });
      setDate(new Date());
    } catch (error) {
      console.error('Error adding cash transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Cash Payment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Customer with Balance *</Label>
            <Autocomplete
              options={customerOptions}
              value={formData.customer_id}
              onValueChange={handleCustomerSelect}
              placeholder="Search for a customer..."
              searchPlaceholder="Type to search..."
              emptyText="No customers with outstanding balance found."
            />
          </div>

          {selectedCustomer && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Current Balance: UGX {selectedCustomer.current_balance.toLocaleString()}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount_paid">Amount Paid (UGX) *</Label>
            <Input
              id="amount_paid"
              type="number"
              value={formData.amount_paid}
              onChange={(e) => handleInputChange('amount_paid', parseFloat(e.target.value) || 0)}
              placeholder="Enter amount paid"
              min="0"
              step="0.01"
              max={selectedCustomer?.current_balance || undefined}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedCustomer && formData.amount_paid > 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">New Balance:</span> UGX {(selectedCustomer.current_balance - formData.amount_paid).toLocaleString()}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Payment notes"
              rows={3}
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
              disabled={loading || !formData.customer_id || !formData.amount_paid}
            >
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MillingCashTransactionForm;