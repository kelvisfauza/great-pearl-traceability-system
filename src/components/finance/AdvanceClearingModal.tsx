import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calculator, CreditCard, DollarSign } from 'lucide-react';

interface AdvanceClearingModalProps {
  open: boolean;
  onClose: () => void;
}

interface SupplierAdvance {
  id: string;
  supplierName: string;
  amount: number;
  status: string;
  created_at: string;
  purpose?: string;
}

interface PaymentRecord {
  id: string;
  supplier: string;
  amount: number;
  status: string;
  date: string;
  batchNumber?: string;
}

const AdvanceClearingModal: React.FC<AdvanceClearingModalProps> = ({ open, onClose }) => {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [clearingAmount, setClearingAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [advances, setAdvances] = useState<SupplierAdvance[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedAdvance = advances.find(a => a.supplierName === selectedSupplier);
  const supplierPayments = payments.filter(p => p.supplier === selectedSupplier && p.status === 'Paid');
  const totalPaidToSupplier = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAdvance = selectedAdvance ? selectedAdvance.amount - totalPaidToSupplier : 0;

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch active supplier advances
      const advancesQuery = query(
        collection(db, 'supplier_advances'),
        where('status', '==', 'Active')
      );
      const advancesSnapshot = await getDocs(advancesQuery);
      const advancesData = advancesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupplierAdvance[];
      
      // Fetch payment records
      const paymentsQuery = query(collection(db, 'payment_records'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRecord[];
      
      setAdvances(advancesData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch advances data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAdvance = async () => {
    if (!selectedSupplier || !clearingAmount || !selectedAdvance) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(clearingAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (amount > remainingAdvance) {
      toast({
        title: "Error",
        description: "Clearing amount cannot exceed remaining advance balance",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Create advance clearing record
      await addDoc(collection(db, 'advance_clearings'), {
        advance_id: selectedAdvance.id,
        supplier_name: selectedSupplier,
        clearing_amount: amount,
        payment_method: paymentMethod,
        cleared_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Update advance status if fully cleared
      const newTotalPaid = totalPaidToSupplier + amount;
      if (newTotalPaid >= selectedAdvance.amount) {
        await updateDoc(doc(db, 'supplier_advances', selectedAdvance.id), {
          status: 'Cleared',
          cleared_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      // Record as finance transaction
      await addDoc(collection(db, 'finance_transactions'), {
        type: 'Advance Clearing',
        description: `Advance cleared for ${selectedSupplier} - UGX ${amount.toLocaleString()}`,
        amount: -amount, // Negative because it reduces cash
        supplier_name: selectedSupplier,
        advance_id: selectedAdvance.id,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Record as daily task
      await addDoc(collection(db, 'daily_tasks'), {
        task_type: 'Advance Clearing',
        description: `Advance cleared for ${selectedSupplier} - UGX ${amount.toLocaleString()} via ${paymentMethod}`,
        amount: amount,
        supplier_name: selectedSupplier,
        completed_by: 'Finance Department',
        completed_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        department: 'Finance',
        created_at: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: `Advance cleared successfully for ${selectedSupplier}`,
      });

      // Reset form
      setSelectedSupplier('');
      setClearingAmount('');
      setPaymentMethod('cash');
      onClose();
      
    } catch (error) {
      console.error('Error clearing advance:', error);
      toast({
        title: "Error",
        description: "Failed to clear advance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Clear Supplier Advance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier">Select Supplier</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Choose supplier with active advance" />
              </SelectTrigger>
              <SelectContent>
                {advances.map((advance) => (
                  <SelectItem key={advance.id} value={advance.supplierName}>
                    {advance.supplierName} - {formatCurrency(advance.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAdvance && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Advance Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Original Advance:</span>
                  <span className="font-medium">{formatCurrency(selectedAdvance.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Paid:</span>
                  <span className="font-medium">{formatCurrency(totalPaidToSupplier)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Remaining:</span>
                  <span className="font-medium text-orange-600">{formatCurrency(remainingAdvance)}</span>
                </div>
                <Badge variant={remainingAdvance > 0 ? "destructive" : "default"}>
                  {remainingAdvance > 0 ? "Outstanding" : "Fully Paid"}
                </Badge>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Clearing Amount (UGX)</Label>
            <Input
              id="amount"
              type="number"
              value={clearingAmount}
              onChange={(e) => setClearingAmount(e.target.value)}
              placeholder="Enter amount to clear"
              max={remainingAdvance}
            />
            {selectedAdvance && (
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(remainingAdvance)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearAdvance}
              className="flex-1"
              disabled={loading || !selectedSupplier || !clearingAmount}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {loading ? 'Clearing...' : 'Clear Advance'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvanceClearingModal;