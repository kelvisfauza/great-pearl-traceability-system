import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smartphone, Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import { useMillingData } from '@/hooks/useMillingData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MillingMoMoBulkCollectModal = ({ open, onClose }: Props) => {
  const { customers, loading } = useMillingData();
  const { employee } = useAuth();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<{ ref: string; total: number; count: number } | null>(null);
  const [search, setSearch] = useState('');

  const debtors = useMemo(
    () => customers
      .filter(c => Number(c.current_balance) > 0)
      .filter(c => !search.trim() || c.full_name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  );

  const totalAmount = useMemo(
    () => debtors
      .filter(c => selected.has(c.id))
      .reduce((s, c) => s + Number(c.current_balance), 0),
    [debtors, selected]
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === debtors.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(debtors.map(c => c.id)));
    }
  };

  const handleSend = async () => {
    if (selected.size === 0) {
      toast({ title: 'Select customers', description: 'Pick at least one customer with a balance.', variant: 'destructive' });
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Phone required', description: 'Enter the phone number that will receive the prompt(s).', variant: 'destructive' });
      return;
    }
    if (totalAmount < 500) {
      toast({ title: 'Amount too low', description: 'Total must be at least 500 UGX.', variant: 'destructive' });
      return;
    }

    setSending(true);
    const targets = debtors.filter(c => selected.has(c.id));
    const allocations = targets.map(c => ({
      customer_id: c.id,
      customer_name: c.full_name,
      amount: Math.floor(Number(c.current_balance)),
    }));
    const total = allocations.reduce((s, a) => s + a.amount, 0);

    try {
      const { data, error } = await supabase.functions.invoke('milling-momo-collect', {
        body: {
          phone,
          amount: total,
          allocations,
          initiated_by: employee?.name || employee?.email || 'bulk',
        },
      });
      if (error) throw error;
      if (data?.status === 'success') {
        setSuccess({ ref: data.ref, total, count: targets.length });
        toast({
          title: 'Prompt sent',
          description: `Single prompt for UGX ${total.toLocaleString()} sent to ${phone}. Once paid, ${targets.length} customer balance${targets.length === 1 ? '' : 's'} will be cleared.`,
        });
      } else {
        toast({ title: 'Failed', description: data?.message || data?.error || 'Failed to send prompt', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelected(new Set());
    setPhone('');
    setSuccess(null);
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Collect Debts via Mobile Money
          </DialogTitle>
          <DialogDescription>
            Select multiple customers and send a payment prompt for each customer's full balance to a single phone number (e.g. an agent or collector).
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Prompt Sent!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                A single MoMo prompt for <strong>UGX {success.total.toLocaleString()}</strong> was sent to <strong>{phone}</strong>.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Once the PIN is entered and payment confirms, {success.count} customer balance{success.count === 1 ? '' : 's'} will be cleared automatically.
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Ref: {success.ref}</p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Receiving Phone Number *</Label>
              <Input
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A single MoMo prompt for the total of all selected customers will be sent to this number. Use your own number or any agent/collector number.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Customers with Debts</Label>
                <Button type="button" variant="ghost" size="sm" onClick={toggleAll} disabled={debtors.length === 0}>
                  {selected.size === debtors.length && debtors.length > 0 ? 'Clear all' : 'Select all'}
                </Button>
              </div>
              <Input
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <ScrollArea className="h-64 border rounded-md">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : debtors.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No customers with outstanding balance.</div>
                ) : (
                  <div className="divide-y">
                    {debtors.map(c => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggle(c.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{c.full_name}</div>
                          <div className="text-xs text-muted-foreground">{c.phone || 'No phone'}</div>
                        </div>
                        <Badge variant="destructive">UGX {Number(c.current_balance).toLocaleString()}</Badge>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
              <div className="text-sm">
                <div className="font-medium">{selected.size} customer{selected.size === 1 ? '' : 's'} selected</div>
                <div className="text-xs text-muted-foreground">1 prompt will be sent to {phone || '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-bold">UGX {totalAmount.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} className="flex-1" disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                className="flex-1"
                disabled={sending || selected.size === 0 || !phone}
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Smartphone className="h-4 w-4 mr-2" />Send Prompt (UGX {totalAmount.toLocaleString()})</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MillingMoMoBulkCollectModal;