import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, TrendingUp, DollarSign, Package2 } from 'lucide-react';
import { useMillingData } from '@/hooks/useMillingData';

const MillingReports = () => {
  const { getReportData, stats } = useMillingData();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = () => {
    const data = getReportData(selectedPeriod);
    setReportData(data);
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportContent = `
MILLING DEPARTMENT REPORT - ${selectedPeriod.toUpperCase()}
Generated on: ${new Date().toLocaleDateString()}

SUMMARY:
- Total KGs Hulled: ${reportData.summary.totalKgsHulled} kg
- Total Revenue: UGX ${reportData.summary.totalRevenue.toLocaleString()}
- Cash Received: UGX ${reportData.summary.totalCashReceived.toLocaleString()}
- Total Transactions: ${reportData.summary.totalTransactions}
- Total Payments: ${reportData.summary.totalPayments}

TRANSACTIONS:
${reportData.transactions.map((t: any) => 
  `${t.date} - ${t.customer_name} - ${t.kgs_hulled}kg - UGX ${t.total_amount.toLocaleString()}`
).join('\n')}

PAYMENTS:
${reportData.cashTransactions.map((p: any) => 
  `${p.date} - ${p.customer_name} - UGX ${p.amount_paid.toLocaleString()}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milling-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Current Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KGs Processed</CardTitle>
            <Package2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKgsHulled.toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Debts</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {stats.totalDebts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total balances</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Period</label>
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={generateReport}>
                Generate Report
              </Button>
              {reportData && (
                <Button variant="outline" onClick={exportReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>

          {reportData && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{reportData.summary.totalKgsHulled}</div>
                  <div className="text-sm text-muted-foreground">KGs Hulled</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">UGX {reportData.summary.totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Revenue</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">UGX {reportData.summary.totalCashReceived.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Cash Received</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{reportData.summary.totalTransactions}</div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{reportData.summary.totalPayments}</div>
                  <div className="text-sm text-muted-foreground">Payments</div>
                </div>
              </div>

              {/* Transactions Table */}
              {reportData.transactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Transactions</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>KGs</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.transactions.map((transaction: any) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>{transaction.customer_name}</TableCell>
                            <TableCell>{transaction.kgs_hulled} kg</TableCell>
                            <TableCell>UGX {transaction.total_amount.toLocaleString()}</TableCell>
                            <TableCell>UGX {transaction.amount_paid.toLocaleString()}</TableCell>
                            <TableCell>UGX {transaction.balance.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MillingReports;