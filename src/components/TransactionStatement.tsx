import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, ArrowUpRight, ArrowDownLeft, Star, Briefcase, 
  Gift, Smartphone, Loader2, ChevronDown, TrendingUp, Minus, Printer, Send, RotateCcw, AlertTriangle, Mail, Calendar, CheckCircle2
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
  DEPOSIT: { label: 'Credit', icon: Smartphone, color: 'text-green-600', badgeClass: 'bg-green-100 text-green-800' },
  WITHDRAWAL: { label: 'Withdrawal', icon: ArrowUpRight, color: 'text-red-600', badgeClass: 'bg-red-100 text-red-800' },
  BONUS: { label: 'Bonus', icon: Gift, color: 'text-purple-600', badgeClass: 'bg-purple-100 text-purple-800' },
  ADJUSTMENT: { label: 'Adjustment', icon: Minus, color: 'text-gray-600', badgeClass: 'bg-gray-100 text-gray-800' },
  REVERSAL: { label: 'Reversal', icon: RotateCcw, color: 'text-emerald-600', badgeClass: 'bg-emerald-100 text-emerald-800' },
  LOAN_DISBURSEMENT: { label: 'Loan Disbursement', icon: Briefcase, color: 'text-blue-600', badgeClass: 'bg-blue-100 text-blue-800' },
  LOAN_REPAYMENT: { label: 'Loan Repayment', icon: ArrowUpRight, color: 'text-orange-600', badgeClass: 'bg-orange-100 text-orange-800' },
  LOAN_RECOVERY: { label: 'Loan Recovery (Wallet)', icon: ArrowUpRight, color: 'text-red-600', badgeClass: 'bg-red-100 text-red-800' },
  MONTHLY_SALARY: { label: 'Monthly Salary', icon: Briefcase, color: 'text-green-700', badgeClass: 'bg-green-100 text-green-800' },
  ADVANCE_RECOVERY: { label: 'Salary Advance Recovery', icon: ArrowUpRight, color: 'text-orange-700', badgeClass: 'bg-orange-100 text-orange-800' },
  HOST_MEETING_BONUS: { label: 'Meeting Host Bonus', icon: Gift, color: 'text-emerald-700', badgeClass: 'bg-emerald-100 text-emerald-800' },
  MEETING_ATTENDANCE_BONUS: { label: 'Meeting Attendance Bonus', icon: Gift, color: 'text-emerald-600', badgeClass: 'bg-emerald-100 text-emerald-800' },
};

const DEFAULT_CONFIG = { label: 'Transaction', icon: FileText, color: 'text-gray-600', badgeClass: 'bg-gray-100 text-gray-800' };

const CANONICAL_WALLET_TYPES = ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'REVERSAL', 'MONTHLY_SALARY', 'ADVANCE_RECOVERY', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'LOAN_RECOVERY', 'HOST_MEETING_BONUS', 'MEETING_ATTENDANCE_BONUS'];

const parseMetadata = (metadata: unknown) => {
  if (!metadata) return null;
  return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
};

const getTransferMeta = (entry: LedgerEntry) => {
  const meta = parseMetadata(entry.metadata);
  if (meta?.type === 'wallet_transfer' || meta?.type === 'internal_transfer_credit') return meta;
  return null;
};

const isDirectAllowancePayout = (entry: Pick<LedgerEntry, 'entry_type' | 'metadata'>) => {
  const meta = parseMetadata(entry.metadata);
  return ['airtime_allowance', 'data_allowance'].includes(meta?.allowance_type)
    && ['DEPOSIT', 'PAYOUT'].includes(entry.entry_type);
};

interface TransactionStatementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  spendableBalance?: number;
  balanceBroughtForward?: number;
  thisMonthEarnings?: number;
}

const DISPLAY_LIMIT = 10;
export const TransactionStatement: React.FC<TransactionStatementProps> = ({ open, onOpenChange, currentBalance, spendableBalance, balanceBroughtForward = 0, thisMonthEarnings = 0 }) => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverseEntry, setReverseEntry] = useState<LedgerEntry | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);
  
  // Email statement state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const entriesWithBalance = React.useMemo(() => {
    if (entries.length === 0) return [];
    const chronological = [...entries].reverse();
    const walletSum = chronological.filter(e => CANONICAL_WALLET_TYPES.includes(e.entry_type)).reduce((s, e) => s + e.amount, 0);
    let runningBalance = currentBalance - walletSum;
    
    const withBalance = chronological.map(e => {
      const affectsWallet = CANONICAL_WALLET_TYPES.includes(e.entry_type);
      if (affectsWallet) runningBalance += e.amount;
      return { ...e, runningBalance: affectsWallet ? runningBalance : null };
    });
    return withBalance.reverse();
  }, [entries, currentBalance]);

  const printStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = entriesWithBalance.map(e => {
      const activityLabel = getActivityLabel(e);
      const transferMeta = getTransferMeta(e);
      const isCredit = e.amount > 0;
      
      let typeCol = `${getEntryLabel(e)}${activityLabel ? ' - ' + activityLabel : ''}`;
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
          <strong>Balance from last month:</strong> UGX ${balanceBroughtForward.toLocaleString()}<br/>
          <strong>This month:</strong> UGX ${thisMonthEarnings.toLocaleString()}<br/>
          <strong>Wallet Balance:</strong> UGX ${currentBalance.toLocaleString()}${spendableBalance != null ? `<br/><strong>Available to spend:</strong> UGX ${spendableBalance.toLocaleString()}` : ''}
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

  const fetchEntries = async () => {
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
        .in('entry_type', CANONICAL_WALLET_TYPES)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      const filteredEntries = ((data || []) as LedgerEntry[]).filter((entry) => !isDirectAllowancePayout(entry));
      setTotalCount(filteredEntries.length);
      setEntries(filteredEntries.slice(0, DISPLAY_LIMIT));
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  // Statement fee temporarily waived for a 2-hour free window during reconciliation.
  // After this timestamp, the normal fee resumes.
  const FREE_UNTIL = new Date('2026-05-18T09:15:00Z');
  const isFreeWindow = new Date() < FREE_UNTIL;
  const STATEMENT_FEE = isFreeWindow ? 0 : 500;

  const handleSendStatement = async () => {
    if (!user?.email || !dateFrom || !dateTo) return;
    setSendingEmail(true);
    try {
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: user.email });
      const unifiedUserId = userIdData || user.id;

      // Statement fee waived — no ledger charge
      const statementRef = `STMT-FREE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const periodStart = `${dateFrom}T00:00:00`;
      const periodEnd = `${dateTo}T23:59:59`;

      // 2a. Fetch entries WITHIN the selected period (high limit so we don't hit the default 1000-row cap)
      const { data: periodEntries, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', unifiedUserId)
        .in('entry_type', CANONICAL_WALLET_TYPES)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd)
        .order('created_at', { ascending: true })
        .limit(10000);

      if (error) throw error;

      // 2b. Compute opening balance from ALL wallet entries strictly before the period.
      // Paginate to avoid the 1000-row cap for high-activity accounts.
      let runBal = 0;
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data: page, error: openErr } = await supabase
          .from('ledger_entries')
          .select('amount, entry_type, metadata')
          .eq('user_id', unifiedUserId)
          .in('entry_type', CANONICAL_WALLET_TYPES)
          .lt('created_at', periodStart)
          .order('created_at', { ascending: true })
          .range(from, from + PAGE - 1);
        if (openErr) throw openErr;
        const rows = (page || []) as any[];
        for (const r of rows) {
          if (!isDirectAllowancePayout(r as any)) runBal += Number(r.amount) || 0;
        }
        if (rows.length < PAGE) break;
        from += PAGE;
      }

      const fetchedEntries = ((periodEntries || []) as LedgerEntry[]).filter((entry) => !isDirectAllowancePayout(entry));
      
      const transactionsAsc = fetchedEntries.map(e => {
        const affectsWallet = CANONICAL_WALLET_TYPES.includes(e.entry_type);
        if (affectsWallet) runBal += e.amount;
        const meta = parseMetadata(e.metadata);
        const typeLabel = (e.entry_type === 'WITHDRAWAL' && meta?.source === 'statement_fee') 
          ? '📄 Transaction Charge' 
          : getEntryLabel(e);
        return {
          date: format(new Date(e.created_at), 'MMM dd, yyyy h:mm a'),
          type: typeLabel,
          description: (e.entry_type === 'WITHDRAWAL' && meta?.source === 'statement_fee') 
            ? 'Statement Charge' 
            : (getActivityLabel(e) || '-'),
          amount: e.amount,
          balance: affectsWallet ? runBal : null,
        };
      });

      // Reverse so most recent transactions appear on top
      const transactions = [...transactionsAsc].reverse();

      const closingBalance = transactionsAsc.length > 0
        ? (transactionsAsc[transactionsAsc.length - 1].balance ?? runBal)
        : runBal;

      const periodFrom = format(new Date(dateFrom), 'MMM dd, yyyy');
      const periodTo = format(new Date(dateTo), 'MMM dd, yyyy');
      const empName = employee?.name || user.email || 'Employee';

      // 3. Generate PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 86, 50); // brand green
      doc.text('Great Agro Coffee', margin, y);
      y += 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Transaction Statement', margin, y);
      y += 10;

      // Separator line
      doc.setDrawColor(200);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Employee info
      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(empName, margin + 25, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Period:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${periodFrom} - ${periodTo}`, margin + 25, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Balance at end of period:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`UGX ${closingBalance.toLocaleString()}`, margin + 35, y);
      y += 5;
      if (spendableBalance != null) {
        doc.setFont('helvetica', 'bold');
        doc.text('Available to spend:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`UGX ${spendableBalance.toLocaleString()}`, margin + 35, y);
        y += 5;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Statement Charge:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`UGX ${STATEMENT_FEE.toLocaleString()}`, margin + 38, y);
      y += 8;

      // Table header
      const cols = [margin, margin + 40, margin + 75, margin + 115, pageW - margin - 25];
      const colLabels = ['Date', 'Type', 'Description', 'Amount (UGX)', 'Balance (UGX)'];
      doc.setFillColor(26, 86, 50);
      doc.rect(margin, y - 4, pageW - 2 * margin, 7, 'F');
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      colLabels.forEach((label, i) => {
        const x = i >= 3 ? cols[i] : cols[i];
        doc.text(label, x, y);
      });
      y += 6;

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      transactions.forEach((tx, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        // Alternate row bg
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y - 3.5, pageW - 2 * margin, 5.5, 'F');
        }
        doc.setTextColor(50);
        // Strip emojis for PDF
        const cleanType = tx.type.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📄|📤|📥|📶|📱|💵|📋|🏆|🎂|📲|💰|🏦|🎁/gu, '').trim();
        doc.text(tx.date.split(',')[0] || tx.date, cols[0], y);
        doc.text(cleanType.substring(0, 20), cols[1], y);
        doc.text((tx.description || '-').substring(0, 22), cols[2], y);
        
        // Amount color
        if (tx.amount >= 0) {
          doc.setTextColor(21, 128, 61); // green
        } else {
          doc.setTextColor(185, 28, 28); // red
        }
        const amtStr = `${tx.amount >= 0 ? '+' : ''}${tx.amount.toLocaleString()}`;
        doc.text(amtStr, cols[3], y);
        
        doc.setTextColor(50);
        doc.text(tx.balance != null ? tx.balance.toLocaleString() : '-', cols[4], y);
        y += 5.5;
      });

      // Footer
      y += 5;
      doc.setDrawColor(200);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy h:mm a')} | For questions: operations@greatpearlcoffee.com`, margin, y);

      // 4. Upload PDF to Supabase Storage
      const pdfBlob = doc.output('blob');
      const fileName = `${unifiedUserId}/${format(new Date(), 'yyyyMMdd-HHmmss')}-statement.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf' });
      
      if (uploadError) throw uploadError;

      const { data: signed, error: signedErr } = await supabase.storage
        .from('statements')
        .createSignedUrl(fileName, 60 * 60 * 24 * 30);
      if (signedErr) throw signedErr;
      const downloadUrl = signed?.signedUrl || '';

      // 5. Send email with PDF download link
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'transaction-statement',
          recipientEmail: user.email,
          idempotencyKey: `statement-${user.id}-${dateFrom}-${dateTo}-${Date.now()}`,
          templateData: {
            employeeName: empName,
            periodFrom,
            periodTo,
            currentBalance: closingBalance,
            transactions,
            pdfDownloadUrl: downloadUrl,
            statementFee: STATEMENT_FEE,
          },
        },
      });

      setEmailSent(true);
      toast({
        title: 'Statement Sent',
        description: `PDF statement sent to ${user.email}. No fee charged.`,
      });

      fetchEntries();
    } catch (err: any) {
      console.error('Error sending statement:', err);
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
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
    if (open) fetchEntries();
  }, [open, user?.id]);

  const getActivityLabel = (entry: LedgerEntry) => {
    const meta = parseMetadata(entry.metadata);
    
    if (meta?.type === 'wallet_transfer' || meta?.type === 'internal_transfer_credit') {
      if (entry.amount < 0) return `to ${meta.to_name || meta.to_email || 'Unknown'}`;
      return `from ${meta.from_name || meta.from_email || 'Unknown'}`;
    }

    if (entry.entry_type === 'REVERSAL') {
      return meta?.description || 'Wallet reversal';
    }

    // Overdraft-related entries — make them unmistakable in the statement
    if (meta?.type === 'overdraft_draw') {
      return 'Overdraft used to top up this transaction';
    }
    if (meta?.source === 'overdraft_no_headroom') {
      return 'Loan recovery via overdraft';
    }
    if (meta?.source === 'overdraft_repayment' || meta?.type === 'overdraft_repayment') {
      return 'Repaid from wallet';
    }
    if (meta?.source === 'overdraft_fee' || meta?.type === 'overdraft_fee') {
      return 'Overdraft interest / fee';
    }
    
    if (entry.entry_type === 'LOYALTY_REWARD' && meta) {
      const activityMap: Record<string, string> = {
        form_submission: 'Form Submission', data_entry: 'Data Entry', report_generation: 'Report Generation',
        task_completion: 'Task Completion', page_visit: 'Page Visit', interaction: 'Interaction',
        document_upload: 'Document Upload', transaction: 'Transaction',
      };
      return activityMap[meta.activity_type] || meta.activity_type || '';
    }
    if (entry.entry_type === 'LOAN_DISBURSEMENT' && meta) {
      return meta.loan_type === 'long_term' ? 'Long-Term Loan' : 'Quick Loan';
    }
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'loan_disbursement' || entry.reference?.startsWith('LOAN-DISBURSE'))) {
      return meta?.duration_months ? `${meta.duration_months} month(s)` : '';
    }
    if (entry.entry_type === 'DEPOSIT' && meta?.allowance_type) {
      const desc = meta.description || (meta.allowance_type === 'data_allowance' ? 'Monthly Data Allowance' : 'Monthly Airtime Allowance');
      const monthLabel = meta.month_year ? ` — ${meta.month_year}` : '';
      return `${desc}${monthLabel}`;
    }
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'salary' || meta?.source === 'payroll' || entry.reference?.startsWith('SALARY') || entry.reference?.startsWith('SAL-'))) {
      return meta?.month || meta?.description || '';
    }
    if (entry.entry_type === 'DEPOSIT' && (entry.reference?.startsWith('EXPENSE-APPROVED') || meta?.source === 'expense_approval')) {
      return meta?.title || meta?.description || '';
    }
    if (entry.entry_type === 'LOAN_REPAYMENT' && meta) {
      if (meta.source === 'momo_loan_repayment_out') {
        return `Applied to loan via MoMo${meta.phone ? ` (${meta.phone})` : ''}`;
      }
      return meta.method === 'mobile_money' ? 'via MoMo' : meta.method || '';
    }
    if ((entry.entry_type === 'WITHDRAWAL' || entry.entry_type === 'ADJUSTMENT') && meta?.loan_id) {
      if (meta.source === 'guarantor' && meta.borrower) {
        const borrowerName = meta.description?.match(/for (.+?)['']s loan/)?.[1] || meta.borrower;
        return `Loan recovery for ${borrowerName}`;
      }
      const source = meta.source === 'wallet' ? 'Wallet Recovery' : meta.source === 'salary' ? 'Salary Recovery' : 'Loan Recovery';
      return source;
    }
    if (entry.entry_type === 'DEPOSIT' && meta?.description) return meta.description;
    return '';
  };

  const getEntryLabel = (entry: LedgerEntry) => {
    const meta = parseMetadata(entry.metadata);
    const config = ENTRY_CONFIG[entry.entry_type] || DEFAULT_CONFIG;
    // Overdraft labels take priority so users instantly recognise borrowed funds
    if (meta?.type === 'overdraft_draw') return '🅾️ Overdraft Used';
    if (meta?.source === 'overdraft_no_headroom') return '🏦 Loan Recovery (Overdraft)';
    if (meta?.source === 'overdraft_repayment' || meta?.type === 'overdraft_repayment') return '↩️ Overdraft Repayment';
    if (meta?.source === 'overdraft_fee' || meta?.type === 'overdraft_fee') return '⚠️ Overdraft Fee';
    if (meta?.type === 'wallet_transfer' || meta?.type === 'internal_transfer_credit') {
      if (entry.amount < 0) return '📤 Sent Money';
      return '📥 Received Money';
    }
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'loan_disbursement' || entry.reference?.startsWith('LOAN-DISBURSE'))) return '💰 Loan Disbursement';
    if (entry.entry_type === 'DEPOSIT' && meta?.allowance_type) {
      if (meta.allowance_type === 'data_allowance') return '📶 Data Allowance';
      if (meta.allowance_type === 'airtime_allowance') return '📱 Airtime Allowance';
      return `🎁 ${meta.description || 'Monthly Allowance'}`;
    }
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'salary' || meta?.source === 'payroll' || entry.reference?.startsWith('SALARY') || entry.reference?.startsWith('SAL-'))) return '💵 Salary Credit';
    if (entry.entry_type === 'DEPOSIT' && (entry.reference?.startsWith('EXPENSE-APPROVED') || meta?.source === 'expense_approval')) return '📋 Expense Reimbursement';
    if (entry.entry_type === 'DEPOSIT' && (entry.reference?.startsWith('BONUS') || meta?.source === 'bonus')) return '🏆 Bonus Award';
    if (entry.entry_type === 'DEPOSIT' && (entry.reference?.includes('BIRTHDAY') || meta?.source === 'birthday_reward')) return '🎂 Birthday Reward';
    if (entry.entry_type === 'DEPOSIT' && (entry.reference?.startsWith('MOMO') || entry.reference?.startsWith('MM-') || meta?.source === 'mobile_money')) return '📲 Mobile Money Deposit';
    if (entry.entry_type === 'DEPOSIT' && (meta?.source === 'momo_loan_repayment_in' || entry.reference?.startsWith('LOAN-MOMO-IN'))) return '📲 MoMo Received (for loan)';
    if (entry.entry_type === 'LOAN_REPAYMENT' && meta?.source === 'momo_loan_repayment_out') return '🏦 Loan Paid (via MoMo)';
    if ((entry.entry_type === 'WITHDRAWAL' || entry.entry_type === 'ADJUSTMENT') && meta?.loan_id) {
      if (meta.source === 'guarantor' && meta.borrower) {
        const borrowerName = meta.description?.match(/for (.+?)['']s loan/)?.[1] || meta.borrower;
        return `Loan Recovery (${borrowerName})`;
      }
      return '🏦 Loan Recovery';
    }
    // Statement fee shows as "Transaction Charge" not "Withdrawal"
    if (entry.entry_type === 'WITHDRAWAL' && meta?.source === 'statement_fee') return '📄 Transaction Charge';
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
          <span className="font-medium text-foreground">UGX {balanceBroughtForward.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>This month:</span>
          <span className={`font-medium ${thisMonthEarnings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {thisMonthEarnings >= 0 ? '+' : ''}UGX {thisMonthEarnings.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-1 mt-1">
          <span>Wallet balance:</span>
          <span>UGX {currentBalance.toLocaleString()}</span>
        </div>
        {spendableBalance != null && (
          <div className="flex justify-between text-muted-foreground">
            <span>Available to spend:</span>
            <span className="font-medium text-foreground">UGX {spendableBalance.toLocaleString()}</span>
          </div>
        )}
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
          <div className="text-xs text-muted-foreground mb-1">
            Showing {Math.min(DISPLAY_LIMIT, entries.length)} most recent of {totalCount} transactions
          </div>

          {entriesWithBalance.map((entry) => {
            const config = ENTRY_CONFIG[entry.entry_type] || DEFAULT_CONFIG;
            const isCredit = entry.amount > 0;
            const activityLabel = getActivityLabel(entry);
            const transferMeta = getTransferMeta(entry);
            const isTransferOut = transferMeta && entry.amount < 0;
            const isTransferIn = transferMeta && entry.amount > 0;
            const meta = parseMetadata(entry.metadata);
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const canReverse = isTransferOut && meta?.reversed !== 'true' && new Date(entry.created_at) > twoHoursAgo;
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

          {/* Full Statement via Email */}
          {totalCount > DISPLAY_LIMIT && (
            <div className="border border-dashed rounded-lg p-4 text-center space-y-2 bg-muted/30">
              <Mail className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You have <span className="font-semibold text-foreground">{totalCount - DISPLAY_LIMIT}</span> more transactions.
              </p>
              <p className="text-xs text-muted-foreground">
                Select a date range and we'll email your full statement.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowEmailDialog(true); setEmailSent(false); }}
                className="gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                Get Full Statement via Email
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Email Statement Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Full Statement
            </DialogTitle>
          </DialogHeader>
          
          {emailSent ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              <h3 className="font-semibold text-lg">Statement Sent!</h3>
              <p className="text-sm text-muted-foreground">
                Your detailed transaction statement has been sent to <span className="font-medium text-foreground">{user?.email}</span>
              </p>
              <p className="text-xs text-muted-foreground">Check your inbox (and spam folder) for the email.</p>
              <Button onClick={() => setShowEmailDialog(false)} className="mt-2">Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select the period for your statement. It will be sent to <span className="font-medium text-foreground">{user?.email}</span>
                </p>
                {isFreeWindow ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-emerald-600 text-sm">✓</span>
                    <p className="text-xs text-emerald-800">
                      Statements are <span className="font-bold">free for the next 2 hours</span> — download as many as you need.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-amber-600 text-sm">ℹ</span>
                    <p className="text-xs text-amber-800">
                      A UGX {STATEMENT_FEE.toLocaleString()} statement fee applies.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dateFrom" className="text-xs">From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dateTo" className="text-xs">To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleSendStatement}
                  disabled={!dateFrom || !dateTo || sendingEmail}
                  className="gap-1.5"
                >
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingEmail ? 'Sending...' : 'Send Statement'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
