import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Send, Loader2, Phone, DollarSign, RefreshCw } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

const ServiceProviderPayments = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  const [form, setForm] = useState({
    receiverPhone: '',
    receiverName: '',
    description: '',
    amount: '',
    withdrawCharge: '',
    notes: '',
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['service-provider-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_provider_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!form.receiverPhone || !form.amount || !form.description) {
      toast({ title: 'Missing fields', description: 'Phone, amount and service description are required', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 500) {
      toast({ title: 'Invalid amount', description: 'Amount must be at least 500 UGX', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('service-provider-payout', {
        body: {
          phone: form.receiverPhone,
          amount: amount,
          withdrawCharge: parseFloat(form.withdrawCharge) || 0,
          description: form.description,
          receiverName: form.receiverName,
          initiatedBy: employee?.email || '',
          initiatedByName: employee?.name || '',
          notes: form.notes,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Payment initiated',
          description: data.message || 'Payment sent successfully',
        });
        setForm({ receiverPhone: '', receiverName: '', description: '', amount: '', withdrawCharge: '', notes: '' });
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['service-provider-payments'] });
      } else {
        toast({
          title: 'Payment issue',
          description: data?.message || 'Payment may have failed',
          variant: data?.status === 'pending_approval' ? 'default' : 'destructive',
        });
        queryClient.invalidateQueries({ queryKey: ['service-provider-payments'] });
        if (data?.status === 'pending_approval') {
          setOpen(false);
          setForm({ receiverPhone: '', receiverName: '', description: '', amount: '', withdrawCharge: '', notes: '' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to process payment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Sent</Badge>;
      case 'pending_approval': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Pending Yo</Badge>;
      case 'pending': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Processing</Badge>;
      default: return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const formatAmount = (v: number) => `UGX ${Number(v).toLocaleString('en-UG')}`;

  return (
    <Card className="card-modern">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Service Provider Payments</CardTitle>
            <p className="text-sm text-muted-foreground">Pay service providers via Mobile Money</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Send className="w-4 h-4" /> Pay Service Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" /> Pay Service Provider
              </DialogTitle>
              <DialogDescription>
                Enter service provider details to send payment via Mobile Money
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="sp-receiverName">Provider Name *</Label>
                <Input
                  id="sp-receiverName"
                  placeholder="e.g. John's Transport Services"
                  value={form.receiverName}
                  onChange={(e) => setForm(f => ({ ...f, receiverName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-receiverPhone">Provider Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="sp-receiverPhone"
                    placeholder="e.g. 0770123456"
                    className="pl-10"
                    value={form.receiverPhone}
                    onChange={(e) => setForm(f => ({ ...f, receiverPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-description">Service Description *</Label>
                <Textarea
                  id="sp-description"
                  placeholder="e.g. Transport of 500 bags from Kasese to Kampala"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sp-amount">Payment Amount (UGX) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="sp-amount"
                      type="number"
                      placeholder="100000"
                      className="pl-10"
                      value={form.amount}
                      onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-withdrawCharge">Withdraw Charge (UGX)</Label>
                  <Input
                    id="sp-withdrawCharge"
                    type="number"
                    placeholder="2500"
                    value={form.withdrawCharge}
                    onChange={(e) => setForm(f => ({ ...f, withdrawCharge: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-notes">Additional Notes</Label>
                <Input
                  id="sp-notes"
                  placeholder="Invoice number, reference, etc."
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {form.amount && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Payment Amount:</span>
                    <span>UGX {Number(form.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Withdraw Charge:</span>
                    <span>UGX {Number(form.withdrawCharge || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1 mt-1">
                    <span>Total to Send:</span>
                    <span>UGX {(Number(form.amount || 0) + Number(form.withdrawCharge || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Sending...' : 'Send Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No service provider payments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Charge</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(d.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-medium">{d.receiver_name || '—'}</TableCell>
                    <TableCell className="text-sm">{d.receiver_phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{d.service_description}</TableCell>
                    <TableCell className="text-right text-sm">{formatAmount(d.amount)}</TableCell>
                    <TableCell className="text-right text-sm">{formatAmount(d.withdraw_charge)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatAmount(d.total_amount)}</TableCell>
                    <TableCell>{getStatusBadge(d.yo_status)}</TableCell>
                    <TableCell className="text-sm">{d.initiated_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceProviderPayments;
