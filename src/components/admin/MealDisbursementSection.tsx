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
import { UtensilsCrossed, Send, Loader2, Phone, DollarSign, RefreshCw } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

const MealDisbursementSection = () => {
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
  });

  const { data: disbursements = [], isLoading } = useQuery({
    queryKey: ['meal-disbursements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_disbursements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!form.receiverPhone || !form.amount || !form.description) {
      toast({ title: 'Missing fields', description: 'Phone, amount and description are required', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 500) {
      toast({ title: 'Invalid amount', description: 'Amount must be at least 500 UGX', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('meal-disbursement', {
        body: {
          phone: form.receiverPhone,
          amount: amount,
          withdrawCharge: parseFloat(form.withdrawCharge) || 0,
          description: form.description,
          receiverName: form.receiverName,
          initiatedBy: employee?.email || '',
          initiatedByName: employee?.name || '',
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Meal disbursement initiated',
          description: data.message || 'Payment sent successfully',
        });
        setForm({ receiverPhone: '', receiverName: '', description: '', amount: '', withdrawCharge: '' });
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['meal-disbursements'] });
      } else {
        toast({
          title: 'Payment issue',
          description: data?.message || 'Payment may have failed',
          variant: data?.status === 'pending_approval' ? 'default' : 'destructive',
        });
        queryClient.invalidateQueries({ queryKey: ['meal-disbursements'] });
        if (data?.status === 'pending_approval') {
          setOpen(false);
          setForm({ receiverPhone: '', receiverName: '', description: '', amount: '', withdrawCharge: '' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to process disbursement', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-payout-status', { body: {} });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['meal-disbursements'] });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Sent</Badge>;
      case 'pending_approval': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Pending Yo</Badge>;
      case 'pending': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Processing</Badge>;
      default: return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const formatAmount = (v: number) => `UGX ${Number(v).toLocaleString('en-UG')}`;

  const hasPending = disbursements.some((d: any) => d.yo_status === 'pending_approval');

  return (
    <Card className="card-modern">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Meal Plan Disbursements</CardTitle>
            <p className="text-sm text-muted-foreground">Send meal money to restaurant via Mobile Money</p>
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
                <Send className="w-4 h-4" /> Send Meal Money
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" /> Send Meal Allowance
              </DialogTitle>
              <DialogDescription>
                Enter receiver details to send meal money via Mobile Money
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="receiverName">Receiver Name</Label>
                <Input
                  id="receiverName"
                  placeholder="e.g. Restaurant Manager"
                  value={form.receiverName}
                  onChange={(e) => setForm(f => ({ ...f, receiverName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiverPhone">Receiver Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="receiverPhone"
                    placeholder="e.g. 0770123456"
                    className="pl-10"
                    value={form.receiverPhone}
                    onChange={(e) => setForm(f => ({ ...f, receiverPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="e.g. Lunch for 10 field staff members"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">Meal Amount (UGX) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="50000"
                      className="pl-10"
                      value={form.amount}
                      onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdrawCharge">Withdraw Charge (UGX)</Label>
                  <Input
                    id="withdrawCharge"
                    type="number"
                    placeholder="1500"
                    value={form.withdrawCharge}
                    onChange={(e) => setForm(f => ({ ...f, withdrawCharge: e.target.value }))}
                  />
                </div>
              </div>
              {form.amount && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Meal Amount:</span>
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
                {submitting ? 'Sending...' : 'Send Money'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : disbursements.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No meal disbursements yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Charge</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(d.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-medium">{d.receiver_name || '—'}</TableCell>
                    <TableCell className="text-sm">{d.receiver_phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{d.description}</TableCell>
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

export default MealDisbursementSection;
