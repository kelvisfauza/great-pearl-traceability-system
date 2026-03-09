import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Search, AlertTriangle, CalendarDays, Users, History, 
  Send, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle,
  Banknote, TrendingDown, Calendar
} from 'lucide-react';

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
        .select('*, loans!inner(employee_name, employee_phone, loan_type, loan_amount, remaining_balance, status)')
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
      const message = `GREAT PEARL: Your loan installment of UGX ${remaining.toLocaleString()} was due on ${dueDate}. Please make payment to avoid penalties. Contact Finance for help.`;
      
      await supabase.from('sms_notification_queue').insert({
        recipient_phone: loan.employee_phone,
        recipient_email: loan.employee_email || 'system@greatpearl.com',
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
                              <p className="text-xs text-muted-foreground">Week {b.nextDue.installment_number}</p>
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
                                  <p className="text-xs text-muted-foreground">Week {r.installment_number} • {r.loans?.loan_type === 'long_term' ? 'Long-Term' : 'Quick'}</p>
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
                            Week {r.installment_number} • Due {new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
        <Dialog open={!!selectedBorrower} onOpenChange={() => setSelectedBorrower(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                {selectedBorrower?.employee_name} — Loan Detail
              </DialogTitle>
            </DialogHeader>
            {selectedBorrower && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Loan Amount</p>
                    <p className="font-bold">UGX {selectedBorrower.loan_amount?.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Remaining</p>
                    <p className="font-bold text-destructive">UGX {selectedBorrower.remaining_balance?.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Total Paid</p>
                    <p className="font-bold text-green-600">UGX {selectedBorrower.totalPaid?.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Guarantor</p>
                    <p className="font-bold">{selectedBorrower.guarantor_name || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Installment Schedule</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {selectedBorrower.repayments?.map((r: any) => {
                      const remaining = (r.amount_due || 0) - (r.amount_paid || 0);
                      return (
                        <div key={r.id} className={`flex items-center justify-between p-2 rounded text-sm border ${r.status === 'paid' ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800' : r.due_date < today && r.status !== 'paid' ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800' : 'border-border'}`}>
                          <div className="flex items-center gap-2">
                            {r.status === 'paid' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : r.due_date < today ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>Wk {r.installment_number}</span>
                            <span className="text-muted-foreground">{new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">UGX {(r.status === 'paid' ? r.amount_paid : remaining).toLocaleString()}</span>
                            {getStatusBadge(r.status, r.due_date)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
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
