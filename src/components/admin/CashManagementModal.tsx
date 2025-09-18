import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CashManagementModalProps {
  open: boolean;
  onClose: () => void;
}

const CashManagementModal: React.FC<CashManagementModalProps> = ({ open, onClose }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'Float' | 'Cash'>('Float');
  const addTransaction = async (transactionData: any) => {
    try {
      await addDoc(collection(db, 'finance_transactions'), {
        ...transactionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!amount || !description) {
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

    try {
      await addTransaction({
        type: type,
        description: description,
        amount: numAmount,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      });

      toast({
        title: "Cash Added Successfully",
        description: `${type} of UGX ${numAmount.toLocaleString()} has been added to finance`,
      });

      setAmount('');
      setDescription('');
      setType('Float');
      onClose();
    } catch (error) {
      console.error('Error adding cash:', error);
      toast({
        title: "Error",
        description: "Failed to add cash to finance",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Add Cash to Finance
          </DialogTitle>
          <DialogDescription>
            Add cash or float to the finance department
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={type === 'Float' ? 'default' : 'outline'}
              onClick={() => setType('Float')}
              className="flex items-center gap-2"
            >
              <Banknote className="h-4 w-4" />
              Float
            </Button>
            <Button
              variant={type === 'Cash' ? 'default' : 'outline'}
              onClick={() => setType('Cash')}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Cash
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (UGX)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description for this cash addition"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add {type}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashManagementModal;