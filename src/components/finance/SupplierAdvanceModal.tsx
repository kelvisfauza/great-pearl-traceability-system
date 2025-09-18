import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHRPayments } from '@/hooks/useHRPayments';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { format } from 'date-fns';

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

  const handleSubmit = async () => {
    if (!selectedSupplier || !amount || !purpose || !expectedDeliveryDate) {
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
      // Create advance record first
      await addDoc(collection(db, 'employee_advances'), {
        employee_name: supplier.name,
        amount: numAmount,
        reason: purpose,
        issued_by: employee?.name || 'Finance Department',
        issued_at: new Date().toISOString(),
        status: 'Pending',
        expected_delivery: expectedDeliveryDate.toISOString()
      });

      toast({
        title: "Advance Created",
        description: `Advance of UGX ${numAmount.toLocaleString()} given to ${supplier.name}`,
      });

      setSelectedSupplier('');
      setAmount('');
      setPurpose('');
      setExpectedDeliveryDate(undefined);
      onClose();
    } catch (error) {
      console.error('Error creating supplier advance:', error);
      toast({
        title: "Error",
        description: "Failed to create supplier advance",
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
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} - {supplier.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label>Expected Delivery Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedDeliveryDate ? format(expectedDeliveryDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expectedDeliveryDate}
                  onSelect={(date) => {
                    setExpectedDeliveryDate(date);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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