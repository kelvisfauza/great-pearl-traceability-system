import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, TrendingDown, TrendingUp, RefreshCw, Plus, Minus, History, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const GosentepayBalanceMonitor: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('gosentepay_balance')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setBalance(data?.balance ?? 0);
    } catch (err) {
      console.error('Error fetching balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('gosentepay_balance_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  useEffect(() => {
    fetchBalance();

    const channel = supabase
      .channel('gosentepay-balance-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gosentepay_balance' }, () => fetchBalance())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdjust = async () => {
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) return;

    setAdjusting(true);
    try {
      const previousBalance = balance ?? 0;
      const change = adjustType === 'add' ? amount : -amount;
      const newBalance = previousBalance + change;

      // Update balance
      const { error: updateError } = await supabase
        .from('gosentepay_balance')
        .update({
          balance: newBalance,
          last_updated_by: employee?.name || employee?.email || 'Admin',
          last_transaction_type: adjustType === 'add' ? 'deposit' : 'manual_deduction',
          notes: adjustNotes || (adjustType === 'add' ? 'Manual top-up' : 'Manual deduction'),
          updated_at: new Date().toISOString()
        })
        .order('updated_at', { ascending: false })
        .limit(1);

      if (updateError) throw updateError;

      // Log the change
      await supabase.from('gosentepay_balance_log').insert({
        previous_balance: previousBalance,
        new_balance: newBalance,
        change_amount: change,
        change_type: adjustType === 'add' ? 'deposit' : 'manual_adjustment',
        notes: adjustNotes || (adjustType === 'add' ? 'Manual top-up' : 'Manual deduction'),
        created_by: employee?.name || employee?.email || 'Admin'
      });

      toast({
        title: adjustType === 'add' ? 'Balance Topped Up' : 'Balance Adjusted',
        description: `GosentePay balance updated to UGX ${newBalance.toLocaleString()}`,
      });

      setShowAdjustDialog(false);
      setAdjustAmount('');
      setAdjustNotes('');
      fetchBalance();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAdjusting(false);
    }
  };

  const isLowBalance = (balance ?? 0) < 100000;
  const isCriticalBalance = (balance ?? 0) < 50000;

  return (
    <>
      <Card className={`border-2 hover:shadow-lg transition-all ${isCriticalBalance ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : isLowBalance ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-3 rounded-xl ${isCriticalBalance ? 'bg-red-100 dark:bg-red-900' : isLowBalance ? 'bg-amber-100 dark:bg-amber-900' : 'bg-emerald-50 dark:bg-emerald-950'}`}>
                <Wallet className={`h-7 w-7 ${isCriticalBalance ? 'text-red-600' : isLowBalance ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">GosentePay Balance</p>
                {loading ? (
                  <span className="text-2xl font-bold">Loading...</span>
                ) : (
                  <span className={`text-2xl font-bold ${isCriticalBalance ? 'text-red-700' : isLowBalance ? 'text-amber-700' : ''}`}>
                    UGX {(balance ?? 0).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {isCriticalBalance && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />Critical
                </Badge>
              )}
              {isLowBalance && !isCriticalBalance && (
                <Badge className="bg-amber-100 text-amber-800 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />Low
                </Badge>
              )}
              {!isLowBalance && (
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">Healthy</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={fetchBalance}>
              <RefreshCw className="h-3 w-3 mr-1" />Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAdjustType('add'); setShowAdjustDialog(true); }}>
              <Plus className="h-3 w-3 mr-1" />Top Up
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAdjustType('deduct'); setShowAdjustDialog(true); }}>
              <Minus className="h-3 w-3 mr-1" />Deduct
            </Button>
            <Button size="sm" variant="outline" onClick={() => { fetchLogs(); setShowLogsDialog(true); }}>
              <History className="h-3 w-3 mr-1" />History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustType === 'add' ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
              {adjustType === 'add' ? 'Top Up GosentePay Balance' : 'Deduct from Balance'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold">UGX {(balance ?? 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount (UGX)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder={adjustType === 'add' ? 'e.g., Topped up from bank' : 'e.g., Manual correction'}
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                rows={2}
              />
            </div>
            {adjustAmount && Number(adjustAmount) > 0 && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">New Balance</p>
                <p className="text-xl font-bold">
                  UGX {((balance ?? 0) + (adjustType === 'add' ? Number(adjustAmount) : -Number(adjustAmount))).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAdjust}
              disabled={adjusting || !adjustAmount || Number(adjustAmount) <= 0}
              className={adjustType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {adjusting ? 'Processing...' : adjustType === 'add' ? 'Confirm Top Up' : 'Confirm Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Balance Change History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      {log.change_amount > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${log.change_amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {log.change_amount > 0 ? '+' : ''}UGX {log.change_amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.change_type} {log.reference ? `- ${log.reference}` : ''} {log.notes ? `(${log.notes})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.created_by} - {format(new Date(log.created_at), 'dd MMM HH:mm')}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Balance: UGX {log.new_balance.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GosentepayBalanceMonitor;
