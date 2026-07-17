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
import { Truck, Send, Loader2, Phone, DollarSign, RefreshCw, RotateCcw, CheckCheck, UserPlus, Users, Printer, Receipt, Smartphone, Banknote, Search } from 'lucide-react';
import { sendPaymentReceipt } from '@/utils/sendPaymentReceipt';
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
  const [search, setSearch] = useState('');
  const [receiptingId, setReceiptingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'failed'>('all');

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
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'cash'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState<'yo' | 'gosente'>('yo');

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
        .order('created_at', { ascending: false });
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
      // Cash payment: record directly without calling Yo edge function
      if (paymentMethod === 'cash') {
        const charge = parseFloat(form.withdrawCharge) || 0;
        const { error: insertError } = await (supabase.from('service_provider_payments') as any).insert({
          receiver_phone: form.receiverPhone,
          receiver_name: form.receiverName,
          service_description: form.description,
          amount: amount,
          withdraw_charge: charge,
          total_amount: amount + charge,
          notes: form.notes,
          initiated_by: employee?.email || '',
          initiated_by_name: employee?.name || '',
          yo_status: 'paid',
          payment_method: 'cash',
        });
        if (insertError) throw insertError;

        toast({ title: 'Cash payment recorded', description: `UGX ${amount.toLocaleString()} cash payment to ${form.receiverName || form.receiverPhone} logged.` });

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
        setPaymentMethod('mobile_money');
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['service-provider-payments'] });
        return;
      }

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
          paymentMethod: 'mobile_money',
          paymentProvider,
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
    const ageHours = (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60);
    if (ageHours > 2) {
      toast({
        title: 'Retry not allowed',
        description: 'This transaction is older than 2 hours and is considered permanently failed. Use Mark Paid if it was settled outside the system.',
        variant: 'destructive',
      });
      return;
    }
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

  const handleSendReceipt = async (payment: any) => {
    setReceiptingId(payment.id);
    try {
      const provider = savedProviders.find((p: any) => p.phone === payment.receiver_phone || p.name === payment.receiver_name);
      const result = await sendPaymentReceipt({
        paymentType: 'service-provider',
        paidTo: {
          name: payment.receiver_name || 'Service Provider',
          phone: payment.receiver_phone,
          email: provider?.email || payment.provider_email || undefined,
        },
        description: payment.service_description || 'Service payment',
        invoiceNumber: payment.invoice_number || undefined,
        amount: Number(payment.amount || 0),
        charges: Number(payment.withdraw_charge || 0),
        total: Number(payment.total_amount || (Number(payment.amount || 0) + Number(payment.withdraw_charge || 0))),
        paymentMethod: 'Mobile Money',
        transactionId: payment.yo_transaction_reference || payment.id,
        paidOn: payment.updated_at || payment.created_at,
        processedBy: payment.initiated_by_name || employee?.name || 'Finance Team',
        processedByEmail: payment.initiated_by || employee?.email,
        notes: payment.notes || undefined,
      });
      if (result.ok) {
        const channels = [result.emailSent && 'email', result.smsSent && 'SMS'].filter(Boolean).join(' & ') || 'PDF only';
        toast({ title: 'Receipt sent', description: `${result.reference} delivered via ${channels}.` });
      } else {
        toast({ title: 'Receipt failed', description: result.errors.join('; ') || 'No channel available', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Receipt error', description: err.message, variant: 'destructive' });
    } finally {
      setReceiptingId(null);
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

  const getPeriodRange = (): { from: Date | null; to: Date | null; label: string } => {
    const now = new Date();
    if (period === 'today') {
      const from = new Date(now); from.setHours(0, 0, 0, 0);
      return { from, to: null, label: 'Today' };
    }
    if (period === 'week') {
      const from = new Date(now); const day = from.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      from.setDate(from.getDate() + diff); from.setHours(0, 0, 0, 0);
      return { from, to: null, label: 'This Week' };
    }
    if (period === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: null, label: now.toLocaleString('en-UG', { month: 'long', year: 'numeric' }) };
    }
    if (period === 'year') {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: null, label: String(now.getFullYear()) };
    }
    if (period === 'custom' && (customFrom || customTo)) {
      const from = customFrom ? new Date(customFrom + 'T00:00:00') : null;
      const to = customTo ? new Date(customTo + 'T23:59:59') : null;
      return { from, to, label: `${customFrom || '…'} → ${customTo || '…'}` };
    }
    return { from: null, to: null, label: 'All Time' };
  };

  const inRange = (createdAt: string) => {
    const { from, to } = getPeriodRange();
    const t = new Date(createdAt).getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  };

  const periodFiltered = payments.filter((d: any) => inRange(d.created_at));

  const isPaid = (d: any) => d.yo_status === 'success' || d.yo_status === 'paid';
  const isFailed = (d: any) => !isPaid(d) && d.yo_status !== 'pending' && d.yo_status !== 'pending_approval';
  const paidRecords = periodFiltered.filter(isPaid);
  const failedRecords = periodFiltered.filter(isFailed);
  const statusFiltered = statusFilter === 'paid'
    ? paidRecords
    : statusFilter === 'failed'
      ? failedRecords
      : periodFiltered;

  const term = search.trim().toLowerCase();
  const visiblePayments = term
    ? statusFiltered.filter((d: any) =>
        (d.receiver_name || '').toLowerCase().includes(term) ||
        (d.receiver_phone || '').toLowerCase().includes(term) ||
        (d.service_description || '').toLowerCase().includes(term) ||
        (d.initiated_by_name || '').toLowerCase().includes(term) ||
        (d.invoice_number || '').toLowerCase().includes(term)
      )
    : statusFiltered;

  const handlePrint = () => {
    const range = getPeriodRange();
    const sectionsToPrint: Array<{ title: string; data: any[] }> = [];
    if (statusFilter === 'paid') {
      sectionsToPrint.push({ title: 'Paid / Successful', data: paidRecords });
    } else if (statusFilter === 'failed') {
      sectionsToPrint.push({ title: 'Failed', data: failedRecords });
    } else {
      sectionsToPrint.push({ title: 'Paid / Successful', data: paidRecords });
      sectionsToPrint.push({ title: 'Failed', data: failedRecords });
    }
    const totalsOf = (arr: any[]) => arr.reduce((acc: any, d: any) => {
      acc.amount += Number(d.amount || 0);
      acc.charge += Number(d.withdraw_charge || 0);
      acc.total += Number(d.total_amount || 0);
      return acc;
    }, { amount: 0, charge: 0, total: 0 });
    const renderSection = (title: string, data: any[]) => {
      const t = totalsOf(data);
      const rows = data.length ? data.map((d: any) => `
        <tr>
          <td>${new Date(d.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td>${d.receiver_name || '—'}</td>
          <td>${d.receiver_phone || ''}</td>
          <td>${d.service_description || ''}</td>
          <td>${d.payment_method === 'cash' ? 'Cash' : 'Yo (MoMo)'}</td>
          <td style="text-align:right">${formatAmount(d.amount)}</td>
          <td style="text-align:right">${formatAmount(d.withdraw_charge)}</td>
          <td style="text-align:right">${formatAmount(d.total_amount)}</td>
          <td>${d.yo_status || ''}</td>
          <td>${d.initiated_by_name || ''}</td>
        </tr>`).join('') : `<tr><td colspan="10" style="text-align:center;color:#888">No records in this category</td></tr>`;
      return `
        <h2 style="margin:20px 0 6px;font-size:15px">${title} <span style="color:#666;font-weight:normal">(${data.length})</span></h2>
        <table><thead><tr>
          <th>Date</th><th>Provider</th><th>Phone</th><th>Service</th>
          <th>Method</th><th>Amount</th><th>Charge</th><th>Total</th><th>Status</th><th>Initiated By</th>
        </tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5" style="text-align:right">SUBTOTAL</td>
          <td style="text-align:right">${formatAmount(t.amount)}</td>
          <td style="text-align:right">${formatAmount(t.charge)}</td>
          <td style="text-align:right">${formatAmount(t.total)}</td>
          <td colspan="2"></td></tr></tfoot></table>`;
    };
    const combined = sectionsToPrint.reduce((a, s) => {
      const t = totalsOf(s.data);
      a.amount += t.amount; a.charge += t.charge; a.total += t.total; a.count += s.data.length;
      return a;
    }, { amount: 0, charge: 0, total: 0, count: 0 });
    const html = `<!doctype html><html><head><title>Service Provider Payments Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px}h2{border-bottom:2px solid #333;padding-bottom:4px}small{color:#666}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f3f4f6}tfoot td{font-weight:bold;background:#fafafa}
      .grand{margin-top:18px;padding:10px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;font-size:13px}</style></head><body>
      <h1>Service Provider Payments Report</h1>
      <small>Period: <strong>${range.label}</strong> • Generated ${new Date().toLocaleString('en-UG')} • ${combined.count} record(s)</small>
      ${sectionsToPrint.map(s => renderSection(s.title, s.data)).join('')}
      ${sectionsToPrint.length > 1 ? `<div class="grand"><strong>GRAND TOTAL:</strong> Amount ${formatAmount(combined.amount)} • Charge ${formatAmount(combined.charge)} • Total ${formatAmount(combined.total)}</div>` : ''}
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=1024,height=768');
    if (w) { w.document.write(html); w.document.close(); }
  };

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
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="failed">Failed Only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={payments.length === 0} className="gap-1">
            <Printer className="w-4 h-4" /> Print
          </Button>
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
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      paymentMethod === 'mobile_money'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <Smartphone className={`w-5 h-5 ${paymentMethod === 'mobile_money' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-left">
                      <p className="text-sm font-medium">Mobile Money</p>
                      <p className="text-xs text-muted-foreground">Yo Payments</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <Banknote className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-left">
                      <p className="text-sm font-medium">Cash</p>
                      <p className="text-xs text-muted-foreground">Paid in person</p>
                    </div>
                  </button>
                </div>
              </div>
              {paymentMethod === 'mobile_money' && (
                <div className="space-y-2">
                  <Label>Mobile Money Provider *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentProvider('yo')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        paymentProvider === 'yo'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 ${paymentProvider === 'yo' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-left">
                        <p className="text-sm font-medium">Yo Payments</p>
                        <p className="text-xs text-muted-foreground">MTN / Airtel via Yo</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentProvider('gosente')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        paymentProvider === 'gosente'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 ${paymentProvider === 'gosente' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-left">
                        <p className="text-sm font-medium">GosentePay</p>
                        <p className="text-xs text-muted-foreground">MTN / Airtel via Gosente</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
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
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : paymentMethod === 'cash' ? <Banknote className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {submitting
                  ? (paymentMethod === 'cash' ? 'Recording...' : 'Sending...')
                  : paymentMethod === 'cash'
                    ? 'Record Cash Payment'
                    : `Send via ${paymentProvider === 'gosente' ? 'GosentePay' : 'Yo'}`}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <p className="text-sm text-muted-foreground">
                {getPeriodRange().label} — {periodFiltered.length} record(s) • <span className="text-green-700">Paid: {paidRecords.length}</span> • <span className="text-red-700">Failed: {failedRecords.length}</span>
              </p>
              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 text-sm w-[150px]" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 text-sm w-[150px]" />
                </div>
              )}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter payments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Charge</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePayments.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(d.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-medium">{d.receiver_name || '—'}</TableCell>
                    <TableCell className="text-sm">{d.receiver_phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{d.service_description}</TableCell>
                    <TableCell>
                      {d.payment_method === 'cash' ? (
                        <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
                          <Banknote className="h-3 w-3" /> Cash
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-blue-300 text-blue-700 dark:text-blue-400">
                          <Smartphone className="h-3 w-3" /> Yo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatAmount(d.amount)}</TableCell>
                    <TableCell className="text-right text-sm">{formatAmount(d.withdraw_charge)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatAmount(d.total_amount)}</TableCell>
                    <TableCell>{getStatusBadge(d.yo_status)}</TableCell>
                    <TableCell className="text-sm">{d.initiated_by_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {d.yo_status !== 'success' && d.yo_status !== 'paid' && (
                          <>
                            {(d.yo_status === 'failed' || d.yo_status === 'pending_approval') && ((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60) <= 2) && (
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
                          </>
                        )}
                        {(d.yo_status === 'success' || d.yo_status === 'paid') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendReceipt(d)}
                            disabled={receiptingId === d.id}
                            className="gap-1 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                          >
                            {receiptingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
                            Send Receipt
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-2 py-3 text-sm text-muted-foreground">
              <span>Showing {visiblePayments.length} of {payments.length} total payments</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceProviderPayments;
