import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, Printer, Download, Calculator } from 'lucide-react';
import { useFinanceStats } from '@/hooks/useFinanceStats';
import { useCompletedTransactions } from '@/hooks/useCompletedTransactions';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { useMillingData } from '@/hooks/useMillingData';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import { createPrintVerification, getVerificationHtml, getVerificationStyles } from '@/utils/printVerification';

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
  const [loading] = useState(false);

  const { stats } = useFinanceStats();
  const { transactions } = useCompletedTransactions();
  const { companyExpenses, userExpenseRequests } = useExpenseManagement();
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
        const transDate = parseISO(t.dateCompleted);
        return transDate >= fromDate && transDate <= toDate;
      });

      const filteredExpenses = [...companyExpenses, ...userExpenseRequests].filter(e => {
        const expenseDate = parseISO('dateRequested' in e ? e.dateRequested : e.dateCreated);
        return expenseDate >= fromDate && expenseDate <= toDate;
      });

      const filteredMillingTransactions = millingTransactions.filter(t => {
        const transDate = parseISO(t.date);
        return transDate >= fromDate && transDate <= toDate;
      });

      // Calculate balance sheet
      const totalRevenue = filteredTransactions
        .reduce((sum, t) => sum + t.amountPaid, 0);

      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netIncome = totalRevenue - totalExpenses;

      const totalAdvances = 0; // Will implement when advances system is ready

      // Calculate day book
      const dailySummary: { [key: string]: { income: number; expenses: number; net: number } } = {};
      
      filteredTransactions.forEach(t => {
        const date = t.dateCompleted.split('T')[0];
        if (!dailySummary[date]) {
          dailySummary[date] = { income: 0, expenses: 0, net: 0 };
        }
        dailySummary[date].income += t.amountPaid;
      });

      filteredExpenses.forEach(e => {
        const date = ('dateRequested' in e ? e.dateRequested : e.dateCreated).split('T')[0];
        if (!dailySummary[date]) {
          dailySummary[date] = { income: 0, expenses: 0, net: 0 };
        }
        dailySummary[date].expenses += e.amount;
      });

      // Calculate net for each day
      Object.keys(dailySummary).forEach(date => {
        dailySummary[date].net = dailySummary[date].income - dailySummary[date].expenses;
      });

      // Calculate average prices
      const averageBuyingPrice = 0; // Will implement when price data is available
      const averageSellingPrice = totalRevenue / (filteredTransactions.length || 1);
      const priceVariance = averageSellingPrice - averageBuyingPrice;

      // Operational data
      const totalKgsProcessed = 0; // Will implement when weight data is available
      const millingRevenue = filteredMillingTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);

      const reportData: ReportData = {
        dateRange: { from: dateFrom, to: dateTo },
        balanceSheet: {
          totalRevenue,
          totalExpenses,
          netIncome,
          cashOnHand: stats.availableCash,
          pendingPayments: stats.pendingCoffeeAmount,
          totalAdvances
        },
        dayBook: {
          transactions: [...filteredTransactions, ...filteredExpenses],
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

  const printReport = async () => {
    // Create verification record
    const { code, qrUrl } = await createPrintVerification({
      type: 'report',
      subtype: 'Business Report',
      reference_no: `BIZ-${dateFrom}-${dateTo}`,
      meta: { dateFrom, dateTo, reportType }
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Business Report - ${dateFrom} to ${dateTo}</title>
            <style>
              @page {
                margin: 0.5in;
                size: A4;
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px;
                line-height: 1.4;
                color: #333;
              }
              .company-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
                color: #1a365d;
              }
              .company-details {
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
              }
              .report-title {
                font-size: 20px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
                background: #f8f9fa;
                padding: 15px;
                border: 1px solid #ddd;
              }
              .section {
                margin: 30px 0;
                break-inside: avoid;
              }
              .section-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
                padding: 10px;
                background: #e9ecef;
                border-left: 4px solid #007bff;
              }
              .balance-sheet, .trial-balance {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
              }
              .balance-sheet th, .balance-sheet td,
              .trial-balance th, .trial-balance td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              .balance-sheet th, .trial-balance th {
                background-color: #f8f9fa;
                font-weight: bold;
              }
              .amount {
                text-align: right;
                font-weight: 500;
              }
              .total-row {
                background-color: #f1f3f4;
                font-weight: bold;
              }
              .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
              }
              .card {
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 5px;
              }
              .metric {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
                border-bottom: 1px dotted #ccc;
              }
              .positive { color: #28a745; }
              .negative { color: #dc3545; }
              .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 15px;
              }
              .page-break {
                page-break-before: always;
              }
            </style>
          </head>
          <body>
            <div class="company-header">
              <div class="company-name">GREAT PEARL COFFEE FACTORY</div>
              <div class="company-details">
                Specialty Coffee Processing & Export<br>
                Tel: +256 781 121 639 | Web: www.greatpearlcoffee.com<br>
                Email: info@greatpearlcoffee.com<br>
                Uganda Coffee Development Authority Licensed
              </div>
            </div>

            <div class="report-title">
              COMPREHENSIVE BUSINESS REPORT<br>
              <small>Period: ${format(parseISO(reportData.dateRange.from), 'MMMM dd, yyyy')} - ${format(parseISO(reportData.dateRange.to), 'MMMM dd, yyyy')}</small>
            </div>

            <!-- Balance Sheet Section -->
            <div class="section">
              <div class="section-title">BALANCE SHEET</div>
              <table class="balance-sheet">
                <thead>
                  <tr>
                    <th colspan="2">ASSETS</th>
                    <th>AMOUNT (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="2">Current Assets</td>
                    <td class="amount">${reportData.balanceSheet.cashOnHand.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 20px;">Cash on Hand</td>
                    <td></td>
                    <td class="amount">${reportData.balanceSheet.cashOnHand.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 20px;">Accounts Receivable</td>
                    <td></td>
                    <td class="amount">${reportData.balanceSheet.pendingPayments.toLocaleString()}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2"><strong>Total Assets</strong></td>
                    <td class="amount"><strong>${(reportData.balanceSheet.cashOnHand + reportData.balanceSheet.pendingPayments).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>

              <table class="balance-sheet" style="margin-top: 20px;">
                <thead>
                  <tr>
                    <th colspan="2">LIABILITIES & EQUITY</th>
                    <th>AMOUNT (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="2">Current Liabilities</td>
                    <td class="amount">${reportData.balanceSheet.totalAdvances.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 20px;">Advances Payable</td>
                    <td></td>
                    <td class="amount">${reportData.balanceSheet.totalAdvances.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colspan="2">Equity</td>
                    <td class="amount">${reportData.balanceSheet.netIncome.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 20px;">Retained Earnings</td>
                    <td></td>
                    <td class="amount">${reportData.balanceSheet.netIncome.toLocaleString()}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2"><strong>Total Liabilities & Equity</strong></td>
                    <td class="amount"><strong>${(reportData.balanceSheet.totalAdvances + reportData.balanceSheet.netIncome).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Trial Balance Section -->
            <div class="section page-break">
              <div class="section-title">TRIAL BALANCE</div>
              <table class="trial-balance">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Debit (UGX)</th>
                    <th>Credit (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cash Account</td>
                    <td class="amount">${reportData.balanceSheet.cashOnHand.toLocaleString()}</td>
                    <td class="amount">-</td>
                  </tr>
                  <tr>
                    <td>Accounts Receivable</td>
                    <td class="amount">${reportData.balanceSheet.pendingPayments.toLocaleString()}</td>
                    <td class="amount">-</td>
                  </tr>
                  <tr>
                    <td>Revenue Account</td>
                    <td class="amount">-</td>
                    <td class="amount">${reportData.balanceSheet.totalRevenue.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Expense Account</td>
                    <td class="amount">${reportData.balanceSheet.totalExpenses.toLocaleString()}</td>
                    <td class="amount">-</td>
                  </tr>
                  <tr>
                    <td>Advances Payable</td>
                    <td class="amount">-</td>
                    <td class="amount">${reportData.balanceSheet.totalAdvances.toLocaleString()}</td>
                  </tr>
                  <tr class="total-row">
                    <td><strong>TOTALS</strong></td>
                    <td class="amount"><strong>${(reportData.balanceSheet.cashOnHand + reportData.balanceSheet.pendingPayments + reportData.balanceSheet.totalExpenses).toLocaleString()}</strong></td>
                    <td class="amount"><strong>${(reportData.balanceSheet.totalRevenue + reportData.balanceSheet.totalAdvances).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Financial Summary -->
            <div class="section">
              <div class="section-title">FINANCIAL SUMMARY</div>
              <div class="grid">
                <div class="card">
                  <h4>Income Statement</h4>
                  <div class="metric">
                    <span>Total Revenue:</span>
                    <span class="positive">${reportData.balanceSheet.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div class="metric">
                    <span>Total Expenses:</span>
                    <span class="negative">${reportData.balanceSheet.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div class="metric">
                    <span><strong>Net Income:</strong></span>
                    <span class="${reportData.balanceSheet.netIncome >= 0 ? 'positive' : 'negative'}"><strong>${reportData.balanceSheet.netIncome.toLocaleString()}</strong></span>
                  </div>
                </div>
                <div class="card">
                  <h4>Cash Flow</h4>
                  <div class="metric">
                    <span>Cash on Hand:</span>
                    <span>${reportData.balanceSheet.cashOnHand.toLocaleString()}</span>
                  </div>
                  <div class="metric">
                    <span>Pending Payments:</span>
                    <span class="negative">${reportData.balanceSheet.pendingPayments.toLocaleString()}</span>
                  </div>
                  <div class="metric">
                    <span>Total Advances:</span>
                    <span>${reportData.balanceSheet.totalAdvances.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Average Prices -->
            <div class="section">
              <div class="section-title">PRICING ANALYSIS</div>
              <div class="grid">
                <div class="card">
                  <div class="metric">
                    <span>Average Buying Price:</span>
                    <span>${reportData.averagePrices.averageBuyingPrice.toLocaleString()}/kg</span>
                  </div>
                  <div class="metric">
                    <span>Average Selling Price:</span>
                    <span>${reportData.averagePrices.averageSellingPrice.toLocaleString()}/kg</span>
                  </div>
                  <div class="metric">
                    <span>Price Variance:</span>
                    <span class="${reportData.averagePrices.priceVariance >= 0 ? 'positive' : 'negative'}">${reportData.averagePrices.priceVariance.toLocaleString()}/kg</span>
                  </div>
                </div>
                <div class="card">
                  <h4>Operational Metrics</h4>
                  <div class="metric">
                    <span>Total Kgs Processed:</span>
                    <span>${reportData.operationalData.totalKgsProcessed.toLocaleString()} kg</span>
                  </div>
                  <div class="metric">
                    <span>Total Customers:</span>
                    <span>${reportData.operationalData.totalCustomers}</span>
                  </div>
                  <div class="metric">
                    <span>Milling Revenue:</span>
                    <span class="positive">${reportData.operationalData.millingRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Daily Summary -->
            <div class="section page-break">
              <div class="section-title">DAILY TRANSACTION SUMMARY</div>
              <table class="trial-balance">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Income (UGX)</th>
                    <th>Expenses (UGX)</th>
                    <th>Net (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(reportData.dayBook.dailySummary)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, data]) => `
                      <tr>
                        <td>${format(parseISO(date), 'MMM dd, yyyy')}</td>
                        <td class="amount positive">${data.income.toLocaleString()}</td>
                        <td class="amount negative">${data.expenses.toLocaleString()}</td>
                        <td class="amount ${data.net >= 0 ? 'positive' : 'negative'}">${data.net.toLocaleString()}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>

            ${getVerificationHtml(code, qrUrl)}

            <div class="footer">
              <p>Report generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
              <p>This report is confidential and proprietary to Great Pearl Coffee Factory</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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
                disabled={generating || loading}
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