import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, ArrowUpRight, ArrowDownLeft, Star, Briefcase, 
  Gift, Smartphone, Loader2, ChevronDown, TrendingUp, Minus, Printer
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

interface TransactionStatementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  balanceBroughtForward?: number;
  thisMonthEarnings?: number;
}

export const TransactionStatement: React.FC<TransactionStatementProps> = ({ open, onOpenChange, currentBalance, balanceBroughtForward = 0, thisMonthEarnings = 0 }) => {
  const { user, employee } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(30);
  const [hasMore, setHasMore] = useState(true);

  // Calculate running balances (oldest to newest, then reverse for display)
  const entriesWithBalance = React.useMemo(() => {
    if (entries.length === 0) return [];
    // entries are newest-first from DB; reverse to compute running balance from oldest
    const chronological = [...entries].reverse();
    // The balance after the last entry should equal currentBalance
    // So starting balance = currentBalance - sum(all entries)
    const totalSum = chronological.reduce((s, e) => s + e.amount, 0);
    let runningBalance = currentBalance - totalSum;
    
    const withBalance = chronological.map(e => {
      runningBalance += e.amount;
      return { ...e, runningBalance };
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
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${format(new Date(e.created_at), 'MMM dd, yyyy h:mm a')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${getEntryLabel(e)}${activityLabel ? ' - ' + activityLabel : ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;color:${isCredit ? '#15803d' : '#b91c1c'};font-weight:600">${isCredit ? '+' : ''}${e.amount.toLocaleString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;font-weight:600">${(e as any).runningBalance.toLocaleString()}</td>
      </tr>`;
    }).join('');

    const content = `<!doctype html><html><head><meta charset="utf-8"/><title>Transaction Statement</title>
      <style>body{font:13px/1.5 system-ui;margin:0;padding:20px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:12px}@media print{.no-print{display:none}}</style>
    </head><body onload="window.print();">
      <div style="max-width:750px;margin:0 auto">
        <h2 style="margin:0 0 4px">Great Pearl Coffee</h2>
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

  useEffect(() => {
    if (open) fetchEntries(limit);
  }, [open, user?.id, limit]);

  const getActivityLabel = (entry: LedgerEntry) => {
    const meta = entry.metadata ? (typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata) : null;
    
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
      const source = meta.source === 'wallet' ? 'Wallet Recovery' : meta.source === 'salary' ? 'Salary Recovery' : meta.source === 'guarantor' ? 'Guarantor Recovery' : 'Loan Recovery';
      return source;
    }
    return '';
  };

  const getEntryLabel = (entry: LedgerEntry) => {
    const meta = entry.metadata ? (typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata) : null;
    const config = ENTRY_CONFIG[entry.entry_type] || DEFAULT_CONFIG;
    // Detect loan disbursement (stored as DEPOSIT with loan metadata)
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'loan_disbursement' || entry.reference?.startsWith('LOAN-DISBURSE'))) {
      return '💰 Loan Disbursement';
    }
    // Override label for loan-related wallet/adjustment entries
    if ((entry.entry_type === 'WITHDRAWAL' || entry.entry_type === 'ADJUSTMENT') && meta?.loan_id) {
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

            return (
              <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className={`p-1.5 rounded-full ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                  {isCredit ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.badgeClass}`}>
                      {getEntryLabel(entry)}
                    </Badge>
                    {activityLabel && (
                      <span className="text-[10px] text-muted-foreground">{activityLabel}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(entry.created_at), 'MMM dd, yyyy · h:mm a')}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-semibold ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                    {isCredit ? '+' : ''}{entry.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Bal: {entry.runningBalance.toLocaleString()}
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
    </div>
  );
};