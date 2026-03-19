import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, ArrowUpRight, ArrowDownLeft, Star, Briefcase, 
  Gift, Smartphone, Loader2, ChevronDown, TrendingUp, Minus, Printer, Send, RotateCcw, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  reference: string;
  metadata: any;
  created_at: string;
}

const ENTRY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; badgeClass: string }> = {
  LOYALTY_REWARD: { label: 'Loyalty Reward', icon: Star, color: 'text-amber-600', badgeClass: 'bg-amber-100 text-amber-800' },
  DEPOSIT: { label: 'Deposit', icon: Smartphone, color: 'text-green-600', badgeClass: 'bg-green-100 text-green-800' },
  WITHDRAWAL: { label: 'Withdrawal', icon: ArrowUpRight, color: 'text-red-600', badgeClass: 'bg-red-100 text-red-800' },
  BONUS: { label: 'Bonus', icon: Gift, color: 'text-purple-600', badgeClass: 'bg-purple-100 text-purple-800' },
  ADJUSTMENT: { label: 'Adjustment', icon: Minus, color: 'text-gray-600', badgeClass: 'bg-gray-100 text-gray-800' },
  LOAN_DISBURSEMENT: { label: 'Loan Disbursement', icon: Briefcase, color: 'text-blue-600', badgeClass: 'bg-blue-100 text-blue-800' },
  LOAN_REPAYMENT: { label: 'Loan Repayment', icon: ArrowUpRight, color: 'text-orange-600', badgeClass: 'bg-orange-100 text-orange-800' },
  LOAN_RECOVERY: { label: 'Loan Recovery (Wallet)', icon: ArrowUpRight, color: 'text-red-600', badgeClass: 'bg-red-100 text-red-800' },
};

const DEFAULT_CONFIG = { label: 'Transaction', icon: FileText, color: 'text-gray-600', badgeClass: 'bg-gray-100 text-gray-800' };

const getTransferMeta = (entry: LedgerEntry) => {
  const meta = entry.metadata ? (typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata) : null;
  if (meta?.type === 'wallet_transfer') return meta;
  return null;
};

interface TransactionStatementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  balanceBroughtForward?: number;
  thisMonthEarnings?: number;
}

export const TransactionStatement: React.FC<TransactionStatementProps> = ({ open, onOpenChange, currentBalance, balanceBroughtForward = 0, thisMonthEarnings = 0 }) => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(30);
  const [hasMore, setHasMore] = useState(true);
  const [reverseEntry, setReverseEntry] = useState<LedgerEntry | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const WALLET_TYPES = ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'];

  // Calculate running balances (oldest to newest, then reverse for display)
  const entriesWithBalance = React.useMemo(() => {
    if (entries.length === 0) return [];
    const chronological = [...entries].reverse();
    // Only wallet-affecting entries contribute to running balance
    const walletSum = chronological.filter(e => WALLET_TYPES.includes(e.entry_type)).reduce((s, e) => s + e.amount, 0);
    let runningBalance = currentBalance - walletSum;
    
    const withBalance = chronological.map(e => {
      const affectsWallet = WALLET_TYPES.includes(e.entry_type);
      if (affectsWallet) runningBalance += e.amount;
      return { ...e, runningBalance: affectsWallet ? runningBalance : null };
    });
    // Reverse back to newest-first for display
    return withBalance.reverse();
  }, [entries, currentBalance]);

  const printStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = entriesWithBalance.map(e => {
      const config = ENTRY_CONFIG[e.entry_type] || DEFAULT_CONFIG;
      const isCredit = e.amount > 0;
      const activityLabel = getActivityLabel(e);
      const transferMeta = getTransferMeta(e);
      
      let typeCol = `${getEntryLabel(e)}${activityLabel ? ' - ' + activityLabel : ''}`;
      // Add transfer details for print
      if (transferMeta) {
        if (e.amount < 0 && transferMeta.to_email) {
          typeCol += `<br/><span style="font-size:10px;color:#666">To: ${transferMeta.to_name} (${transferMeta.to_email})</span>`;
        } else if (e.amount > 0 && transferMeta.from_email) {
          typeCol += `<br/><span style="font-size:10px;color:#666">From: ${transferMeta.from_name} (${transferMeta.from_email})</span>`;
        }
      }
      
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${format(new Date(e.created_at), 'MMM dd, yyyy h:mm a')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${typeCol}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;color:${isCredit ? '#15803d' : '#b91c1c'};font-weight:600">${isCredit ? '+' : ''}${e.amount.toLocaleString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;font-weight:600">${(e as any).runningBalance != null ? (e as any).runningBalance.toLocaleString() : '—'}</td>
      </tr>`;
    }).join('');

    const content = `<!doctype html><html><head><meta charset="utf-8"/><title>Transaction Statement</title>
      <style>body{font:13px/1.5 system-ui;margin:0;padding:20px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:12px}@media print{.no-print{display:none}}</style>
    </head><body onload="window.print();">
      <div style="max-width:750px;margin:0 auto">
        <h2 style="margin:0 0 4px">Great Agro Coffee</h2>
        <h3 style="margin:0 0 16px;font-weight:normal;color:#555">Transaction Statement</h3>
        <div style="margin-bottom:12px;font-size:13px">
          <strong>Employee:</strong> ${employee?.name || user?.email || 'N/A'}<br/>
          <strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}<br/>
          <strong>Balance from last month:</strong> UGX ${Math.max(0, balanceBroughtForward).toLocaleString()}<br/>
          <strong>This month:</strong> UGX ${thisMonthEarnings.toLocaleString()}<br/>
          <strong>Current Balance:</strong> UGX ${currentBalance.toLocaleString()}
        </div>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th style="text-align:right">Amount (UGX)</th><th style="text-align:right">Balance (UGX)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;font-size:11px;color:#888">Printed on ${new Date().toLocaleString()}</div>
      </div>
    </body></html>`;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const fetchEntries = async (count: number) => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: user.email });
      const unifiedUserId = userIdData || user.id;

      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', unifiedUserId)
        .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'LOAN_RECOVERY'])
        .order('created_at', { ascending: false })
        .limit(count);

      if (error) throw error;
      const items = (data || []) as LedgerEntry[];
      setEntries(items);
      setHasMore(items.length === count);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseEntry || !reverseReason.trim()) return;
    setReversing(true);
    try {
      const { data, error } = await supabase.rpc('request_transfer_reversal', {
        p_ledger_entry_id: reverseEntry.id,
        p_reason: reverseReason.trim(),
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) throw new Error(result?.error || 'Request failed');
      toast({
        title: 'Reversal Requested',
        description: `Your request to reverse UGX ${result.amount?.toLocaleString()} (sent to ${result.receiver_name}) has been submitted for admin approval.`,
      });
      setReverseEntry(null);
      setReverseReason('');
    } catch (err: any) {
      toast({ title: 'Request Failed', description: err.message, variant: 'destructive' });
    } finally {
      setReversing(false);
    }
  };

  useEffect(() => {
    if (open) fetchEntries(limit);
  }, [open, user?.id, limit]);

  const getActivityLabel = (entry: LedgerEntry) => {
    const meta = entry.metadata ? (typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata) : null;
    
    // Wallet transfers - show recipient/sender details
    if (meta?.type === 'wallet_transfer') {
      if (entry.amount < 0) {
        return `to ${meta.to_name || meta.to_email || 'Unknown'}`;
      }
      return `from ${meta.from_name || meta.from_email || 'Unknown'}`;
    }
    
    if (entry.entry_type === 'LOYALTY_REWARD' && meta) {
      const activityMap: Record<string, string> = {
        form_submission: 'Form Submission',
        data_entry: 'Data Entry',
        report_generation: 'Report Generation',
        task_completion: 'Task Completion',
        page_visit: 'Page Visit',
        interaction: 'Interaction',
        document_upload: 'Document Upload',
        transaction: 'Transaction',
      };
      return activityMap[meta.activity_type] || meta.activity_type || '';
    }
    if (entry.entry_type === 'LOAN_DISBURSEMENT' && meta) {
      return meta.loan_type === 'long_term' ? 'Long-Term Loan' : 'Quick Loan';
    }
    // Detect loan disbursement stored as DEPOSIT
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'loan_disbursement' || entry.reference?.startsWith('LOAN-DISBURSE'))) {
      return meta?.duration_months ? `${meta.duration_months} month(s)` : '';
    }
    if (entry.entry_type === 'LOAN_REPAYMENT' && meta) {
      return meta.method === 'mobile_money' ? 'via MoMo' : meta.method || '';
    }
    // Detect loan-related wallet deductions
    if ((entry.entry_type === 'WITHDRAWAL' || entry.entry_type === 'ADJUSTMENT') && meta?.loan_id) {
      if (meta.source === 'guarantor' && meta.borrower) {
        const borrowerName = meta.description?.match(/for (.+?)['']s loan/)?.[1] || meta.borrower;
        return `Loan recovery for ${borrowerName}`;
      }
      const source = meta.source === 'wallet' ? 'Wallet Recovery' : meta.source === 'salary' ? 'Salary Recovery' : 'Loan Recovery';
      return source;
    }
    return '';
  };

  const getEntryLabel = (entry: LedgerEntry) => {
    const meta = entry.metadata ? (typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata) : null;
    const config = ENTRY_CONFIG[entry.entry_type] || DEFAULT_CONFIG;
    // Detect wallet transfers
    if (meta?.type === 'wallet_transfer') {
      if (entry.amount < 0) return '📤 Sent Money';
      return '📥 Received Money';
    }
    // Detect loan disbursement (stored as DEPOSIT with loan metadata)
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'loan_disbursement' || entry.reference?.startsWith('LOAN-DISBURSE'))) {
      return '💰 Loan Disbursement';
    }
    // Override label for loan-related wallet/adjustment entries
    if ((entry.entry_type === 'WITHDRAWAL' || entry.entry_type === 'ADJUSTMENT') && meta?.loan_id) {
      if (meta.source === 'guarantor' && meta.borrower) {
        const borrowerName = meta.description?.match(/for (.+?)['']s loan/)?.[1] || meta.borrower;
        return `Loan Recovery (${borrowerName})`;
      }
      return '🏦 Loan Recovery';
    }
    return config.label;
  };

  if (!open) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Transaction Statement
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={printStatement} disabled={entries.length === 0}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Hide
          </Button>
        </div>
      </div>

      <div className="text-sm space-y-0.5">
        <div className="flex justify-between text-muted-foreground">
          <span>Balance from last month:</span>
          <span className="font-medium text-foreground">UGX {Math.max(0, balanceBroughtForward).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>This month:</span>
          <span className={`font-medium ${thisMonthEarnings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {thisMonthEarnings >= 0 ? '+' : ''}UGX {thisMonthEarnings.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-1 mt-1">
          <span>Current balance:</span>
          <span>UGX {currentBalance.toLocaleString()}</span>
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No transactions yet
        </div>
      ) : (
        <div className="space-y-1.5">
          {entriesWithBalance.map((entry) => {
            const config = ENTRY_CONFIG[entry.entry_type] || DEFAULT_CONFIG;
            const isCredit = entry.amount > 0;
            const activityLabel = getActivityLabel(entry);
            const transferMeta = getTransferMeta(entry);
            const isTransferOut = transferMeta && entry.amount < 0;
            const isTransferIn = transferMeta && entry.amount > 0;
            const meta = entry.metadata ? (typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata) : null;
            const canReverse = isTransferOut && meta?.reversed !== 'true';
            const isReversed = meta?.reversed === 'true';

            return (
              <div key={entry.id} className={`flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${isReversed ? 'opacity-60' : ''}`}>
                <div className={`p-1.5 rounded-full ${isTransferOut ? 'bg-orange-100' : isTransferIn ? 'bg-blue-100' : isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                  {isTransferOut ? (
                    <Send className="h-3.5 w-3.5 text-orange-600" />
                  ) : isTransferIn ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-blue-600" />
                  ) : isCredit ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isTransferOut ? 'bg-orange-100 text-orange-800' : isTransferIn ? 'bg-blue-100 text-blue-800' : config.badgeClass}`}>
                      {getEntryLabel(entry)}
                    </Badge>
                    {activityLabel && (
                      <span className="text-[10px] text-muted-foreground">{activityLabel}</span>
                    )}
                    {isReversed && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-destructive/10 text-destructive">
                        REVERSED
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(entry.created_at), 'MMM dd, yyyy · h:mm a')}
                  </div>
                  {canReverse && (
                    <button
                      onClick={() => { setReverseEntry(entry); setReverseReason(''); }}
                      className="text-[10px] text-destructive hover:underline mt-0.5 flex items-center gap-0.5"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Reverse this transfer
                    </button>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-semibold ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                    {isCredit ? '+' : ''}{entry.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {entry.runningBalance != null ? `Bal: ${entry.runningBalance.toLocaleString()}` : 'Loan tx'}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setLimit(prev => prev + 30)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              Load More
            </Button>
          )}
        </div>
      )}

      {/* Reversal Confirmation Dialog */}
      <Dialog open={!!reverseEntry} onOpenChange={open => !open && setReverseEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Reverse Transfer
            </DialogTitle>
          </DialogHeader>
          {reverseEntry && (() => {
            const meta = reverseEntry.metadata ? (typeof reverseEntry.metadata === 'string' ? JSON.parse(reverseEntry.metadata) : reverseEntry.metadata) : null;
            return (
              <div className="space-y-4">
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-sm text-destructive">Request reversal</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your reversal request will be sent to an administrator for approval. Once approved, the money will be returned to your wallet and deducted from the recipient. Both parties will be notified via SMS.
                  </p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">UGX {Math.abs(reverseEntry.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent to:</span>
                    <span>{meta?.to_name || meta?.to_email || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(new Date(reverseEntry.created_at), 'MMM dd, yyyy h:mm a')}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Reason for reversal *</label>
                  <Textarea
                    placeholder="e.g. Sent to wrong person by mistake"
                    value={reverseReason}
                    onChange={e => setReverseReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseEntry(null)} disabled={reversing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={reversing || !reverseReason.trim()}
            >
              {reversing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Request Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};