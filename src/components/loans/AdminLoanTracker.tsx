import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Search, AlertTriangle, CalendarDays, Users, History, 
  Send, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle,
  Banknote, TrendingDown, Calendar, User, Shield, Phone, Mail, MapPin, Briefcase, Printer
} from 'lucide-react';
import LoanRepaymentSlip from './LoanRepaymentSlip';
import LoanRepaymentHistorySlip from './LoanRepaymentHistorySlip';

const AdminLoanTracker = () => {
  const [search, setSearch] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [sendingSms, setSendingSms] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Fetch all active loans with repayments
  const { data: activeLoans, isLoading: loansLoading } = useQuery({
    queryKey: ['admin-loan-tracker-loans'],
    queryFn: async () => {
      const { data } = await supabase
        .from('loans')
        .select('*')
        .in('status', ['active', 'pending_admin', 'pending_guarantor'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: allRepayments } = useQuery({
    queryKey: ['admin-loan-tracker-repayments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('loan_repayments')
        .select('*, loans!inner(employee_name, employee_email, employee_phone, loan_type, loan_amount, remaining_balance, status)')
        .order('due_date', { ascending: true });
      return data || [];
    },
    refetchInterval: 30000,
  });

  const today = new Date().toISOString().split('T')[0];

  // ---- BORROWER SUMMARY ----
  const borrowerSummary = useMemo(() => {
    if (!activeLoans) return [];
    return activeLoans
      .filter(l => l.status === 'active')
      .map(loan => {
        const reps = (allRepayments || []).filter((r: any) => r.loan_id === loan.id);
        const nextDue = reps.find((r: any) => r.status !== 'paid');
        const overdueCount = reps.filter((r: any) => r.status === 'overdue' || (r.status === 'pending' && r.due_date < today)).length;
        const totalPaid = reps.reduce((s: number, r: any) => s + (r.amount_paid || 0), 0);
        return { ...loan, nextDue, overdueCount, totalPaid, repayments: reps };
      })
      .filter(b => !search || b.employee_name?.toLowerCase().includes(search.toLowerCase()));
  }, [activeLoans, allRepayments, search, today]);

  // ---- WEEKLY CALENDAR ----
  const weeklyCalendar = useMemo(() => {
    if (!allRepayments) return {};
    const upcoming: Record<string, any[]> = {};
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 14); // Next 2 weeks

    allRepayments
      .filter((r: any) => r.status !== 'paid' && r.loans?.status === 'active')
      .filter((r: any) => r.due_date <= futureLimit.toISOString().split('T')[0])
      .forEach((r: any) => {
        const day = r.due_date;
        if (!upcoming[day]) upcoming[day] = [];
        upcoming[day].push(r);
      });

    return upcoming;
  }, [allRepayments]);

  const sortedCalendarDays = Object.keys(weeklyCalendar).sort();

  // ---- OVERDUE LIST ----
  const overdueInstallments = useMemo(() => {
    if (!allRepayments) return [];
    return allRepayments.filter((r: any) => 
      (r.status === 'overdue' || (r.status === 'pending' && r.due_date < today)) &&
      r.loans?.status === 'active'
    ).sort((a: any, b: any) => a.due_date.localeCompare(b.due_date));
  }, [allRepayments, today]);

  // Send SMS reminder
  const sendReminder = async (repayment: any) => {
    const loan = repayment.loans;
    if (!loan?.employee_phone) {
      toast.error('No phone number on file for this borrower');
      return;
    }
    setSendingSms(repayment.id);
    try {
      const remaining = (repayment.amount_due || 0) - (repayment.amount_paid || 0);
      const dueDate = new Date(repayment.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const message = `GREAT AGRO: Your loan installment of UGX ${remaining.toLocaleString()} was due on ${dueDate}. Please make payment to avoid penalties. Contact Finance for help.`;
      
      await supabase.from('sms_notification_queue').insert({
        recipient_phone: loan.employee_phone,
        recipient_email: loan.employee_email || 'system@greatagrocoffee.com',
        message,
        notification_type: 'loan_reminder',
      });
      toast.success(`SMS reminder queued for ${loan.employee_name}`);
    } catch (err) {
      toast.error('Failed to queue SMS');
    } finally {
      setSendingSms(null);
    }
  };

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const daysDiff = Math.round((d.getTime() - new Date(today).getTime()) / 86400000);
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Tomorrow';
    if (daysDiff === -1) return 'Yesterday';
    if (daysDiff < 0) return `${Math.abs(daysDiff)} days overdue`;
    return `In ${daysDiff} days`;
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'paid') return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
    if (status === 'overdue' || (status === 'pending' && dueDate < today))
      return <Badge variant="destructive">Overdue</Badge>;
    if (status === 'partial') return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Partial</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Loan Tracker — Admin
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="summary" className="text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Borrowers
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs sm:text-sm">
              <AlertTriangle className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Overdue
              {overdueInstallments.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{overdueInstallments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <History className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> History
            </TabsTrigger>
          </TabsList>

          {/* ========= BORROWER SUMMARY ========= */}
          <TabsContent value="summary">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search borrower..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loansLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : borrowerSummary.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active loans found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Loan</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowerSummary.map(b => (
                      <TableRow key={b.id} className={b.overdueCount > 0 ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{b.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{b.loan_type === 'long_term' ? 'Long-Term' : 'Quick'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">UGX {b.loan_amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-sm">UGX {b.remaining_balance?.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          {b.nextDue ? (
                            <div>
                              <p className="text-sm">{new Date(b.nextDue.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                              <p className="text-xs text-muted-foreground">{b.repayment_frequency === 'weekly' ? 'Week' : b.repayment_frequency === 'bullet' ? 'Payment' : 'Month'} {b.nextDue.installment_number}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {b.overdueCount > 0 ? (
                            <Badge variant="destructive">{b.overdueCount} overdue</Badge>
                          ) : b.is_defaulted ? (
                            <Badge variant="destructive">Defaulted</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">On Track</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedBorrower(b)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ========= PAYMENT CALENDAR ========= */}
          <TabsContent value="calendar">
            {sortedCalendarDays.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming installments in the next 2 weeks</p>
            ) : (
              <div className="space-y-3">
                {sortedCalendarDays.map(day => {
                  const items = weeklyCalendar[day];
                  const isToday = day === today;
                  const isPast = day < today;
                  const isExpanded = expandedDay === day;
                  const totalDue = items.reduce((s: number, r: any) => s + ((r.amount_due || 0) - (r.amount_paid || 0)), 0);

                  return (
                    <div key={day} className={`border rounded-lg overflow-hidden ${isToday ? 'border-primary ring-2 ring-primary/20' : isPast ? 'border-red-300 dark:border-red-700' : 'border-border'}`}>
                      <button
                        onClick={() => setExpandedDay(isExpanded ? null : day)}
                        className={`w-full flex items-center justify-between p-3 text-left ${isToday ? 'bg-primary/5' : isPast ? 'bg-red-50/50 dark:bg-red-950/10' : 'bg-muted/30'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${isToday ? 'bg-primary text-primary-foreground' : isPast ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <span>{new Date(day).toLocaleDateString('en-GB', { day: 'numeric' })}</span>
                            <span className="text-[10px] font-normal">{new Date(day).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                              <span className="text-xs text-muted-foreground ml-2">({getDayLabel(day)})</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{items.length} payment{items.length > 1 ? 's' : ''} • Total: UGX {totalDue.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isPast ? 'destructive' : isToday ? 'default' : 'secondary'}>
                            {items.length}
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="divide-y">
                          {items.map((r: any) => {
                            const remaining = (r.amount_due || 0) - (r.amount_paid || 0);
                            return (
                              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 bg-background">
                                <div>
                                  <p className="font-medium text-sm">{r.loans?.employee_name}</p>
                                  <p className="text-xs text-muted-foreground">{r.loans?.repayment_frequency === 'weekly' ? 'Week' : r.loans?.repayment_frequency === 'bullet' ? 'Payment' : 'Month'} {r.installment_number} • {r.loans?.loan_type === 'long_term' ? 'Long-Term' : 'Quick'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-sm">UGX {remaining.toLocaleString()}</span>
                                  {getStatusBadge(r.status, r.due_date)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========= OVERDUE & ALERTS ========= */}
          <TabsContent value="overdue">
            {overdueInstallments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground">No overdue installments — all borrowers are on track!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{overdueInstallments.length} overdue installment{overdueInstallments.length > 1 ? 's' : ''}</p>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      for (const r of overdueInstallments) {
                        await sendReminder(r);
                      }
                    }}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Remind All
                  </Button>
                </div>
                {overdueInstallments.map((r: any) => {
                  const remaining = (r.amount_due || 0) - (r.amount_paid || 0);
                  const daysOverdue = Math.round((new Date(today).getTime() - new Date(r.due_date).getTime()) / 86400000);
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{r.loans?.employee_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.loans?.repayment_frequency === 'weekly' ? 'Week' : r.loans?.repayment_frequency === 'bullet' ? 'Payment' : 'Month'} {r.installment_number} • Due {new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            <span className="text-destructive font-medium ml-1">• {daysOverdue}d overdue</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">UGX {remaining.toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendingSms === r.id}
                          onClick={() => sendReminder(r)}
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========= REPAYMENT HISTORY ========= */}
          <TabsContent value="history">
            <BorrowerHistoryTab allRepayments={allRepayments || []} activeLoans={activeLoans || []} />
          </TabsContent>
        </Tabs>

        {/* Borrower Detail Dialog */}
        <BorrowerDetailDialog 
          selectedBorrower={selectedBorrower} 
          onClose={() => setSelectedBorrower(null)} 
          today={today}
          getStatusBadge={getStatusBadge}
        />
      </CardContent>
    </Card>
  );
};

// Sub-component for borrower detail with full profile
const BorrowerDetailDialog = ({ selectedBorrower, onClose, today, getStatusBadge }: {
  selectedBorrower: any;
  onClose: () => void;
  today: string;
  getStatusBadge: (status: string, dueDate: string) => React.ReactNode;
}) => {
  const [borrowerDetails, setBorrowerDetails] = useState<any>(null);
  const [guarantorDetails, setGuarantorDetails] = useState<any>(null);
  const [borrowerWalletBalance, setBorrowerWalletBalance] = useState(0);
  const [guarantorWalletBalance, setGuarantorWalletBalance] = useState(0);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!selectedBorrower) return;
    const fetchDetails = async () => {
      setDetailsLoading(true);
      try {
        const { data: borrower } = await supabase
          .from('employees')
          .select('name, email, phone, salary, department, position, join_date, auth_user_id, address, emergency_contact, employee_id, status, role')
          .eq('email', selectedBorrower.employee_email)
          .single();
        setBorrowerDetails(borrower);

        if (borrower?.auth_user_id) {
          const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: selectedBorrower.employee_email });
          const uid = userId || borrower.auth_user_id;
          const { data: walletLedger } = await supabase
            .from('ledger_entries')
            .select('amount, entry_type')
            .eq('user_id', uid)
            .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']);
          setBorrowerWalletBalance((walletLedger || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0));
        }

        if (selectedBorrower.guarantor_email) {
          const { data: guarantor } = await supabase
            .from('employees')
            .select('name, email, phone, salary, department, position, join_date, auth_user_id, employee_id, status, role')
            .eq('email', selectedBorrower.guarantor_email)
            .single();
          setGuarantorDetails(guarantor);

          if (guarantor?.auth_user_id) {
            const { data: gUserId } = await supabase.rpc('get_unified_user_id', { input_email: selectedBorrower.guarantor_email });
            const gUid = gUserId || guarantor.auth_user_id;
            const { data: gWalletLedger } = await supabase
              .from('ledger_entries')
              .select('amount, entry_type')
              .eq('user_id', gUid)
              .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']);
            setGuarantorWalletBalance((gWalletLedger || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0));
          }
        }
      } catch (err) {
        console.error('Error fetching borrower details:', err);
      } finally {
        setDetailsLoading(false);
      }
    };
    fetchDetails();
  }, [selectedBorrower?.id]);

  const salary = borrowerDetails?.salary || 0;
  const loanLimit = salary * 2;
  const tenureMonths = borrowerDetails?.join_date
    ? Math.floor((Date.now() - new Date(borrowerDetails.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;
  const guarantorTenureMonths = guarantorDetails?.join_date
    ? Math.floor((Date.now() - new Date(guarantorDetails.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;
  const isWeekly = selectedBorrower?.repayment_frequency === 'weekly';
  const isBullet = selectedBorrower?.repayment_frequency === 'bullet';
  const periodLabel = isWeekly ? 'Wk' : isBullet ? 'Payment' : 'Month';

  return (
    <Dialog open={!!selectedBorrower} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between gap-2 text-lg">
            <span className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              {selectedBorrower?.employee_name} — Loan Detail
            </span>
            {selectedBorrower && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatement(true)}
                className="mr-6"
              >
                <Printer className="h-4 w-4 mr-1" /> Repayment Statement
              </Button>
            )}
            {selectedBorrower && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="mr-6"
              >
                <History className="h-4 w-4 mr-1" /> Payment History
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {selectedBorrower && (
          <LoanRepaymentHistorySlip
            open={showHistory}
            onClose={() => setShowHistory(false)}
            loanInfo={{
              employeeName: selectedBorrower.employee_name,
              employeeEmail: selectedBorrower.employee_email,
              loanAmount: Number(selectedBorrower.loan_amount || 0),
              totalRepayable: Number(selectedBorrower.total_repayable || 0),
              remainingBalance: Number(selectedBorrower.remaining_balance || 0),
              loanType: selectedBorrower.loan_type,
              repaymentFrequency: selectedBorrower.repayment_frequency,
              startDate: selectedBorrower.start_date,
            }}
            repayments={selectedBorrower.repayments || []}
          />
        )}
        {selectedBorrower && (
          <LoanRepaymentSlip
            open={showStatement}
            onClose={() => setShowStatement(false)}
            loanData={{
              employeeName: selectedBorrower.employee_name,
              employeeEmail: selectedBorrower.employee_email,
              guarantorName: selectedBorrower.guarantor_name || 'N/A',
              loanAmount: Number(selectedBorrower.loan_amount || 0),
              interestRate: Number(selectedBorrower.interest_rate || 0),
              dailyRate: Number(selectedBorrower.interest_rate || 0) / 30,
              durationMonths: Number(selectedBorrower.duration_months || 1),
              totalWeeks: Number(selectedBorrower.total_weeks || (selectedBorrower.duration_months || 1) * 4),
              weeklyInstallment: Number(selectedBorrower.weekly_installment || selectedBorrower.installment_amount || 0),
              totalRepayable: Number(selectedBorrower.total_repayable || 0),
              totalInterest: Number(selectedBorrower.total_interest || (Number(selectedBorrower.total_repayable || 0) - Number(selectedBorrower.loan_amount || 0))),
              loanType: selectedBorrower.loan_type,
              repaymentFrequency: selectedBorrower.repayment_frequency,
            }}
          />
        )}
        {selectedBorrower && (
          <ScrollArea className="max-h-[78vh] px-6 pb-6">
            {detailsLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading profile...</p>
            ) : (
              <div className="space-y-4">
                {/* Loan Summary */}
                <Card>
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Loan Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Loan Type</p>
                        <p className="font-bold">{selectedBorrower.loan_type === 'long_term' ? 'Long-Term' : 'Quick'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Principal</p>
                        <p className="font-bold">UGX {selectedBorrower.loan_amount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Interest Rate</p>
                        <p className="font-bold">{selectedBorrower.interest_rate}%/month</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total Repayable</p>
                        <p className="font-bold">UGX {selectedBorrower.total_repayable?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Remaining Balance</p>
                        <p className="font-bold text-destructive">UGX {selectedBorrower.remaining_balance?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total Paid</p>
                        <p className="font-bold text-green-600">UGX {selectedBorrower.totalPaid?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Frequency</p>
                        <p className="font-bold capitalize">{selectedBorrower.repayment_frequency || 'weekly'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Duration</p>
                        <p className="font-bold">{selectedBorrower.duration_months} month(s)</p>
                      </div>
                    </div>
                    {selectedBorrower.start_date && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-3">
                        <div>
                          <p className="text-muted-foreground text-xs">Start Date</p>
                          <p className="font-medium">{new Date(selectedBorrower.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">End Date</p>
                          <p className="font-medium">{selectedBorrower.end_date ? new Date(selectedBorrower.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Approved By</p>
                          <p className="font-medium">{selectedBorrower.admin_approved_by || '-'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Borrower Profile */}
                <Card>
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" /> Borrower Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Full Name</p>
                        <p className="font-medium">{selectedBorrower.employee_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Employee ID</p>
                        <p className="font-medium">{borrowerDetails?.employee_id || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Email</p>
                        <p className="font-medium text-xs">{selectedBorrower.employee_email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Phone</p>
                        <p className="font-medium">{borrowerDetails?.phone || selectedBorrower.employee_phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Position</p>
                        <p className="font-medium">{borrowerDetails?.position || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Department</p>
                        <p className="font-medium">{borrowerDetails?.department || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Role</p>
                        <p className="font-medium">{borrowerDetails?.role || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Status</p>
                        <Badge variant={borrowerDetails?.status === 'Active' ? 'default' : 'destructive'} className="text-xs">{borrowerDetails?.status || '-'}</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tenure</p>
                        <p className="font-medium">{tenureMonths} months</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Monthly Salary</p>
                        <p className="font-bold">UGX {salary.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Wallet Balance</p>
                        <p className={`font-bold ${borrowerWalletBalance < 0 ? 'text-destructive' : ''}`}>
                          UGX {Math.abs(borrowerWalletBalance).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Loan Limit (2x Salary)</p>
                        <p className="font-bold">UGX {loanLimit.toLocaleString()}</p>
                      </div>
                      {borrowerDetails?.address && (
                        <div>
                          <p className="text-muted-foreground text-xs">Address</p>
                          <p className="font-medium">{borrowerDetails.address}</p>
                        </div>
                      )}
                      {borrowerDetails?.emergency_contact && (
                        <div>
                          <p className="text-muted-foreground text-xs">Emergency Contact</p>
                          <p className="font-medium">{borrowerDetails.emergency_contact}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Guarantor Profile */}
                <Card>
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Guarantor Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {guarantorDetails ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Full Name</p>
                          <p className="font-medium">{selectedBorrower.guarantor_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Employee ID</p>
                          <p className="font-medium">{guarantorDetails.employee_id || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Email</p>
                          <p className="font-medium text-xs">{selectedBorrower.guarantor_email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Phone</p>
                          <p className="font-medium">{guarantorDetails.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Position</p>
                          <p className="font-medium">{guarantorDetails.position || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Department</p>
                          <p className="font-medium">{guarantorDetails.department || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Role</p>
                          <p className="font-medium">{guarantorDetails.role || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Tenure</p>
                          <p className="font-medium">{guarantorTenureMonths} months</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Monthly Salary</p>
                          <p className="font-bold">UGX {(guarantorDetails.salary || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Wallet Balance</p>
                          <p className={`font-bold ${guarantorWalletBalance < 0 ? 'text-destructive' : ''}`}>
                            UGX {Math.abs(guarantorWalletBalance).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Guarantee Status</p>
                          {selectedBorrower.guarantor_approved ? (
                            <Badge className="text-xs bg-green-600">Approved</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Salary Covers Loan?</p>
                          <p className={`font-bold ${(guarantorDetails.salary || 0) < selectedBorrower.loan_amount ? 'text-destructive' : ''}`}>
                            {(guarantorDetails.salary || 0) >= selectedBorrower.loan_amount ? '✅ Yes' : '⚠ No'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No guarantor information available</p>
                    )}
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      <strong>Recovery Plan:</strong> {isWeekly ? 'Weekly' : isBullet ? 'Bullet' : 'Monthly'} deductions. Default recovery: Wallet → Salary → Guarantor ({selectedBorrower.guarantor_name || 'N/A'}).
                    </div>
                  </CardContent>
                </Card>

                {/* Installment Schedule */}
                <Card>
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Installment Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {selectedBorrower.repayments?.map((r: any) => {
                        const remaining = (r.amount_due || 0) - (r.amount_paid || 0);
                        const effectiveStatus = r.status === 'pending' && (r.amount_paid || 0) > 0 ? 'partial' : r.status;
                        return (
                          <div key={r.id} className={`flex items-center justify-between p-2 rounded text-sm border ${effectiveStatus === 'paid' ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800' : r.due_date < today && effectiveStatus !== 'paid' ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800' : 'border-border'}`}>
                            <div className="flex items-center gap-2">
                              {effectiveStatus === 'paid' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : r.due_date < today ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span>{periodLabel} {r.installment_number}</span>
                              <span className="text-muted-foreground">{new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <div>
                                <span className="font-medium">UGX {(effectiveStatus === 'paid' ? r.amount_paid : remaining).toLocaleString()}</span>
                                {effectiveStatus === 'partial' && (
                                  <p className="text-[10px] text-muted-foreground">Paid {((r.amount_paid || 0)).toLocaleString()} of {((r.amount_due || 0)).toLocaleString()}</p>
                                )}
                              </div>
                              {getStatusBadge(effectiveStatus, r.due_date)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Sub-component for repayment history per borrower
const BorrowerHistoryTab = ({ allRepayments, activeLoans }: { allRepayments: any[]; activeLoans: any[] }) => {
  const [searchHistory, setSearchHistory] = useState('');

  // Get all loans (including completed) for history
  const { data: allLoans } = useQuery({
    queryKey: ['admin-all-loans-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('loans')
        .select('*')
        .in('status', ['active', 'completed', 'paid_off'])
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: allReps } = useQuery({
    queryKey: ['admin-all-repayments-history'],
    queryFn: async () => {
      if (!allLoans?.length) return [];
      const { data } = await supabase
        .from('loan_repayments')
        .select('*')
        .in('loan_id', allLoans.map(l => l.id))
        .order('paid_date', { ascending: false });
      return data || [];
    },
    enabled: !!allLoans?.length,
  });

  const borrowerHistory = useMemo(() => {
    if (!allLoans) return [];
    const grouped: Record<string, { name: string; loans: any[] }> = {};
    
    allLoans.forEach(loan => {
      if (!grouped[loan.employee_email]) {
        grouped[loan.employee_email] = { name: loan.employee_name, loans: [] };
      }
      const reps = (allReps || []).filter(r => r.loan_id === loan.id);
      const paidReps = reps.filter(r => r.status === 'paid');
      grouped[loan.employee_email].loans.push({ ...loan, paidCount: paidReps.length, totalInstallments: reps.length });
    });

    return Object.entries(grouped)
      .map(([email, data]) => ({ email, ...data }))
      .filter(b => !searchHistory || b.name.toLowerCase().includes(searchHistory.toLowerCase()));
  }, [allLoans, allReps, searchHistory]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by borrower name..."
          value={searchHistory}
          onChange={e => setSearchHistory(e.target.value)}
          className="pl-9"
        />
      </div>

      {borrowerHistory.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No loan history found</p>
      ) : (
        <div className="space-y-3">
          {borrowerHistory.map(b => (
            <div key={b.email} className="border rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">{b.name}</h4>
              <div className="space-y-2">
                {b.loans.map((loan: any) => (
                  <div key={loan.id} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                    <div>
                      <p className="font-medium">
                        {loan.loan_type === 'long_term' ? 'Long-Term' : 'Quick'} — UGX {loan.loan_amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' • '}{loan.paidCount}/{loan.totalInstallments} paid
                      </p>
                    </div>
                    <Badge variant={loan.status === 'active' ? 'default' : loan.status === 'completed' || loan.status === 'paid_off' ? 'secondary' : 'outline'}>
                      {loan.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLoanTracker;
