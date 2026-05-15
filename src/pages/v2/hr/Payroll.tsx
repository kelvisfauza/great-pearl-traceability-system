import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import V2Navigation from '@/components/v2/V2Navigation';
import PriceTicker from '@/components/PriceTicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calculator, Loader2, FileText } from 'lucide-react';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { PayrollRunsList } from '@/components/hr/payroll/PayrollRunsList';
import { PayrollReports } from '@/components/hr/payroll/PayrollReports';
import { useToast } from '@/hooks/use-toast';

const PayrollPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const { runs, loading, generatePreview, approveAndDisburse, reject } = usePayrollRuns();
  const [month, setMonth] = useState(new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  const [busy, setBusy] = useState(false);

  const pending = runs.filter(r => r.status === 'pending_approval');
  const history = runs.filter(r => r.status !== 'pending_approval');

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const run = await generatePreview(month, employee?.name || 'HR', employee?.email || '');
      toast({ title: 'Payroll preview ready', description: `${run.employee_count} employees • Net ${run.total_net.toLocaleString()} UGX` });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveAndDisburse(id, employee?.name || 'Admin', employee?.email || '');
      toast({ title: 'Approved & disbursed', description: 'Salaries credited to employee wallets.' });
    } catch (e: any) {
      toast({ title: 'Approval failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try { await reject(id); toast({ title: 'Run rejected' }); } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Calculator className="h-7 w-7 text-emerald-600" />
              <h1 className="text-3xl font-bold">Payroll & Statutory Deductions</h1>
            </div>
            <p className="text-muted-foreground">NSSF (5% employee + 10% employer) and URA PAYE applied before disbursement.</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1"><V2Navigation /></div>
          <div className="lg:col-span-4">
            <Tabs defaultValue="run">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="run">Run Payroll</TabsTrigger>
                <TabsTrigger value="approval">Pending Approval ({pending.length})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1" />Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="run">
                <Card>
                  <CardHeader><CardTitle>Generate Payroll Preview</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
                      <div>
                        <Label htmlFor="month">Payroll Month</Label>
                        <Input id="month" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="e.g. May 2026" />
                      </div>
                      <div className="flex items-end">
                        <Button disabled={busy || !month} onClick={handleGenerate}>
                          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
                          Generate Preview
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The preview computes gross salary, NSSF (5% employee + 10% employer), taxable income, PAYE, and net pay for every active employee. It then waits for admin approval before any disbursement.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approval">
                {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
                  <PayrollRunsList runs={pending} onApprove={handleApprove} onReject={handleReject} showActions />
                )}
              </TabsContent>

              <TabsContent value="history">
                {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : <PayrollRunsList runs={history} />}
              </TabsContent>

              <TabsContent value="reports">
                <PayrollReports />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;