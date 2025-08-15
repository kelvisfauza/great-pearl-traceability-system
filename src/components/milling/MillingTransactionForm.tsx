import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Printer, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMillingData } from '@/hooks/useMillingData';
import { useAuth } from '@/contexts/AuthContext';
import ArabicaPriceCalculator from './ArabicaPriceCalculator';

interface MillingTransactionFormProps {
  open: boolean;
  onClose: () => void;
}

const MillingTransactionForm = ({ open, onClose }: MillingTransactionFormProps) => {
  const { customers, addTransaction } = useMillingData();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    kgs_hulled: 0,
    rate_per_kg: 150,
    total_amount: 0,
    amount_paid: 0,
    notes: '',
    transaction_type: 'hulling'
  });

  const handleSubmit = async (e: React.FormEvent, saveAndNew = false) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.kgs_hulled || formData.kgs_hulled <= 0) {
      return;
    }

    setLoading(true);
    try {
      await addTransaction({
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        date: format(date, 'yyyy-MM-dd'),
        kgs_hulled: formData.kgs_hulled,
        rate_per_kg: formData.rate_per_kg,
        total_amount: formData.total_amount,
        amount_paid: formData.amount_paid,
        notes: formData.notes.trim() || undefined,
        transaction_type: formData.transaction_type,
        created_by: employee?.name || 'Unknown'
      });

      if (saveAndNew) {
        // Reset form for new entry
        setFormData({
          customer_id: '',
          customer_name: '',
          kgs_hulled: 0,
          rate_per_kg: 150,
          total_amount: 0,
          amount_paid: 0,
          notes: '',
          transaction_type: 'hulling'
        });
        setDate(new Date());
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate total amount when kgs or rate changes
    if (field === 'kgs_hulled' || field === 'rate_per_kg') {
      const kgs = newData.kgs_hulled || 0;
      const ratePerKg = newData.rate_per_kg || 150;
      
      // For kilograms below 20kg, base price is 3000
      if (kgs < 20) {
        newData.total_amount = 3000;
      } else {
        newData.total_amount = kgs * ratePerKg;
      }
    }
    
    setFormData(newData);
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

  const handlePriceChange = (calculatedPrice: number | null) => {
    if (calculatedPrice && calculatedPrice > 0) {
      setFormData(prev => ({
        ...prev,
        rate_per_kg: Math.round(calculatedPrice)
      }));
    }
  };

  const handlePrint = () => {
    // Simple print functionality - in real app, this would generate a proper receipt
    const printContent = `
      MILLING TRANSACTION RECEIPT
      ========================
      Date: ${format(date, 'PPP')}
      Customer: ${formData.customer_name}
      KGs Hulled: ${formData.kgs_hulled} kg
      Rate: UGX ${formData.rate_per_kg}/kg
      Total Amount: UGX ${formData.total_amount.toLocaleString()}
      Amount Paid: UGX ${formData.amount_paid.toLocaleString()}
      Balance: UGX ${(formData.total_amount - formData.amount_paid).toLocaleString()}
      Notes: ${formData.notes}
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre>${printContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Hulling Transaction</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="transaction" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transaction" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Transaction Form
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Price Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transaction">
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                        onSelect={(date) => {
                          if (date) {
                            setDate(date);
                            // Close the popover after selection
                            setTimeout(() => {
                              const popoverTrigger = document.querySelector('[data-state="open"][role="button"]');
                              if (popoverTrigger) {
                                (popoverTrigger as HTMLElement).click();
                              }
                            }, 100);
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kgs_hulled">KGs Hulled *</Label>
                  <Input
                    id="kgs_hulled"
                    type="number"
                    value={formData.kgs_hulled}
                    onChange={(e) => handleInputChange('kgs_hulled', parseFloat(e.target.value) || 0)}
                    placeholder="Enter weight"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_per_kg">Rate per KG (UGX)</Label>
                  <Input
                    id="rate_per_kg"
                    type="number"
                    value={formData.rate_per_kg}
                    onChange={(e) => handleInputChange('rate_per_kg', parseFloat(e.target.value) || 150)}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the Price Calculator tab to calculate quality-based pricing
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount (UGX)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={formData.total_amount}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_paid">Amount Paid (UGX)</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  value={formData.amount_paid}
                  onChange={(e) => handleInputChange('amount_paid', parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount paid"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label>Balance: UGX {(formData.total_amount - formData.amount_paid).toLocaleString()}</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-between pt-4">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrint}
                    disabled={!formData.customer_id || !formData.kgs_hulled}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading || !formData.customer_id || !formData.kgs_hulled}
                  >
                    Save & New
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !formData.customer_id || !formData.kgs_hulled}
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="calculator">
            <ArabicaPriceCalculator onPriceChange={handlePriceChange} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MillingTransactionForm;