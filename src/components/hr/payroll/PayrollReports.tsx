import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer } from 'lucide-react';
import { fmtUGX } from '@/lib/payroll/statutory';

interface Payment {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  payment_month: string;
  gross_salary: number;
  nssf_employee: number;
  nssf_employer: number;
  nssf_total: number;
  taxable_income: number;
  paye: number;
  advance_deduction: number;
  net_salary: number;
  status: string;
  disbursement_reference: string | null;
}

const downloadCSV = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const PayrollReports = () => {
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string>('');
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('employee_salary_payments')
        .select('payment_month')
        .order('created_at', { ascending: false })
        .limit(500);
      const uniq = Array.from(new Set((data || []).map((r: any) => r.payment_month).filter(Boolean)));
      setMonths(uniq as string[]);
      if (uniq.length && !month) setMonth(uniq[0] as string);
    })();
  }, []);

  useEffect(() => {
    if (!month) return;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from('employee_salary_payments')
        .select('*')
        .eq('payment_month', month)
        .order('employee_name');
      setRows((data || []) as Payment[]);
      setLoading(false);
    })();
  }, [month]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    gross: a.gross + Number(r.gross_salary || 0),
    nssfE: a.nssfE + Number(r.nssf_employee || 0),
    nssfR: a.nssfR + Number(r.nssf_employer || 0),
    paye: a.paye + Number(r.paye || 0),
    net: a.net + Number(r.net_salary || 0),
  }), { gross: 0, nssfE: 0, nssfR: 0, paye: 0, net: 0 }), [rows]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Payroll Reports</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Pick a month" /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Tabs defaultValue="summary">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="summary">Employee Summary</TabsTrigger>
              <TabsTrigger value="nssf">NSSF Schedule</TabsTrigger>
              <TabsTrigger value="paye">PAYE Schedule</TabsTrigger>
              <TabsTrigger value="net">Net Disbursement</TabsTrigger>
              <TabsTrigger value="employer">Employer Cost</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <ReportTable
                headers={['Employee', 'Gross', 'NSSF 5%', 'PAYE', 'Advances', 'Net', 'Status']}
                rows={rows.map(r => [r.employee_name, fmtUGX(r.gross_salary), fmtUGX(r.nssf_employee), fmtUGX(r.paye), fmtUGX(r.advance_deduction), fmtUGX(r.net_salary), r.status])}
                onExport={() => downloadCSV(`payroll-summary-${month}.csv`,
                  [['Employee','Gross','NSSF 5%','PAYE','Advances','Net','Status'], ...rows.map(r => [r.employee_name, r.gross_salary, r.nssf_employee, r.paye, r.advance_deduction, r.net_salary, r.status])])}
                totalsRow={['Totals', fmtUGX(totals.gross), fmtUGX(totals.nssfE), fmtUGX(totals.paye), '', fmtUGX(totals.net), '']}
              />
            </TabsContent>

            <TabsContent value="nssf">
              <ReportTable
                headers={['Employee', 'Gross', 'Employee 5%', 'Employer 10%', 'Total NSSF']}
                rows={rows.filter(r => r.nssf_total > 0).map(r => [r.employee_name, fmtUGX(r.gross_salary), fmtUGX(r.nssf_employee), fmtUGX(r.nssf_employer), fmtUGX(r.nssf_total)])}
                onExport={() => downloadCSV(`nssf-schedule-${month}.csv`,
                  [['Employee','Gross','Employee 5%','Employer 10%','Total NSSF'], ...rows.map(r => [r.employee_name, r.gross_salary, r.nssf_employee, r.nssf_employer, r.nssf_total])])}
                totalsRow={['Totals', fmtUGX(totals.gross), fmtUGX(totals.nssfE), fmtUGX(totals.nssfR), fmtUGX(totals.nssfE + totals.nssfR)]}
              />
            </TabsContent>

            <TabsContent value="paye">
              <ReportTable
                headers={['Employee', 'Gross', 'NSSF 5%', 'Taxable', 'PAYE']}
                rows={rows.filter(r => r.paye > 0).map(r => [r.employee_name, fmtUGX(r.gross_salary), fmtUGX(r.nssf_employee), fmtUGX(r.taxable_income), fmtUGX(r.paye)])}
                onExport={() => downloadCSV(`paye-schedule-${month}.csv`,
                  [['Employee','Gross','NSSF 5%','Taxable','PAYE'], ...rows.map(r => [r.employee_name, r.gross_salary, r.nssf_employee, r.taxable_income, r.paye])])}
                totalsRow={['Totals', fmtUGX(totals.gross), fmtUGX(totals.nssfE), '', fmtUGX(totals.paye)]}
              />
            </TabsContent>

            <TabsContent value="net">
              <ReportTable
                headers={['Employee', 'Net Paid', 'Disbursement Ref', 'Status']}
                rows={rows.map(r => [r.employee_name, fmtUGX(r.net_salary), r.disbursement_reference || '—', r.status])}
                onExport={() => downloadCSV(`net-disbursement-${month}.csv`,
                  [['Employee','Net','Reference','Status'], ...rows.map(r => [r.employee_name, r.net_salary, r.disbursement_reference || '', r.status])])}
                totalsRow={['Totals', fmtUGX(totals.net), '', '']}
              />
            </TabsContent>

            <TabsContent value="employer">
              <ReportTable
                headers={['Employee', 'Gross', 'Employer NSSF 10%']}
                rows={rows.map(r => [r.employee_name, fmtUGX(r.gross_salary), fmtUGX(r.nssf_employer)])}
                onExport={() => downloadCSV(`employer-cost-${month}.csv`,
                  [['Employee','Gross','Employer NSSF 10%'], ...rows.map(r => [r.employee_name, r.gross_salary, r.nssf_employer])])}
                totalsRow={['Totals', fmtUGX(totals.gross), fmtUGX(totals.nssfR)]}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

const ReportTable = ({ headers, rows, totalsRow, onExport }: { headers: string[]; rows: any[][]; totalsRow?: any[]; onExport?: () => void }) => (
  <div className="space-y-2 mt-3">
    <div className="flex justify-end">
      {onExport && <Button size="sm" variant="outline" onClick={onExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button>}
    </div>
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>{headers.map(h => <TableHead key={h} className={h === 'Employee' ? '' : 'text-right'}>{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((c, j) => <TableCell key={j} className={j === 0 ? 'font-medium' : 'text-right'}>{c}</TableCell>)}
            </TableRow>
          ))}
          {totalsRow && (
            <TableRow className="bg-muted font-bold">
              {totalsRow.map((c, j) => <TableCell key={j} className={j === 0 ? '' : 'text-right'}>{c}</TableCell>)}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);