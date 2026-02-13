import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { toast } from '@/hooks/use-toast';
import { Clock, AlertTriangle, Plus, Send, Search } from 'lucide-react';

const RATE_PER_HOUR = 3000;

interface TimeDeduction {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_phone: string | null;
  month: string;
  hours_missed: number;
  rate_per_hour: number;
  total_deduction: number;
  reason: string | null;
  sms_sent: boolean;
  created_by: string;
  created_at: string;
}

const TimeDeductionManager = () => {
  const { employee } = useAuth();
  const { employees } = useUnifiedEmployees();
  const [deductions, setDeductions] = useState<TimeDeduction[]>([]);
  const [advances, setAdvances] = useState<Record<string, { balance: number; monthly: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [form, setForm] = useState({
    employeeId: '',
    month: filterMonth,
    hoursMissed: '',
    minutesMissed: '',
    reason: ''
  });

  const activeEmployees = employees.filter(emp => emp.status === 'Active');

  const fetchDeductions = async () => {
    try {
      setLoading(true);
      const [deductionsRes, advancesRes] = await Promise.all([
        supabase.from('time_deductions').select('*').order('created_at', { ascending: false }),
        supabase.from('employee_salary_advances').select('employee_email, remaining_balance, minimum_payment').eq('status', 'active')
      ]);

      if (deductionsRes.error) throw deductionsRes.error;
      setDeductions((deductionsRes.data || []) as TimeDeduction[]);

      // Build a map of email -> advance balance
      const advMap: Record<string, { balance: number; monthly: number }> = {};
      (advancesRes.data || []).forEach((a: any) => {
        const email = a.employee_email;
        if (!advMap[email]) advMap[email] = { balance: 0, monthly: 0 };
        advMap[email].balance += Number(a.remaining_balance);
        advMap[email].monthly += Number(a.minimum_payment);
      });
      setAdvances(advMap);
    } catch (error) {
      console.error('Error fetching deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeductions();
  }, []);

  const selectedEmployee = activeEmployees.find(e => e.id === form.employeeId);
  const hours = parseFloat(form.hoursMissed) || 0;
  const minutes = parseFloat(form.minutesMissed) || 0;
  const totalHoursDecimal = hours + (minutes / 60);
  const totalDeduction = Math.round(totalHoursDecimal * RATE_PER_HOUR);

  // Sum existing deductions for this employee in the selected month
  const existingDeductionsTotal = selectedEmployee
    ? deductions
        .filter(d => d.employee_id === selectedEmployee.id && d.month === form.month)
        .reduce((sum, d) => sum + Number(d.total_deduction), 0)
    : 0;

  const sendDeductionSMS = async (emp: any, hoursMissed: number, deductionAmount: number, month: string) => {
    try {
      const monthDate = new Date(month + '-01');
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const phone = emp.phone;
      if (!phone) return false;

      const message = `Dear ${emp.name}, your monthly salary for ${monthName} has been reduced by UGX ${deductionAmount.toLocaleString()} due to misuse of company time by ${hoursMissed} hours at UGX ${RATE_PER_HOUR.toLocaleString()}/hr. Contact HR for queries. Great Pearl Coffee.`;

      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone,
          message,
          userName: emp.name,
          messageType: 'time_deduction'
        }
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('SMS send error:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !selectedEmployee || totalHoursDecimal <= 0) return;

    const deductionLabel = minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('time_deductions')
        .upsert({
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.name,
          employee_email: selectedEmployee.email,
          employee_phone: selectedEmployee.phone || null,
          month: form.month,
          hours_missed: totalHoursDecimal,
          rate_per_hour: RATE_PER_HOUR,
          total_deduction: totalDeduction,
          reason: form.reason || null,
          created_by: employee.name || employee.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'employee_id,month'
        })
        .select()
        .single();

      if (error) throw error;

      // Send SMS
      const smsSent = await sendDeductionSMS(selectedEmployee, totalHoursDecimal, totalDeduction, form.month);

      if (smsSent && data) {
        await supabase
          .from('time_deductions')
          .update({ sms_sent: true })
          .eq('id', data.id);
      }

      toast({
        title: "Deduction Recorded",
        description: `${selectedEmployee.name}: ${deductionLabel} = UGX ${totalDeduction.toLocaleString()} deducted${smsSent ? '. SMS sent.' : '. SMS failed.'}`,
      });

      setForm({ employeeId: '', month: filterMonth, hoursMissed: '', minutesMissed: '', reason: '' });
      setDialogOpen(false);
      fetchDeductions();
    } catch (error: any) {
      console.error('Error saving deduction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save deduction",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredDeductions = deductions.filter(d => {
    const matchesMonth = !filterMonth || d.month === filterMonth;
    const matchesSearch = !searchTerm || 
      d.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  const totalDeductions = filteredDeductions.reduce((sum, d) => sum + Number(d.total_deduction), 0);
  const totalHours = filteredDeductions.reduce((sum, d) => sum + Number(d.hours_missed), 0);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Time Deduction Policy:</strong> UGX {RATE_PER_HOUR.toLocaleString()} is deducted per hour of missed working time. 
          Employees are notified via SMS when a deduction is recorded. The deduction is reflected in their salary request balance.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              UGX {totalDeductions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{filteredDeductions.length} employees affected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Missed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">At UGX {RATE_PER_HOUR.toLocaleString()}/hr</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rate Per Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {RATE_PER_HOUR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Fixed deduction rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Deductions
              </CardTitle>
              <CardDescription>
                Record hours missed by employees and deduct from their salary
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deduction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Time Deduction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} - {emp.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Input
                      type="month"
                      value={form.month}
                      onChange={(e) => setForm({ ...form, month: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Time Missed</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Hours"
                          value={form.hoursMissed}
                          onChange={(e) => setForm({ ...form, hoursMissed: e.target.value })}
                        />
                        <span className="text-xs text-muted-foreground">Hours</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          step="1"
                          placeholder="Minutes"
                          value={form.minutesMissed}
                          onChange={(e) => setForm({ ...form, minutesMissed: e.target.value })}
                        />
                        <span className="text-xs text-muted-foreground">Minutes</span>
                      </div>
                    </div>
                  </div>

                  {totalHoursDecimal > 0 && (
                    <Alert className="border-destructive/50 bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-sm">
                        <strong>Deduction: UGX {totalDeduction.toLocaleString()}</strong>
                        <br />
                        {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m `}({totalHoursDecimal.toFixed(2)} hrs) × UGX {RATE_PER_HOUR.toLocaleString()}/hr
                        {selectedEmployee && (
                          <>
                            <br />
                            <span className="text-xs">
                             Salary: UGX {selectedEmployee.salary?.toLocaleString() || 'N/A'}
                              {advances[selectedEmployee.email]?.balance > 0 && (
                                <>
                                  {' '}| Advance Balance: UGX {advances[selectedEmployee.email].balance.toLocaleString()}
                                  {' '}(Monthly: UGX {advances[selectedEmployee.email].monthly.toLocaleString()})
                                </>
                              )}
                              {existingDeductionsTotal > 0 && (
                                <>
                                  <br />
                                  Previous deductions this month: UGX {existingDeductionsTotal.toLocaleString()}
                                </>
                              )}
                              <br />
                              Net: UGX {((selectedEmployee.salary || 0) - totalDeduction - existingDeductionsTotal - (advances[selectedEmployee.email]?.monthly || 0)).toLocaleString()}
                            </span>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Reason / Notes</Label>
                    <Textarea
                      placeholder="Reason for missed hours..."
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {selectedEmployee?.phone && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Send className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-xs text-blue-800">
                        SMS will be sent to {selectedEmployee.name} ({selectedEmployee.phone}) notifying them of this deduction.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={saving || !form.employeeId || hours <= 0} className="w-full">
                    {saving ? 'Saving...' : 'Record Deduction & Send SMS'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-48"
            />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : filteredDeductions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No deductions recorded for this period</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Hours Missed</TableHead>
                    <TableHead>Deduction</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>SMS</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeductions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{d.employee_name}</div>
                        <div className="text-xs text-muted-foreground">{d.employee_email}</div>
                      </TableCell>
                      <TableCell>{d.month}</TableCell>
                      <TableCell className="font-medium">
                        {(() => {
                          const h = Math.floor(Number(d.hours_missed));
                          const m = Math.round((Number(d.hours_missed) - h) * 60);
                          return m > 0 ? `${h}h ${m}m` : `${h} hrs`;
                        })()}
                      </TableCell>
                      <TableCell className="font-semibold text-destructive">
                        UGX {Number(d.total_deduction).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {d.reason || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.sms_sent ? 'default' : 'secondary'}>
                          {d.sms_sent ? 'Sent' : 'Not Sent'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{d.created_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeDeductionManager;
