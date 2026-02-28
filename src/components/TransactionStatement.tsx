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
  Gift, Smartphone, Loader2, ChevronDown, TrendingUp, Minus
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
  DAILY_SALARY: { label: 'Daily Salary', icon: Briefcase, color: 'text-blue-600', badgeClass: 'bg-blue-100 text-blue-800' },
  LOYALTY_REWARD: { label: 'Loyalty Reward', icon: Star, color: 'text-amber-600', badgeClass: 'bg-amber-100 text-amber-800' },
  DEPOSIT: { label: 'Deposit', icon: Smartphone, color: 'text-green-600', badgeClass: 'bg-green-100 text-green-800' },
  WITHDRAWAL: { label: 'Withdrawal', icon: ArrowUpRight, color: 'text-red-600', badgeClass: 'bg-red-100 text-red-800' },
  BONUS: { label: 'Bonus', icon: Gift, color: 'text-purple-600', badgeClass: 'bg-purple-100 text-purple-800' },
  ADJUSTMENT: { label: 'Adjustment', icon: Minus, color: 'text-gray-600', badgeClass: 'bg-gray-100 text-gray-800' },
  LOAN_DISBURSEMENT: { label: 'Loan', icon: TrendingUp, color: 'text-teal-600', badgeClass: 'bg-teal-100 text-teal-800' },
  LOAN_REPAYMENT: { label: 'Loan Repayment', icon: ArrowUpRight, color: 'text-orange-600', badgeClass: 'bg-orange-100 text-orange-800' },
};

const DEFAULT_CONFIG = { label: 'Transaction', icon: FileText, color: 'text-gray-600', badgeClass: 'bg-gray-100 text-gray-800' };

interface TransactionStatementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
}

export const TransactionStatement: React.FC<TransactionStatementProps> = ({ open, onOpenChange, currentBalance }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(30);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = async (count: number) => {
    if (!user?.email) return;
    setLoading(true);
    try {
      // Get unified user ID
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: user.email });
      const unifiedUserId = userIdData || user.id;

      // Only show entries that contribute to loyalty wallet balance shown at the top
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', unifiedUserId)
        .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'])
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
    if (entry.entry_type === 'LOYALTY_REWARD' && entry.metadata) {
      const meta = typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata;
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
    return '';
  };

  if (!open) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Transaction Statement
        </h3>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          Hide
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Current balance: <span className="font-semibold text-foreground">UGX {currentBalance.toLocaleString()}</span>
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
          {entries.map((entry) => {
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
                      {config.label}
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
