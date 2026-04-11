import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useMillingData } from '@/hooks/useMillingData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete';

interface MillingMoMoCollectModalProps {
  open: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
}

type CollectionStatus = 'idle' | 'sending' | 'prompt_sent' | 'error';

const MillingMoMoCollectModal = ({ open, onClose, preselectedCustomerId }: MillingMoMoCollectModalProps) => {
  const { customers, loading: customersLoading } = useMillingData();
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<CollectionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const customersWithDebts = customers.filter(c => c.current_balance > 0);

  const customerOptions = useMemo((): AutocompleteOption[] => {
    return customersWithDebts.map(customer => ({
      value: customer.id,
      label: customer.full_name,
      subtitle: `Balance: UGX ${customer.current_balance.toLocaleString()}`
    }));
  }, [customersWithDebts]);

  const selectedCustomer = customers.find(c => c.id === customerId);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const customer = customers.find(c => c.id === id);
    if (customer) {
      setPhone(customer.phone || '');
      setAmount(String(customer.current_balance));
    }
  };

  const handleCollect = async () => {
    if (!customerId || !phone || !amount || Number(amount) < 500) {
      toast({ title: "Error", description: "Please fill in all fields. Minimum amount is 500 UGX.", variant: "destructive" });
      return;
    }

    setStatus('sending');
    setStatusMessage('Sending payment prompt to customer...');

    try {
      const { data, error } = await supabase.functions.invoke('milling-momo-collect', {
        body: {
          phone,
          amount: Number(amount),
          customer_id: customerId,
          customer_name: selectedCustomer?.full_name || '',
          initiated_by: employee?.name || employee?.email || 'unknown',
        },
      });

      if (error) throw error;

      if (data?.status === 'success') {
        setStatus('prompt_sent');
        setStatusMessage(data.message || 'Payment prompt sent! Customer needs to enter their PIN.');
        toast({
          title: "Prompt Sent",
          description: `Payment prompt sent to ${phone}. The customer needs to enter their Mobile Money PIN to confirm.`,
        });
      } else {
        setStatus('error');
        setStatusMessage(data?.message || 'Failed to send payment prompt.');
        toast({ title: "Failed", description: data?.message || 'Failed to initiate collection.', variant: "destructive" });
      }
    } catch (err: any) {
      console.error('MoMo collection error:', err);
      setStatus('error');
      setStatusMessage(err.message || 'An error occurred.');
      toast({ title: "Error", description: err.message || 'Something went wrong.', variant: "destructive" });
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setStatusMessage('');
    setCustomerId('');
    setPhone('');
    setAmount('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Collect via Mobile Money
          </DialogTitle>
          <DialogDescription>
            Send a payment prompt to the customer's phone to collect their outstanding balance.
          </DialogDescription>
        </DialogHeader>

        {status === 'prompt_sent' ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Prompt Sent!</h3>
              <p className="text-sm text-muted-foreground mt-2">{statusMessage}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Once the customer confirms, their balance will be automatically cleared.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : status === 'error' ? (
          <div className="py-6 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Failed</h3>
              <p className="text-sm text-muted-foreground mt-2">{statusMessage}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button onClick={() => setStatus('idle')} className="flex-1">Try Again</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Autocomplete
                options={customerOptions}
                value={customerId}
                onValueChange={handleCustomerSelect}
                placeholder="Select customer with balance..."
                searchPlaceholder="Search customers..."
                emptyText="No customers with balance found."
              />
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                  <Badge variant="destructive">UGX {selectedCustomer.current_balance.toLocaleString()}</Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">MTN or Airtel Uganda number</p>
            </div>

            <div className="space-y-2">
              <Label>Amount (UGX) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="500"
                max={selectedCustomer?.current_balance}
              />
              {selectedCustomer && amount && Number(amount) < selectedCustomer.current_balance && (
                <p className="text-xs text-muted-foreground">
                  Remaining after payment: UGX {(selectedCustomer.current_balance - Number(amount)).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1" disabled={status === 'sending'}>
                Cancel
              </Button>
              <Button 
                onClick={handleCollect} 
                className="flex-1" 
                disabled={status === 'sending' || !customerId || !phone || !amount}
              >
                {status === 'sending' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Smartphone className="h-4 w-4 mr-2" />Send Prompt</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MillingMoMoCollectModal;
