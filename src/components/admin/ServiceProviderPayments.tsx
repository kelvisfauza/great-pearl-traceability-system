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
import { Truck, Send, Loader2, Phone, DollarSign, RefreshCw, RotateCcw, CheckCheck, UserPlus, Users } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ServiceProviderPayments = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    receiverPhone: '',
    receiverName: '',
    description: '',
    amount: '',
    withdrawCharge: '',
    notes: '',
    invoiceNumber: '',
    email: '',
  });
  const [saveProvider, setSaveProvider] = useState(true);

  // Fetch saved service providers
  const { data: savedProviders = [] } = useQuery({
    queryKey: ['saved-service-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .order('name', { ascending: true }) as any;
      if (error) throw error;
      return data || [];
    },
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

  const handleSelectProvider = (providerId: string) => {
    const provider = savedProviders.find((p: any) => p.id === providerId);
    if (provider) {
      setForm(f => ({
        ...f,
        receiverName: provider.name || '',
        receiverPhone: provider.phone || '',
        email: provider.email || '',
      }));
      setSaveProvider(false); // Already saved
    }
  };


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
          invoiceNumber: form.invoiceNumber,
          providerEmail: form.email,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Payment initiated',
          description: data.message || 'Payment sent successfully',
        });

        // Auto-save provider if checkbox is checked
        if (saveProvider && form.receiverName) {
          const exists = savedProviders.some((p: any) =>
            p.name?.toLowerCase() === form.receiverName.toLowerCase() ||
            p.phone === form.receiverPhone
          );
          if (!exists) {
            await (supabase.from('service_providers') as any).insert({
              name: form.receiverName,
              phone: form.receiverPhone || null,
              email: form.email || null,
            });
            queryClient.invalidateQueries({ queryKey: ['saved-service-providers'] });
          }
        }

        setForm({ receiverPhone: '', receiverName: '', description: '', amount: '', withdrawCharge: '', notes: '', invoiceNumber: '', email: '' });
        setSaveProvider(true);
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
          setForm({ receiverPhone: '', receiverName: '', description: '', amount: '', withdrawCharge: '', notes: '', invoiceNumber: '', email: '' });
          setSaveProvider(true);
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to process payment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-payout-status', { body: {} });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['service-provider-payments'] });
      toast({
        title: 'Status check complete',
        description: `Checked: ${data?.checked || 0}, Completed: ${data?.completed || 0}, Failed: ${data?.failed || 0}`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to check statuses', variant: 'destructive' });
    } finally {
      setRechecking(false);
    }
  };

  const handleRetry = async (payment: any) => {
    if (!confirm(`Retry sending UGX ${Number(payment.amount).toLocaleString()} to ${payment.receiver_name || payment.receiver_phone}?`)) return;
    setRetryingId(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke('service-provider-payout', {
        body: {
          phone: payment.receiver_phone,
          amount: payment.amount,
          withdrawCharge: payment.withdraw_charge || 0,
          description: payment.service_description,
          receiverName: payment.receiver_name,
          initiatedBy: employee?.email || '',
          initiatedByName: employee?.name || '',
          notes: `Retry of failed payment ${payment.id}`,
        },
      });
      if (error) throw error;
      toast({ title: data?.success ? 'Retry sent' : 'Retry issue', description: data?.message || 'Check status', variant: data?.success ? 'default' : 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['service-provider-payments'] });
    } catch (err: any) {
      toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
    } finally {
      setRetryingId(null);
    }
  };

  const handleMarkAsPaid = async (payment: any) => {
    if (!confirm(`Mark UGX ${Number(payment.amount).toLocaleString()} to ${payment.receiver_name || payment.receiver_phone} as successfully paid?`)) return;
    setMarkingId(payment.id);
    try {
      const { error: updateError } = await supabase
        .from('service_provider_payments')
        .update({ yo_status: 'paid', updated_at: new Date().toISOString() } as any)
        .eq('id', payment.id);

      if (updateError) throw updateError;

      await supabase.from('audit_logs').insert({
        action: 'SERVICE_PROVIDER_MARK_PAID',
        table_name: 'service_provider_payments',
        record_id: payment.id,
        performed_by: employee?.email || 'admin',
        department: 'Admin',
        reason: `Manually marked service provider payment as paid - ${payment.receiver_name} UGX ${Number(payment.amount).toLocaleString()}`,
        record_data: { payment_id: payment.id, amount: payment.amount, receiver: payment.receiver_name, phone: payment.receiver_phone },
      });

      toast({ title: 'Marked as paid', description: `Payment to ${payment.receiver_name} marked as successful` });
      queryClient.invalidateQueries({ queryKey: ['service-provider-payments'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setMarkingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Sent</Badge>;
      case 'paid': return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Paid</Badge>;
      case 'pending_approval': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Pending Yo</Badge>;
      case 'pending': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Processing</Badge>;
      default: return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const formatAmount = (v: number) => `UGX ${Number(v).toLocaleString('en-UG')}`;

  const hasPending = payments.some((d: any) => d.yo_status === 'pending_approval');

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

        <div className="flex items-center gap-2">
          {hasPending && (
            <Button variant="outline" size="sm" onClick={handleRecheck} disabled={rechecking} className="gap-1">
              <RefreshCw className={`w-4 h-4 ${rechecking ? 'animate-spin' : ''}`} />
              {rechecking ? 'Checking...' : 'Re-check'}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Send className="w-4 h-4" /> Pay Service Provider
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" /> Pay Service Provider
              </DialogTitle>
              <DialogDescription>
                Enter service provider details to send payment via Mobile Money
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {savedProviders.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Select Saved Provider</Label>
                  <Select onValueChange={handleSelectProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a saved provider or enter new..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedProviders.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.phone ? `(${p.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="sp-receiverName">Provider Name *</Label>
                <Input
                  id="sp-receiverName"
                  placeholder="e.g. John's Transport Services"
                  value={form.receiverName}
                  onChange={(e) => { setForm(f => ({ ...f, receiverName: e.target.value })); setSaveProvider(true); }}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sp-invoiceNumber">Invoice Number</Label>
                  <Input
                    id="sp-invoiceNumber"
                    placeholder="e.g. INV-2026-001"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-email">Provider Email</Label>
                  <Input
                    id="sp-email"
                    type="email"
                    placeholder="e.g. provider@example.com"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-notes">Additional Notes</Label>
                <Input
                  id="sp-notes"
                  placeholder="Any additional notes"
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
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={saveProvider} onChange={(e) => setSaveProvider(e.target.checked)} className="rounded" />
                <UserPlus className="w-3.5 h-3.5" /> Save this provider for future payments
              </label>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2 w-full sm:w-auto">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Sending...' : 'Send Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      {d.yo_status !== 'success' && d.yo_status !== 'paid' && (
                        <div className="flex gap-1">
                          {(d.yo_status === 'failed' || d.yo_status === 'pending_approval') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(d)}
                              disabled={retryingId === d.id}
                              className="gap-1 text-xs"
                            >
                              {retryingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                              Retry
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsPaid(d)}
                            disabled={markingId === d.id}
                            className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          >
                            {markingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                            Mark Paid
                          </Button>
                        </div>
                      )}
                    </TableCell>
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
