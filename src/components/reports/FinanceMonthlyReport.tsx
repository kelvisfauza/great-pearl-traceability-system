import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileText, Download, Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { generateFinanceMonthlyReportPDF } from '@/utils/pdfGenerator';

interface MonthlyFinanceData {
  period: { start: string; end: string };
  totalPaid: number;
  coffeePaid: number;
  suppliersPaid: number;
  expensesPaid: number;
  unpaidTransactions: number;
  unpaidAmount: number;
  openingBalance: number;
  closingBalance: number;
  cashIn: number;
  cashOut: number;
  supplierDetails: Array<{
    name: string;
    amount: number;
    batches: number;
  }>;
  expenseDetails: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  unpaidDetails: Array<{
    type: string;
    description: string;
    amount: number;
    date: string;
  }>;
}

const FinanceMonthlyReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<MonthlyFinanceData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const monthDate = new Date(selectedMonth + '-01');
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const data: MonthlyFinanceData = {
        period: { start: startStr, end: endStr },
        totalPaid: 0,
        coffeePaid: 0,
        suppliersPaid: 0,
        expensesPaid: 0,
        unpaidTransactions: 0,
        unpaidAmount: 0,
        openingBalance: 0,
        closingBalance: 0,
        cashIn: 0,
        cashOut: 0,
        supplierDetails: [],
        expenseDetails: [],
        unpaidDetails: [],
      };

      // Calculate opening balance (before month start)
      const { data: txBeforeMonth } = await supabase
        .from('finance_cash_transactions')
        .select('amount')
        .eq('status', 'confirmed')
        .lt('confirmed_at', startDate.toISOString());

      data.openingBalance = txBeforeMonth?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Fetch all cash transactions for the month
      const { data: cashTransactions } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('status', 'confirmed')
        .gte('confirmed_at', startDate.toISOString())
        .lte('confirmed_at', endDate.toISOString());

      cashTransactions?.forEach(tx => {
        const amount = Math.abs(Number(tx.amount));
        if (tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'ADVANCE_RECOVERY') {
          data.cashIn += amount;
        } else if (tx.transaction_type === 'PAYMENT' || tx.transaction_type === 'EXPENSE') {
          data.cashOut += amount;
          data.totalPaid += amount;
          
          if (tx.transaction_type === 'EXPENSE') {
            data.expensesPaid += amount;
            data.expenseDetails.push({
              description: tx.notes || 'Expense',
              amount: amount,
              date: format(new Date(tx.confirmed_at), 'MMM dd, yyyy'),
            });
          }
        }
      });

      // Fetch coffee payments
      const { data: coffeePayments } = await supabase
        .from('payment_records')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .eq('status', 'Paid');

      const supplierMap = new Map<string, { amount: number; batches: number }>();

      coffeePayments?.forEach(payment => {
        const amount = Number(payment.amount) || 0;
        data.coffeePaid += amount;
        data.totalPaid += amount;
        data.cashOut += amount;

        const existing = supplierMap.get(payment.supplier) || { amount: 0, batches: 0 };
        supplierMap.set(payment.supplier, {
          amount: existing.amount + amount,
          batches: existing.batches + 1,
        });
      });

      data.suppliersPaid = supplierMap.size;
      data.supplierDetails = Array.from(supplierMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount);

      // Fetch unpaid transactions (pending coffee payments)
      const { data: pendingCoffee } = await supabase
        .from('payment_records')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .in('status', ['Pending', 'pending']);

      pendingCoffee?.forEach(payment => {
        const amount = Number(payment.amount) || 0;
        data.unpaidAmount += amount;
        data.unpaidTransactions += 1;
        data.unpaidDetails.push({
          type: 'Coffee Payment',
          description: `${payment.supplier} - ${payment.batch_number}`,
          amount: amount,
          date: payment.date,
        });
      });

      // Fetch unpaid expense requests
      const { data: pendingExpenses } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Expense Request')
        .in('status', ['Pending', 'pending'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      pendingExpenses?.forEach(expense => {
        const amount = Number(expense.amount) || 0;
        data.unpaidAmount += amount;
        data.unpaidTransactions += 1;
        data.unpaidDetails.push({
          type: 'Expense Request',
          description: expense.description || expense.type || 'Pending Expense',
          amount: amount,
          date: format(new Date(expense.created_at), 'yyyy-MM-dd'),
        });
      });

      data.closingBalance = data.openingBalance + data.cashIn - data.cashOut;

      setReportData(data);
      toast.success('Finance report generated successfully');
    } catch (error) {
      console.error('Error fetching monthly finance data:', error);
      toast.error('Failed to generate finance report');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!reportData) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      generateFinanceMonthlyReportPDF(reportData);
      toast.success('Finance report PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Monthly Finance Report
        </CardTitle>
        <CardDescription>
          Comprehensive end-of-month financial summary with payments, balances, and unpaid transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Selection */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Month</label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={format(new Date(), 'yyyy-MM')}
            />
          </div>
          <Button onClick={fetchMonthlyData} disabled={loading}>
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
          {reportData && (
            <Button onClick={handleGeneratePDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>

        {reportData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-2xl font-bold">
                        {reportData.totalPaid.toLocaleString()} UGX
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Coffee Paid</p>
                      <p className="text-2xl font-bold">
                        {reportData.coffeePaid.toLocaleString()} UGX
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reportData.suppliersPaid} suppliers
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Unpaid</p>
                      <p className="text-2xl font-bold">
                        {reportData.unpaidAmount.toLocaleString()} UGX
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reportData.unpaidTransactions} transactions
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Closing Balance</p>
                      <p className="text-2xl font-bold">
                        {reportData.closingBalance.toLocaleString()} UGX
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cash Flow Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Opening Balance</TableCell>
                      <TableCell className="text-right">
                        {reportData.openingBalance.toLocaleString()} UGX
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-green-600">Total Cash In</TableCell>
                      <TableCell className="text-right text-green-600">
                        +{reportData.cashIn.toLocaleString()} UGX
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-red-600">Total Cash Out</TableCell>
                      <TableCell className="text-right text-red-600">
                        -{reportData.cashOut.toLocaleString()} UGX
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Closing Balance</TableCell>
                      <TableCell className="text-right font-bold">
                        {reportData.closingBalance.toLocaleString()} UGX
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Supplier Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Batches</TableHead>
                      <TableHead className="text-right">Amount (UGX)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.supplierDetails.slice(0, 10).map((supplier, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell className="text-right">{supplier.batches}</TableCell>
                        <TableCell className="text-right">
                          {supplier.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reportData.supplierDetails.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No supplier payments this month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Unpaid Transactions */}
            {reportData.unpaidDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Unpaid Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount (UGX)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.unpaidDetails.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline">{item.type}</Badge>
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinanceMonthlyReport;
