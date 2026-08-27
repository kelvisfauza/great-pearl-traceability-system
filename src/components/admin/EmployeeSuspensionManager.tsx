import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Ban, ShieldCheck, Search, Loader2, FileText, Printer } from 'lucide-react';
import { printHtmlInFreshWindow } from '@/lib/printInterceptor';

interface SuspensionRow {
  id: string;
  employee_name: string;
  employee_email: string;
  employee_phone: string | null;
  reason: string;
  details: string | null;
  pay_status: string;
  start_date: string;
  end_date: string;
  report_back_date: string | null;
  letter_body: string | null;
  status: string;
  issued_by: string | null;
  lifted_by: string | null;
  lifted_at: string | null;
  created_at: string;
}

const PAY_LABELS: Record<string, string> = {
  half_pay: 'Half pay',
  no_pay: 'Without pay',
  full_pay: 'Full pay',
};

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const EmployeeSuspensionManager = () => {
  const { employees, refetch } = useUnifiedEmployees();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SuspensionRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [target, setTarget] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [payStatus, setPayStatus] = useState('half_pay');
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [days, setDays] = useState(7);

  const [letterOpen, setLetterOpen] = useState(false);
  const [letterText, setLetterText] = useState('');
  const [letterTitle, setLetterTitle] = useState('Suspension Letter');

  const endDate = useMemo(() => addDays(startDate, Math.max(1, days) - 1), [startDate, days]);
  const reportBackDate = useMemo(() => addDays(endDate, 1), [endDate]);

  const loadRows = async () => {
    setLoadingRows(true);
    const { data, error } = await (supabase as any)
      .from('employee_suspensions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setRows((data as SuspensionRow[]) || []);
    setLoadingRows(false);
  };

  useEffect(() => { loadRows(); }, []);

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Only administrators can manage suspensions.
        </CardContent>
      </Card>
    );
  }

  const activeByEmail = new Map(
    rows.filter(r => r.status === 'active').map(r => [r.employee_email.toLowerCase(), r]),
  );

  const filtered = employees.filter(e =>
    `${e.name} ${e.email} ${e.position || ''} ${e.department || ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const openSuspend = (employee: any) => {
    setTarget(employee);
    setReason('');
    setDetails('');
    setPayStatus('half_pay');
    setStartDate(today);
    setDays(7);
    setSuspendOpen(true);
  };

  const submitSuspension = async () => {
    if (!target || !reason.trim()) {
      toast({ title: 'Reason required', description: 'Enter the reason for suspension.', variant: 'destructive' });
      return;
    }
    setBusy(target.email);
    try {
      const { data, error } = await supabase.functions.invoke('employee-suspension', {
        body: {
          action: 'suspend',
          employeeId: target.id,
          employeeName: target.name,
          employeeEmail: target.email,
          employeePhone: target.phone,
          reason: reason.trim(),
          details: details.trim() || undefined,
          payStatus,
          startDate,
          endDate,
          reportBackDate,
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Failed to suspend');

      toast({
        title: 'Employee suspended',
        description: `${target.name}'s account is blocked and the suspension letter has been emailed.`,
      });
      setSuspendOpen(false);
      setLetterTitle(`Suspension Letter — ${target.name}`);
      setLetterText((data as any).letter || '');
      setLetterOpen(true);
      await Promise.all([loadRows(), refetch()]);
    } catch (e: any) {
      toast({ title: 'Suspension failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const liftSuspension = async (employee: any, suspension?: SuspensionRow) => {
    setBusy(employee.email);
    try {
      const { data, error } = await supabase.functions.invoke('employee-suspension', {
        body: {
          action: 'lift',
          suspensionId: suspension?.id,
          employeeEmail: employee.email,
          employeeName: employee.name,
          employeePhone: employee.phone,
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Failed to lift suspension');
      toast({ title: 'Suspension lifted', description: `${employee.name}'s account has been unblocked and notified.` });
      await Promise.all([loadRows(), refetch()]);
    } catch (e: any) {
      toast({ title: 'Could not unblock', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const printLetter = (text: string, title: string) => {
    const html = `<!doctype html><html><head><title>${title}</title><style>
      body{font-family:Georgia,serif;padding:40px;line-height:1.6;white-space:pre-wrap;font-size:13px;color:#111}
      h1{font-size:16px;text-align:center;margin-bottom:24px;font-family:Arial,sans-serif}
    </style></head><body><h1>Great Agro Coffee — A member of Hello YEDA COFFEE COMPANY LIMITED</h1>${
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    }</body></html>`;
    printHtmlInFreshWindow(html, title);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Employee Suspensions
          </CardTitle>
          <CardDescription>
            Suspend an employee (blocks their account and emails a formal suspension letter) or lift a suspension to
            restore access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {filtered.map((employee: any) => {
              const active = activeByEmail.get(employee.email.toLowerCase());
              return (
                <div
                  key={employee.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{employee.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {employee.position} • {employee.department}
                    </p>
                    {active && (
                      <p className="text-xs text-destructive mt-1">
                        Suspended {active.start_date} → {active.end_date} • {active.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={active || employee.disabled ? 'destructive' : 'default'}>
                      {active ? 'Suspended' : employee.disabled ? 'Blocked' : 'Active'}
                    </Badge>
                    {active || employee.disabled ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === employee.email}
                        onClick={() => liftSuspension(employee, active)}
                      >
                        {busy === employee.email ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 mr-1" />
                        )}
                        Unblock
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === employee.email}
                        onClick={() => openSuspend(employee)}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Suspension Register
          </CardTitle>
          <CardDescription>All suspensions issued, with their letters.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRows ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suspensions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.start_date} → {r.end_date} • {PAY_LABELS[r.pay_status] || r.pay_status}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">Reason: {r.reason}</p>
                    {r.lifted_at && (
                      <p className="text-xs text-emerald-600">
                        Lifted by {r.lifted_by} on {new Date(r.lifted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'active' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLetterTitle(`Suspension Letter — ${r.employee_name}`);
                        setLetterText(r.letter_body || '');
                        setLetterOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Letter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suspend {target?.name}</DialogTitle>
            <DialogDescription>
              This blocks their account immediately and emails/SMSes the formal suspension letter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for suspension *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Unauthorized absence from duty without permission"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional details (optional)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Context or evidence included in the letter"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Days</Label>
                <Input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pay status</Label>
              <Select value={payStatus} onValueChange={setPayStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="half_pay">Half pay</SelectItem>
                  <SelectItem value="no_pay">Without pay</SelectItem>
                  <SelectItem value="full_pay">Full pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Effective {startDate} to {endDate}. Report back on {reportBackDate} at 8:00 a.m.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitSuspension} disabled={busy === target?.email}>
              {busy === target?.email && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend & send letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Letter preview */}
      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{letterTitle}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{letterText}</pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => printLetter(letterText, letterTitle)}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => setLetterOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeSuspensionManager;
