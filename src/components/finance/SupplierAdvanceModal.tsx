import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHRPayments } from '@/hooks/useHRPayments';
import { useAuth } from '@/contexts/AuthContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SupplierAdvanceModalProps {
  open: boolean;
  onClose: () => void;
}

const SupplierAdvanceModal: React.FC<SupplierAdvanceModalProps> = ({ open, onClose }) => {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { processAdvancePayment } = useHRPayments();
  const { employee } = useAuth();
  const { toast } = useToast();

  const supplierOptions = useMemo((): AutocompleteOption[] => {
    return suppliers.map(supplier => ({
      value: supplier.id,
      label: supplier.name,
      subtitle: `Code: ${supplier.code}`
    }));
  }, [suppliers]);

  const handleSubmit = async () => {
    if (!selectedSupplier || !amount || !purpose) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive"
      });
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) {
      toast({
        title: "Error",
        description: "Selected supplier not found",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current cash balance
      const { data: cashBalance, error: cashError } = await supabase
        .from('finance_cash_balance')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cashError) throw new Error('Failed to fetch cash balance');
      if (!cashBalance) throw new Error('No cash balance record found');

      const availableCash = cashBalance.current_balance || 0;
      if (availableCash < numAmount) {
        throw new Error(`Insufficient funds. Available: UGX ${availableCash.toLocaleString()}`);
      }

      // Create advance record in Firebase
      console.log('💰 Creating advance with supplier ID:', supplier.id);
      await addDoc(collection(db, 'supplier_advances'), {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_code: supplier.code,
        amount_ugx: numAmount,
        outstanding_ugx: numAmount,
        issued_by: employee?.name || 'Finance Department',
        description: purpose,
        is_closed: false,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Update cash balance
      const newBalance = availableCash - numAmount;
      const { error: balanceError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: newBalance,
          updated_by: employee?.name || 'Finance'
        })
        .eq('id', cashBalance.id);

      if (balanceError) throw new Error('Failed to update cash balance');

      // Record cash transaction
      const { error: txError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'PAYMENT',
          amount: -numAmount,
          balance_after: newBalance,
          reference: `ADV-${supplier.code}`,
          notes: `Advance to ${supplier.name} - ${purpose}`,
          created_by: employee?.name || 'Finance',
          status: 'confirmed',
          confirmed_by: employee?.name || 'Finance',
          confirmed_at: new Date().toISOString()
        });

      if (txError) {
        console.error('Failed to record transaction:', txError);
        throw new Error(`Failed to record transaction: ${txError.message}`);
      }

      toast({
        title: "Advance Issued",
        description: `Advance of UGX ${numAmount.toLocaleString()} given to ${supplier.name}`,
      });

      // Force refresh of advances
      window.location.reload();
      
      setSelectedSupplier('');
      setAmount('');
      setPurpose('');
      setExpectedDeliveryDate(undefined);
      onClose();
    } catch (error: any) {
      console.error('Error creating supplier advance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier advance",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setSelectedSupplier('');
    setAmount('');
    setPurpose('');
    setExpectedDeliveryDate(undefined);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Give Supplier Advance
          </DialogTitle>
          <DialogDescription>
            Provide advance payment to supplier for coffee purchase
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Autocomplete
              options={supplierOptions}
              value={selectedSupplier}
              onValueChange={setSelectedSupplier}
              placeholder="Search for a supplier..."
              searchPlaceholder="Type to search..."
              emptyText="No suppliers found. Add suppliers in Procurement."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Advance Amount (UGX)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter advance amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Purpose of advance (e.g., Coffee purchase for February delivery)"
              rows={3}
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={suppliersLoading}
          >
            Create Advance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierAdvanceModal;