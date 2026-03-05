import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowUpRight, ArrowDownLeft, Search, Loader2, Send, Star, Gift,
  Smartphone, Briefcase, Minus, FileText, RotateCcw, Filter, RefreshCw,
  AlertTriangle, ChevronDown, Printer
} from 'lucide-react';
import { format } from 'date-fns';

interface SystemLedgerEntry {
  id: string;
  user_id: string;
  entry_type: string;
  amount: number;
  reference: string;
  metadata: any;
  created_at: string;
  // joined
  employee_name?: string;
  employee_email?: string;
}

const ENTRY_LABELS: Record<string, { label: string; color: string }> = {
  LOYALTY_REWARD: { label: 'Loyalty Reward', color: 'bg-amber-100 text-amber-800' },
  DEPOSIT: { label: 'Deposit', color: 'bg-green-100 text-green-800' },
  WITHDRAWAL: { label: 'Withdrawal', color: 'bg-red-100 text-red-800' },
  BONUS: { label: 'Bonus', color: 'bg-purple-100 text-purple-800' },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-gray-100 text-gray-800' },
  LOAN_DISBURSEMENT: { label: 'Loan Disbursement', color: 'bg-blue-100 text-blue-800' },
  LOAN_REPAYMENT: { label: 'Loan Repayment', color: 'bg-orange-100 text-orange-800' },
  LOAN_RECOVERY: { label: 'Loan Recovery', color: 'bg-red-100 text-red-800' },
  DAILY_SALARY: { label: 'Daily Salary', color: 'bg-teal-100 text-teal-800' },
};

const SystemTransactions = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<SystemLedgerEntry[]>([]);
  const [employees, setEmployees] = useState<Record<string, { name: string; email: string }>>({});
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [reverseModal, setReverseModal] = useState<SystemLedgerEntry | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('name, email, auth_user_id');
    const map: Record<string, { name: string; email: string }> = {};
    (data || []).forEach(e => {
      if (e.auth_user_id) map[e.auth_user_id] = { name: e.name, email: e.email };
      // Also map by email for unified user id lookups
      map[e.email] = { name: e.name, email: e.email };
    });
    setEmployees(map);
    return map;
  };

  const fetchEntries = async (count: number) => {
    setLoading(true);
    try {
      let query = supabase
        .from('ledger_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(count);

      if (typeFilter !== 'all') {
        query = query.eq('entry_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data || []) as SystemLedgerEntry[]);
      setHasMore((data || []).length === count);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast({ title: 'Error loading transactions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchEntries(limit);
  }, [limit, typeFilter]);

  const getMeta = (entry: SystemLedgerEntry) => {
    if (!entry.metadata) return null;
    try {
      return typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata;
    } catch { return null; }
  };

  const getEmployeeInfo = (userId: string) => {
    return employees[userId] || null;
  };

  const getDisplayLabel = (entry: SystemLedgerEntry) => {
    const meta = getMeta(entry);
    if (meta?.type === 'wallet_transfer') {
      return entry.amount < 0 ? '📤 Sent Money' : '📥 Received Money';
    }
    if (meta?.type === 'transfer_reversal') {
      return '🔄 Transfer Reversal';
    }
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'loan_disbursement' || entry.reference?.startsWith('LOAN-DISBURSE'))) {
      return '💰 Loan Disbursement';
    }
    if ((entry.entry_type === 'WITHDRAWAL' || entry.entry_type === 'ADJUSTMENT') && meta?.loan_id) {
      return '🏦 Loan Recovery';
    }
    return ENTRY_LABELS[entry.entry_type]?.label || entry.entry_type;
  };

  const getTransferDetails = (entry: SystemLedgerEntry) => {
    const meta = getMeta(entry);
    if (!meta) return null;
    if (meta.type === 'wallet_transfer') {
      if (entry.amount < 0) {
        return { direction: 'to', name: meta.to_name, email: meta.to_email };
      }
      return { direction: 'from', name: meta.from_name, email: meta.from_email };
    }
    if (meta.type === 'transfer_reversal') {
      if (entry.amount > 0) {
        return { direction: 'refund from', name: meta.from_name, email: meta.from_email };
      }
      return { direction: 'deducted for', name: meta.to_name, email: meta.to_email };
    }
    return null;
  };

  const isReversible = (entry: SystemLedgerEntry) => {
    const meta = getMeta(entry);
    return meta?.type === 'wallet_transfer' && meta?.reversed !== 'true';
  };

  const handleReverse = async () => {
    if (!reverseModal || !reverseReason.trim()) return;
    setReversing(true);
    try {
      const { data, error } = await supabase.rpc('reverse_wallet_transfer', {
        p_ledger_entry_id: reverseModal.id,
        p_admin_reason: reverseReason.trim(),
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) throw new Error(result?.error || 'Reversal failed');

      toast({
        title: 'Transfer Reversed',
        description: `UGX ${result.amount?.toLocaleString()} reversed. ${result.sender_name} refunded, ${result.receiver_name} debited. Both notified via SMS.`,
      });
      setReverseModal(null);
      setReverseReason('');
      fetchEntries(limit);
    } catch (err: any) {
      toast({ title: 'Reversal Failed', description: err.message, variant: 'destructive' });
    } finally {
      setReversing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e => {
      const emp = getEmployeeInfo(e.user_id);
      const meta = getMeta(e);
      return (
        emp?.name?.toLowerCase().includes(q) ||
        emp?.email?.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q) ||
        meta?.to_name?.toLowerCase().includes(q) ||
        meta?.from_name?.toLowerCase().includes(q) ||
        meta?.to_email?.toLowerCase().includes(q) ||
        meta?.from_email?.toLowerCase().includes(q) ||
        getDisplayLabel(e).toLowerCase().includes(q)
      );
    });
  }, [entries, search, employees]);

  // Stats
  const stats = useMemo(() => {
    const transfers = entries.filter(e => getMeta(e)?.type === 'wallet_transfer');
    const transfersOut = transfers.filter(e => e.amount < 0);
    const totalTransferred = transfersOut.reduce((s, e) => s + Math.abs(e.amount), 0);
    const withdrawals = entries.filter(e => e.entry_type === 'WITHDRAWAL' && getMeta(e)?.type !== 'wallet_transfer' && getMeta(e)?.type !== 'transfer_reversal');
    const totalWithdrawn = withdrawals.reduce((s, e) => s + Math.abs(e.amount), 0);
    const reversals = entries.filter(e => getMeta(e)?.type === 'transfer_reversal' && e.amount > 0);
    const totalReversed = reversals.reduce((s, e) => s + e.amount, 0);
    return { transfers: transfersOut.length, totalTransferred, withdrawals: withdrawals.length, totalWithdrawn, reversals: reversals.length, totalReversed };
  }, [entries]);

  const printTransactions = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filtered.map(e => {
      const emp = getEmployeeInfo(e.user_id);
      const isCredit = e.amount > 0;
      const transfer = getTransferDetails(e);
      const meta = getMeta(e);
      let detail = getDisplayLabel(e);
      if (transfer) detail += ` (${transfer.direction} ${transfer.name || transfer.email || 'Unknown'})`;
      const reversed = meta?.reversed === 'true' ? ' [REVERSED]' : '';

      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px">${format(new Date(e.created_at), 'MMM dd, yyyy h:mm a')}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px">${emp?.name || e.user_id}<br/><span style="font-size:10px;color:#888">${emp?.email || ''}</span></td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px">${detail}${reversed}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;color:${isCredit ? '#15803d' : '#b91c1c'};font-weight:600">${isCredit ? '+' : ''}${e.amount.toLocaleString()}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:10px">${e.reference || ''}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>System Transactions</title>
      <style>body{font:12px/1.4 system-ui;margin:0;padding:20px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:6px 8px;border-bottom:2px solid #333;font-size:11px}@media print{.no-print{display:none}}</style>
    </head><body onload="window.print();">
      <div style="max-width:900px;margin:0 auto">
        <h2 style="margin:0 0 4px">Great Pearl Coffee</h2>
        <h3 style="margin:0 0 16px;font-weight:normal;color:#555">System Transactions Report</h3>
        <div style="margin-bottom:12px;font-size:12px">
          <strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}<br/>
          <strong>Total Records:</strong> ${filtered.length}
        </div>
        <table>
          <thead><tr><th>Date</th><th>User</th><th>Type</th><th style="text-align:right">Amount (UGX)</th><th>Reference</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;font-size:10px;color:#888">Printed on ${new Date().toLocaleString()}</div>
      </div>
    </body></html>`);
    printWindow.document.close();
  };

  if (!isAdmin()) {
    return (
      <Layout title="Access Denied" subtitle="Administrator access required">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="System Transactions" subtitle="Monitor all wallet transactions across the system">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <Send className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Transfers</p>
                <p className="text-xl font-bold">{stats.transfers}</p>
                <p className="text-xs text-muted-foreground">UGX {stats.totalTransferred.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Withdrawals</p>
                <p className="text-xl font-bold">{stats.withdrawals}</p>
                <p className="text-xs text-muted-foreground">UGX {stats.totalWithdrawn.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <RotateCcw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reversals</p>
                <p className="text-xl font-bold">{stats.reversals}</p>
                <p className="text-xs text-muted-foreground">UGX {stats.totalReversed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, reference..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="LOYALTY_REWARD">Loyalty Rewards</SelectItem>
                <SelectItem value="BONUS">Bonuses</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                <SelectItem value="LOAN_DISBURSEMENT">Loan Disbursements</SelectItem>
                <SelectItem value="LOAN_REPAYMENT">Loan Repayments</SelectItem>
                <SelectItem value="LOAN_RECOVERY">Loan Recoveries</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchEntries(limit)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={printTransactions} disabled={filtered.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Transactions ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && entries.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(entry => {
                const emp = getEmployeeInfo(entry.user_id);
                const isCredit = entry.amount > 0;
                const transfer = getTransferDetails(entry);
                const meta = getMeta(entry);
                const reversed = meta?.reversed === 'true';
                const canReverse = isReversible(entry);
                const labelConfig = ENTRY_LABELS[entry.entry_type] || { label: entry.entry_type, color: 'bg-gray-100 text-gray-800' };

                return (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${reversed ? 'opacity-60' : ''}`}
                  >
                    <div className={`p-1.5 rounded-full flex-shrink-0 mt-0.5 ${
                      meta?.type === 'wallet_transfer' ? (isCredit ? 'bg-blue-100' : 'bg-orange-100') :
                      meta?.type === 'transfer_reversal' ? 'bg-purple-100' :
                      isCredit ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {meta?.type === 'wallet_transfer' ? (
                        <Send className={`h-3.5 w-3.5 ${isCredit ? 'text-blue-600' : 'text-orange-600'}`} />
                      ) : meta?.type === 'transfer_reversal' ? (
                        <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
                      ) : isCredit ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{emp?.name || 'Unknown User'}</span>
                        <span className="text-[10px] text-muted-foreground">{emp?.email || entry.user_id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                          meta?.type === 'wallet_transfer' ? (isCredit ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800') :
                          meta?.type === 'transfer_reversal' ? 'bg-purple-100 text-purple-800' :
                          labelConfig.color
                        }`}>
                          {getDisplayLabel(entry)}
                        </Badge>
                        {transfer && (
                          <span className="text-[10px] text-muted-foreground">
                            {transfer.direction} {transfer.name || transfer.email}
                          </span>
                        )}
                        {reversed && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive">
                            REVERSED
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(entry.created_at), 'MMM dd, yyyy · h:mm a')}
                        {entry.reference && <span className="ml-2">Ref: {entry.reference}</span>}
                      </div>
                      {meta?.reason && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Reason: {meta.reason}
                        </div>
                      )}
                      {meta?.reversal_reason && (
                        <div className="text-[10px] text-destructive mt-0.5">
                          Reversal reason: {meta.reversal_reason}
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-semibold ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                        {isCredit ? '+' : ''}{entry.amount.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-muted-foreground">UGX</div>
                    </div>

                    {canReverse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 text-xs text-destructive hover:text-destructive"
                        onClick={() => { setReverseModal(entry); setReverseReason(''); }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Reverse
                      </Button>
                    )}
                  </div>
                );
              })}

              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => setLimit(prev => prev + 100)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  Load More
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reverse Transfer Modal */}
      <Dialog open={!!reverseModal} onOpenChange={open => !open && setReverseModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Reverse Wallet Transfer
            </DialogTitle>
          </DialogHeader>
          {reverseModal && (() => {
            const meta = getMeta(reverseModal);
            const emp = getEmployeeInfo(reverseModal.user_id);
            return (
              <div className="space-y-4">
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-sm text-destructive">This action cannot be undone</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reversing this transfer will refund the sender and debit the receiver. Both parties will be notified via SMS.
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">UGX {Math.abs(reverseModal.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User:</span>
                    <span>{emp?.name || 'Unknown'} ({emp?.email || reverseModal.user_id})</span>
                  </div>
                  {meta?.to_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sent to:</span>
                      <span>{meta.to_name} ({meta.to_email})</span>
                    </div>
                  )}
                  {meta?.from_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Received from:</span>
                      <span>{meta.from_name} ({meta.from_email})</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(new Date(reverseModal.created_at), 'MMM dd, yyyy h:mm a')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="text-[11px] font-mono">{reverseModal.reference}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Reason for reversal *</label>
                  <Textarea
                    placeholder="e.g. Employee sent to wrong person by mistake"
                    value={reverseReason}
                    onChange={e => setReverseReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseModal(null)} disabled={reversing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={reversing || !reverseReason.trim()}
            >
              {reversing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default SystemTransactions;
