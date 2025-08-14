import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, Printer, Download, Calculator } from 'lucide-react';
import { useFirebaseFinance } from '@/hooks/useFirebaseFinance';
import { useMillingData } from '@/hooks/useMillingData';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';

interface ReportData {
  dateRange: {
    from: string;
    to: string;
  };
  balanceSheet: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashOnHand: number;
    pendingPayments: number;
    totalAdvances: number;
  };
  dayBook: {
    transactions: any[];
    dailySummary: { [key: string]: { income: number; expenses: number; net: number } };
  };
  averagePrices: {
    averageBuyingPrice: number;
    averageSellingPrice: number;
    priceVariance: number;
  };
  operationalData: {
    totalKgsProcessed: number;
    totalCustomers: number;
    millingRevenue: number;
  };
}

const PrintReportGenerator = () => {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState('weekly');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const { transactions, expenses, payments, stats, loading: financeLoading } = useFirebaseFinance();
  const { transactions: millingTransactions, cashTransactions, stats: millingStats } = useMillingData();

  const setQuickDateRange = (type: string) => {
    const today = new Date();
    switch (type) {
      case 'today':
        setDateFrom(format(today, 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'week':
        setDateFrom(format(startOfWeek(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfWeek(today), 'yyyy-MM-dd'));
        break;
      case 'month':
        setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'last7days':
        setDateFrom(format(subDays(today, 7), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  const generateReportData = async () => {
    setGenerating(true);
    try {
      const fromDate = parseISO(dateFrom);
      const toDate = parseISO(dateTo);

      // Filter data by date range
      const filteredTransactions = transactions.filter(t => {
        const transDate = parseISO(t.date);
        return transDate >= fromDate && transDate <= toDate;
      });

      const filteredExpenses = expenses.filter(e => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= fromDate && expenseDate <= toDate;
      });

      const filteredPayments = payments.filter(p => {
        const paymentDate = parseISO(p.date);
        return paymentDate >= fromDate && paymentDate <= toDate;
      });

      const filteredMillingTransactions = millingTransactions.filter(t => {
        const transDate = parseISO(t.date);
        return transDate >= fromDate && transDate <= toDate;
      });

      // Calculate balance sheet
      const totalRevenue = filteredTransactions
        .filter(t => t.type === 'Income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netIncome = totalRevenue - totalExpenses;

      const totalAdvances = filteredPayments
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + p.amount, 0);

      // Calculate day book
      const dailySummary: { [key: string]: { income: number; expenses: number; net: number } } = {};
      
      filteredTransactions.forEach(t => {
        const date = t.date;
        if (!dailySummary[date]) {
          dailySummary[date] = { income: 0, expenses: 0, net: 0 };
        }
        if (t.type === 'Income') {
          dailySummary[date].income += t.amount;
        } else {
          dailySummary[date].expenses += t.amount;
        }
      });

      filteredExpenses.forEach(e => {
        const date = e.date;
        if (!dailySummary[date]) {
          dailySummary[date] = { income: 0, expenses: 0, net: 0 };
        }
        dailySummary[date].expenses += e.amount;
      });

      // Calculate net for each day
      Object.keys(dailySummary).forEach(date => {
        dailySummary[date].net = dailySummary[date].income - dailySummary[date].expenses;
      });

      // Calculate average prices (mock calculation - you can implement based on your data)
      const averageBuyingPrice = filteredPayments.length > 0 
        ? filteredPayments.reduce((sum, p) => sum + p.amount, 0) / filteredPayments.length
        : 0;

      const averageSellingPrice = totalRevenue / (filteredTransactions.filter(t => t.type === 'Income').length || 1);
      const priceVariance = averageSellingPrice - averageBuyingPrice;

      // Operational data
      const totalKgsProcessed = filteredMillingTransactions.reduce((sum, t) => sum + (t.kgs_hulled || 0), 0);
      const millingRevenue = filteredMillingTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);

      const reportData: ReportData = {
        dateRange: { from: dateFrom, to: dateTo },
        balanceSheet: {
          totalRevenue,
          totalExpenses,
          netIncome,
          cashOnHand: stats.cashOnHand,
          pendingPayments: stats.pendingPayments,
          totalAdvances
        },
        dayBook: {
          transactions: [...filteredTransactions, ...filteredExpenses.map(e => ({ ...e, type: 'Expense' }))],
          dailySummary
        },
        averagePrices: {
          averageBuyingPrice,
          averageSellingPrice,
          priceVariance
        },
        operationalData: {
          totalKgsProcessed,
          totalCustomers: millingStats.totalCustomers,
          millingRevenue
        }
      };

      setReportData(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportContent = `
COMPREHENSIVE BUSINESS REPORT
${format(parseISO(reportData.dateRange.from), 'MMM dd, yyyy')} - ${format(parseISO(reportData.dateRange.to), 'MMM dd, yyyy')}

BALANCE SHEET
==============
Total Revenue: UGX ${reportData.balanceSheet.totalRevenue.toLocaleString()}
Total Expenses: UGX ${reportData.balanceSheet.totalExpenses.toLocaleString()}
Net Income: UGX ${reportData.balanceSheet.netIncome.toLocaleString()}
Cash on Hand: UGX ${reportData.balanceSheet.cashOnHand.toLocaleString()}
Pending Payments: UGX ${reportData.balanceSheet.pendingPayments.toLocaleString()}
Total Advances: UGX ${reportData.balanceSheet.totalAdvances.toLocaleString()}

AVERAGE PRICES
===============
Average Buying Price: UGX ${reportData.averagePrices.averageBuyingPrice.toLocaleString()}
Average Selling Price: UGX ${reportData.averagePrices.averageSellingPrice.toLocaleString()}
Price Variance: UGX ${reportData.averagePrices.priceVariance.toLocaleString()}

OPERATIONAL DATA
================
Total Kgs Processed: ${reportData.operationalData.totalKgsProcessed.toLocaleString()} kg
Total Customers: ${reportData.operationalData.totalCustomers}
Milling Revenue: UGX ${reportData.operationalData.millingRevenue.toLocaleString()}

DAILY SUMMARY
=============
${Object.entries(reportData.dayBook.dailySummary)
  .map(([date, data]) => 
    `${format(parseISO(date), 'MMM dd, yyyy')}: Income: UGX ${data.income.toLocaleString()}, Expenses: UGX ${data.expenses.toLocaleString()}, Net: UGX ${data.net.toLocaleString()}`
  ).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Report Generator Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Print Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <Select value={reportType} onValueChange={(value) => {
                setReportType(value);
                setQuickDateRange(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={generateReportData} 
                disabled={generating || financeLoading}
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {reportData && (
        <div className="print:shadow-none space-y-6">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="text-center print:pb-4">
              <CardTitle className="text-2xl">Business Report</CardTitle>
              <p className="text-muted-foreground">
                {format(parseISO(reportData.dateRange.from), 'MMMM dd, yyyy')} - {format(parseISO(reportData.dateRange.to), 'MMMM dd, yyyy')}
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Balance Sheet */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Balance Sheet
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(reportData.balanceSheet.totalRevenue)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(reportData.balanceSheet.totalExpenses)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Net Income</p>
                    <p className={`text-lg font-semibold ${reportData.balanceSheet.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(reportData.balanceSheet.netIncome)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Cash on Hand</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.balanceSheet.cashOnHand)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pending Payments</p>
                    <p className="text-lg font-semibold text-orange-600">{formatCurrency(reportData.balanceSheet.pendingPayments)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Advances</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.balanceSheet.totalAdvances)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Average Prices */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Average Prices</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Average Buying Price</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.averagePrices.averageBuyingPrice)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Average Selling Price</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.averagePrices.averageSellingPrice)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Price Variance</p>
                    <p className={`text-lg font-semibold ${reportData.averagePrices.priceVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(reportData.averagePrices.priceVariance)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Operational Data */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Operational Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Kgs Processed</p>
                    <p className="text-lg font-semibold">{reportData.operationalData.totalKgsProcessed.toLocaleString()} kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-lg font-semibold">{reportData.operationalData.totalCustomers}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Milling Revenue</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(reportData.operationalData.millingRevenue)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Daily Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Daily Summary</h3>
                <div className="space-y-3">
                  {Object.entries(reportData.dayBook.dailySummary)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, data]) => (
                      <div key={date} className="grid grid-cols-4 gap-4 py-2 border-b">
                        <div className="font-medium">{format(parseISO(date), 'MMM dd, yyyy')}</div>
                        <div className="text-green-600">{formatCurrency(data.income)}</div>
                        <div className="text-red-600">{formatCurrency(data.expenses)}</div>
                        <div className={`font-semibold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(data.net)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 print:hidden">
                <Button onClick={printReport} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
                <Button onClick={exportReport} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export as Text
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PrintReportGenerator;