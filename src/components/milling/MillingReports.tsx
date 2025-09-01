import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, TrendingUp, TrendingDown, DollarSign, Package2, Users, CalendarCheck, Calendar, Files, Printer } from 'lucide-react';
import { useMillingData } from '@/hooks/useMillingData';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';

const MillingReports = () => {
  const { getReportData, stats, customers, transactions, cashTransactions } = useMillingData();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [quickFilter, setQuickFilter] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthReportData, setMonthReportData] = useState<any>(null);
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  // Handle quick filters
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    const today = new Date();
    
    switch (filter) {
      case 'previous-month':
        const prevMonth = subMonths(today, 1);
        const startOfPrevMonth = startOfMonth(prevMonth);
        const endOfPrevMonth = endOfMonth(prevMonth);
        setCustomDateRange({
          start: format(startOfPrevMonth, 'yyyy-MM-dd'),
          end: format(endOfPrevMonth, 'yyyy-MM-dd')
        });
        generateCustomReport(startOfPrevMonth, endOfPrevMonth);
        break;
      case 'current-month':
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = endOfMonth(today);
        setCustomDateRange({
          start: format(startOfCurrentMonth, 'yyyy-MM-dd'),
          end: format(endOfCurrentMonth, 'yyyy-MM-dd')
        });
        generateCustomReport(startOfCurrentMonth, endOfCurrentMonth);
        break;
      case 'all':
        setCustomDateRange({ start: '', end: '' });
        setReportData(null);
        break;
    }
  };

  const generateCustomReport = (startDate: Date, endDate: Date) => {
    const filteredTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate >= startDate && transDate <= endDate;
    });
    
    const filteredCashTransactions = cashTransactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate >= startDate && transDate <= endDate;
    });

    const data = {
      transactions: filteredTransactions,
      cashTransactions: filteredCashTransactions,
      summary: {
        totalKgsHulled: filteredTransactions.reduce((sum, t) => sum + t.kgs_hulled, 0),
        totalRevenue: filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0),
        totalCashReceived: filteredCashTransactions.reduce((sum, t) => sum + t.amount_paid, 0),
        totalTransactions: filteredTransactions.length,
        totalPayments: filteredCashTransactions.length
      }
    };
    
    setReportData(data);
  };

  const generateReport = () => {
    const data = getReportData(selectedPeriod);
    setReportData(data);
  };

  const exportReport = () => {
    if (!reportData) return;

    // Enhanced report content with best/worst customers and debt analysis
    const debtAnalysis = customerDebtAnalysis();
    const totalDebt = customers.reduce((sum, customer) => sum + customer.current_balance, 0);
    
    const reportContent = `
MILLING DEPARTMENT REPORT - ${selectedPeriod.toUpperCase()}
Generated on: ${new Date().toLocaleDateString()}

SUMMARY:
- Total KGs Hulled: ${reportData.summary.totalKgsHulled} kg
- Total Revenue: UGX ${reportData.summary.totalRevenue.toLocaleString()}
- Cash Received: UGX ${reportData.summary.totalCashReceived.toLocaleString()}
- Total Transactions: ${reportData.summary.totalTransactions}
- Total Payments: ${reportData.summary.totalPayments}
- Total Outstanding Debt: UGX ${totalDebt.toLocaleString()}

CUSTOMER DEBT ANALYSIS:
${debtAnalysis.highest ? `Best Performing Customer: ${debtAnalysis.highest.name} - Debt: UGX ${debtAnalysis.highest.currentBalance.toLocaleString()}` : 'No customer data available'}
${debtAnalysis.lowest ? `Lowest Debt Customer: ${debtAnalysis.lowest.name} - Debt: UGX ${debtAnalysis.lowest.currentBalance.toLocaleString()}` : ''}

TOP CUSTOMERS BY DEBT:
${debtAnalysis.all.slice(0, 10).map((customer, index) => 
  `${index + 1}. ${customer.name} - UGX ${customer.currentBalance.toLocaleString()} (${customer.transactions} transactions, ${customer.totalKgs}kg)`
).join('\n')}

TRANSACTIONS:
${reportData.transactions.map((t: any) => 
  `${t.date} - ${t.customer_name} - ${t.kgs_hulled}kg - UGX ${t.total_amount.toLocaleString()} (Balance: UGX ${t.balance.toLocaleString()})`
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

  // Generate month options for the past 12 months
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(today, i);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  };

  const generateMonthReport = (monthValue: string) => {
    const [year, month] = monthValue.split('-');
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month) - 1; // JavaScript months are 0-indexed
    
    const reportData = getReportData('monthly');
    const filteredTransactions = reportData.transactions.filter(t => 
      new Date(t.date).getMonth() === targetMonth && new Date(t.date).getFullYear() === targetYear
    );
    const filteredCashTransactions = reportData.cashTransactions.filter(t => 
      new Date(t.date).getMonth() === targetMonth && new Date(t.date).getFullYear() === targetYear
    );
    const filteredExpenses = reportData.expenses?.filter(e => 
      new Date(e.date).getMonth() === targetMonth && new Date(e.date).getFullYear() === targetYear
    ) || [];

    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netRevenue = totalRevenue - totalExpenses;

    const data = {
      transactions: filteredTransactions,
      cashTransactions: filteredCashTransactions,
      expenses: filteredExpenses,
      summary: {
        totalKgsHulled: filteredTransactions.reduce((sum, t) => sum + t.kgs_hulled, 0),
        totalRevenue,
        totalExpenses,
        netRevenue,
        totalCashReceived: filteredCashTransactions.reduce((sum, t) => sum + t.amount_paid, 0),
        totalTransactions: filteredTransactions.length,
        totalPayments: filteredCashTransactions.length
      },
      monthName: format(new Date(targetYear, targetMonth), 'MMMM yyyy')
    };
    
    setMonthReportData(data);
  };

  // Print month report
  const printMonthReport = () => {
    if (!monthReportData) return;

    const debtAnalysis = customerDebtAnalysis();
    const totalDebt = customers.reduce((sum, customer) => sum + customer.current_balance, 0);
    
    // Calculate daily totals
    const dailyTotals = monthReportData.transactions.reduce((acc: Record<string, {
      date: string;
      totalKgs: number;
      totalRevenue: number;
      totalAmountPaid: number;
      totalBalance: number;
      transactionCount: number;
    }>, transaction: any) => {
      const date = transaction.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          totalKgs: 0,
          totalRevenue: 0,
          totalAmountPaid: 0,
          totalBalance: 0,
          transactionCount: 0
        };
      }
      acc[date].totalKgs += transaction.kgs_hulled;
      acc[date].totalRevenue += transaction.total_amount;
      acc[date].totalAmountPaid += transaction.amount_paid;
      acc[date].totalBalance += transaction.balance;
      acc[date].transactionCount += 1;
      return acc;
    }, {});

    interface DailyTotal {
      date: string;
      totalKgs: number;
      totalRevenue: number;
      totalAmountPaid: number;
      totalBalance: number;
      transactionCount: number;
    }

    const sortedDailyTotals: DailyTotal[] = (Object.values(dailyTotals) as DailyTotal[]).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const printContent = `
      <html>
        <head>
          <title>Milling Report - ${monthReportData.monthName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 15px; 
              line-height: 1.4; 
              font-size: 12px;
            }
            h1, h2, h3 { 
              color: #333; 
              margin: 10px 0; 
            }
            h1 { font-size: 18px; }
            h2 { font-size: 14px; }
            h3 { font-size: 12px; }
            .print-header { 
              text-align: center; 
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .company-logo {
              height: 64px;
              width: auto;
              margin-bottom: 8px;
            }
            .company-name {
              font-weight: bold;
              font-size: 20px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
              color: #333;
            }
            .company-details {
              font-size: 12px;
              color: #666;
              margin-bottom: 16px;
            }
            .company-details p {
              margin: 4px 0;
            }
            .document-title {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #333;
              margin-bottom: 8px;
            }
            .document-info {
              font-size: 12px;
              color: #666;
            }
            .document-info p {
              margin: 4px 0;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              background: #f9f9f9;
            }
            .summary-table th,
            .summary-table td {
              border: 1px solid #333;
              padding: 8px;
              text-align: left;
            }
            .summary-table th {
              background: #ddd;
              font-weight: bold;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 11px;
            }
            .data-table th,
            .data-table td {
              border: 1px solid #333;
              padding: 4px;
              text-align: left;
            }
            .data-table th {
              background: #e0e0e0;
              font-weight: bold;
            }
            .data-table tr:nth-child(even) {
              background: #f5f5f5;
            }
            .amount {
              text-align: right;
            }
            .section { 
              margin: 15px 0; 
              page-break-inside: avoid;
            }
            .totals-row {
              background: #e0e0e0 !important;
              font-weight: bold;
            }
            @media print {
              body { margin: 10px; }
              .no-print { display: none; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <!-- Company Header -->
          <div class="print-header">
            <img 
              src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
              alt="Great Pearl Coffee Factory Logo" 
              class="company-logo" 
            />
            
            <h1 class="company-name">GREAT PEARL COFFEE FACTORY</h1>
            
            <div class="company-details">
              <p>Specialty Coffee Processing & Export</p>
              <p>+256781121639 / +256778536681</p>
              <p>www.greatpearlcoffee.com | greatpearlcoffee@gmail.com</p>
              <p>Uganda Coffee Development Authority Licensed</p>
            </div>
            
            <h2 class="document-title">MILLING DEPARTMENT MONTHLY REPORT</h2>
            <p class="document-title" style="font-size: 14px; margin-top: 4px;">${monthReportData.monthName}</p>
            
            <div class="document-info">
              <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
              <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div class="section">
            <h2>EXECUTIVE SUMMARY</h2>
            <table class="summary-table">
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Unit</th>
              </tr>
              <tr>
                <td>Total KGs Hulled</td>
                <td class="amount">${monthReportData.summary.totalKgsHulled.toLocaleString()}</td>
                <td>kg</td>
              </tr>
              <tr>
                <td>Total Revenue Generated</td>
                <td class="amount">UGX ${monthReportData.summary.totalRevenue.toLocaleString()}</td>
                <td>UGX</td>
              </tr>
              <tr>
                <td>Total Expenses</td>
                <td class="amount">UGX ${monthReportData.summary.totalExpenses.toLocaleString()}</td>
                <td>UGX</td>
              </tr>
              <tr style="background-color: #e8f5e8;">
                <td><strong>Net Revenue (After Expenses)</strong></td>
                <td class="amount"><strong>UGX ${monthReportData.summary.netRevenue.toLocaleString()}</strong></td>
                <td>UGX</td>
              </tr>
              <tr>
                <td>Cash Received</td>
                <td class="amount">UGX ${monthReportData.summary.totalCashReceived.toLocaleString()}</td>
                <td>UGX</td>
              </tr>
              <tr>
                <td>Outstanding Balance</td>
                <td class="amount">UGX ${(monthReportData.summary.totalRevenue - monthReportData.summary.totalCashReceived).toLocaleString()}</td>
                <td>UGX</td>
              </tr>
              <tr>
                <td>Total Transactions</td>
                <td class="amount">${monthReportData.summary.totalTransactions}</td>
                <td>Count</td>
              </tr>
              <tr>
                <td>Cash Payments Made</td>
                <td class="amount">${monthReportData.summary.totalPayments}</td>
                <td>Count</td>
              </tr>
              <tr class="totals-row">
                <td>Current Total Outstanding Debt</td>
                <td class="amount">UGX ${totalDebt.toLocaleString()}</td>
                <td>UGX</td>
              </tr>
            </table>
          </div>

          ${sortedDailyTotals.length > 0 ? `
          <div class="section">
            <h2>DAILY TOTALS SUMMARY</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transactions</th>
                  <th>KGs Hulled</th>
                  <th>Revenue Generated (UGX)</th>
                  <th>Amount Paid (UGX)</th>
                  <th>Balance Outstanding (UGX)</th>
                </tr>
              </thead>
              <tbody>
                ${sortedDailyTotals.map((daily: any) => `
                  <tr>
                    <td>${daily.date}</td>
                    <td class="amount">${daily.transactionCount}</td>
                    <td class="amount">${daily.totalKgs.toFixed(1)}</td>
                    <td class="amount">${daily.totalRevenue.toLocaleString()}</td>
                    <td class="amount">${daily.totalAmountPaid.toLocaleString()}</td>
                    <td class="amount">${daily.totalBalance.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="totals-row">
                  <td><strong>TOTALS</strong></td>
                  <td class="amount"><strong>${sortedDailyTotals.reduce((sum: number, d: any) => sum + d.transactionCount, 0)}</strong></td>
                  <td class="amount"><strong>${sortedDailyTotals.reduce((sum: number, d: DailyTotal) => sum + d.totalKgs, 0).toFixed(1)}</strong></td>
                  <td class="amount"><strong>${sortedDailyTotals.reduce((sum: number, d: any) => sum + d.totalRevenue, 0).toLocaleString()}</strong></td>
                  <td class="amount"><strong>${sortedDailyTotals.reduce((sum: number, d: any) => sum + d.totalAmountPaid, 0).toLocaleString()}</strong></td>
                  <td class="amount"><strong>${sortedDailyTotals.reduce((sum: number, d: any) => sum + d.totalBalance, 0).toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}

          ${monthReportData.expenses && monthReportData.expenses.length > 0 ? `
          <div class="section">
            <h2>EXPENSES BREAKDOWN</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount (UGX)</th>
                </tr>
              </thead>
              <tbody>
                ${monthReportData.expenses.map((expense: any) => `
                  <tr>
                    <td>${expense.date}</td>
                    <td>${expense.description}</td>
                    <td>${expense.category}</td>
                    <td class="amount">${expense.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="totals-row">
                  <td colspan="3"><strong>TOTAL EXPENSES</strong></td>
                  <td class="amount"><strong>${monthReportData.summary.totalExpenses.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="section">
            <h2>CUSTOMER DEBT RANKING</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Current Debt (UGX)</th>
                  <th>Monthly Revenue (UGX)</th>
                  <th>KGs Processed</th>
                  <th>Transactions</th>
                </tr>
              </thead>
              <tbody>
                ${debtAnalysis.all.slice(0, 20).map((customer, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${customer.name}</td>
                    <td class="amount">${customer.currentBalance.toLocaleString()}</td>
                    <td class="amount">${customer.totalRevenue.toLocaleString()}</td>
                    <td class="amount">${customer.totalKgs.toFixed(1)}</td>
                    <td class="amount">${customer.transactions}</td>
                  </tr>
                `).join('')}
                <tr class="totals-row">
                  <td colspan="2"><strong>TOTALS</strong></td>
                  <td class="amount"><strong>${debtAnalysis.all.reduce((sum, c) => sum + c.currentBalance, 0).toLocaleString()}</strong></td>
                  <td class="amount"><strong>${debtAnalysis.all.reduce((sum, c) => sum + c.totalRevenue, 0).toLocaleString()}</strong></td>
                  <td class="amount"><strong>${debtAnalysis.all.reduce((sum, c) => sum + c.totalKgs, 0).toFixed(1)}</strong></td>
                  <td class="amount"><strong>${debtAnalysis.all.reduce((sum, c) => sum + c.transactions, 0)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>DETAILED TRANSACTION LOG</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>KGs Hulled</th>
                  <th>Rate/KG (UGX)</th>
                  <th>Total Amount (UGX)</th>
                  <th>Amount Paid (UGX)</th>
                  <th>Balance (UGX)</th>
                </tr>
              </thead>
              <tbody>
                ${monthReportData.transactions.map((t: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${t.date}</td>
                    <td>${t.customer_name}</td>
                    <td class="amount">${t.kgs_hulled.toFixed(1)}</td>
                    <td class="amount">${t.rate_per_kg.toLocaleString()}</td>
                    <td class="amount">${t.total_amount.toLocaleString()}</td>
                    <td class="amount">${t.amount_paid.toLocaleString()}</td>
                    <td class="amount">${t.balance.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="totals-row">
                  <td colspan="3"><strong>TOTALS</strong></td>
                  <td class="amount"><strong>${monthReportData.transactions.reduce((sum: number, t: any) => sum + t.kgs_hulled, 0).toFixed(1)}</strong></td>
                  <td class="amount"><strong>-</strong></td>
                  <td class="amount"><strong>${monthReportData.transactions.reduce((sum: number, t: any) => sum + t.total_amount, 0).toLocaleString()}</strong></td>
                  <td class="amount"><strong>${monthReportData.transactions.reduce((sum: number, t: any) => sum + t.amount_paid, 0).toLocaleString()}</strong></td>
                  <td class="amount"><strong>${monthReportData.transactions.reduce((sum: number, t: any) => sum + t.balance, 0).toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>CASH PAYMENT LOG</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Payment Amount (UGX)</th>
                  <th>Payment Method</th>
                  <th>Previous Balance (UGX)</th>
                  <th>New Balance (UGX)</th>
                </tr>
              </thead>
              <tbody>
                ${monthReportData.cashTransactions.map((p: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${p.date}</td>
                    <td>${p.customer_name}</td>
                    <td class="amount">${p.amount_paid.toLocaleString()}</td>
                    <td>${p.payment_method || 'Cash'}</td>
                    <td class="amount">${p.previous_balance ? p.previous_balance.toLocaleString() : '-'}</td>
                    <td class="amount">${p.new_balance ? p.new_balance.toLocaleString() : '-'}</td>
                  </tr>
                `).join('')}
                <tr class="totals-row">
                  <td colspan="3"><strong>TOTAL PAYMENTS</strong></td>
                  <td class="amount"><strong>${monthReportData.cashTransactions.reduce((sum: number, p: any) => sum + p.amount_paid, 0).toLocaleString()}</strong></td>
                  <td colspan="3"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>FINANCIAL RECONCILIATION</h2>
            <table class="summary-table">
              <tr>
                <th>Description</th>
                <th>Amount (UGX)</th>
              </tr>
              <tr>
                <td>Opening Balance (Previous Month)</td>
                <td class="amount">-</td>
              </tr>
              <tr>
                <td>Total Revenue Generated This Month</td>
                <td class="amount">${monthReportData.summary.totalRevenue.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Less: Cash Payments Received</td>
                <td class="amount">(${monthReportData.summary.totalCashReceived.toLocaleString()})</td>
              </tr>
              <tr class="totals-row">
                <td><strong>Net Outstanding This Month</strong></td>
                <td class="amount"><strong>${(monthReportData.summary.totalRevenue - monthReportData.summary.totalCashReceived).toLocaleString()}</strong></td>
              </tr>
              <tr class="totals-row">
                <td><strong>Total Current Outstanding Debt</strong></td>
                <td class="amount"><strong>${totalDebt.toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>AUDIT NOTES & RECOMMENDATIONS</h2>
            <ul>
              <li><strong>Collection Priority:</strong> Follow up with top 5 debt customers for payment collection</li>
              <li><strong>Payment Terms:</strong> Review credit terms for customers with increasing debt trends</li>
              <li><strong>Cash Flow:</strong> Monitor daily cash receipts vs. credit sales ratio</li>
              <li><strong>Inventory:</strong> Verify physical stock matches transaction records</li>
              <li><strong>Reconciliation:</strong> Cross-check customer balances with individual ledger cards</li>
            </ul>
          </div>

          <div class="section" style="margin-top: 30px; border-top: 1px solid #333; padding-top: 10px;">
            <table style="width: 100%; border: none;">
              <tr>
                <td style="border: none; width: 50%;">
                  <strong>Prepared By:</strong><br>
                  Milling Department System<br>
                  <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
                  <strong>Time:</strong> ${new Date().toLocaleTimeString()}
                </td>
                <td style="border: none; width: 50%; text-align: right;">
                  <strong>Reviewed By:</strong><br><br>
                  _________________________<br>
                  Signature & Date
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Customer debt analysis for filtered data
  interface CustomerAnalysis {
    id: string;
    name: string;
    totalRevenue: number;
    totalKgs: number;
    transactions: number;
    currentBalance: number;
  }

  const customerDebtAnalysis = () => {
    if (!reportData || (!reportData.transactions.length && !reportData.cashTransactions.length)) {
      return { highest: null as CustomerAnalysis | null, lowest: null as CustomerAnalysis | null, all: [] as CustomerAnalysis[] };
    }

    const customerTotals = reportData.transactions.reduce((acc: Record<string, CustomerAnalysis>, transaction: any) => {
      if (!acc[transaction.customer_id]) {
        acc[transaction.customer_id] = {
          id: transaction.customer_id,
          name: transaction.customer_name,
          totalRevenue: 0,
          totalKgs: 0,
          transactions: 0,
          currentBalance: 0
        };
      }
      acc[transaction.customer_id].totalRevenue += transaction.total_amount;
      acc[transaction.customer_id].totalKgs += transaction.kgs_hulled;
      acc[transaction.customer_id].transactions += 1;
      return acc;
    }, {});

    // Add current balances from customers data
    Object.keys(customerTotals).forEach(customerId => {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        customerTotals[customerId].currentBalance = customer.current_balance;
      }
    });

    const customersArray = (Object.values(customerTotals) as CustomerAnalysis[]).sort((a, b) => b.currentBalance - a.currentBalance);
    
    return {
      highest: customersArray[0] || null,
      lowest: customersArray[customersArray.length - 1] || null,
      all: customersArray
    };
  };

  const debtAnalysis = customerDebtAnalysis();

  return (
    <div className="space-y-6">
      {/* Current Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">of {stats.totalCustomers} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monthly Reports & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={quickFilter === 'previous-month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('previous-month')}
              className="flex items-center gap-2"
            >
              <CalendarCheck className="h-4 w-4" />
              Previous Month
            </Button>
            <Button
              variant={quickFilter === 'current-month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('current-month')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Current Month
            </Button>
            <Button
              variant={quickFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('all')}
              className="flex items-center gap-2"
            >
              <Files className="h-4 w-4" />
              Clear Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Period Report
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
                  Export Report
                </Button>
              )}
              <Dialog open={showMonthSelector} onOpenChange={setShowMonthSelector}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Monthly Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Month to Print</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {getMonthOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (selectedMonth) {
                            generateMonthReport(selectedMonth);
                          }
                        }}
                        disabled={!selectedMonth}
                        className="flex-1"
                      >
                        Generate Report
                      </Button>
                      {monthReportData && (
                        <Button
                          onClick={() => {
                            printMonthReport();
                            setShowMonthSelector(false);
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                  <div className="text-sm text-muted-foreground">Cash Payments</div>
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

              {/* Customer Debt Analysis */}
              {(quickFilter === 'previous-month' || customDateRange.start) && debtAnalysis.all.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Customer Debt Analysis
                    {quickFilter === 'previous-month' && (
                      <Badge variant="outline">Previous Month</Badge>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Highest Debt Customer */}
                    {debtAnalysis.highest && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-red-500" />
                            Highest Debt Customer
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="font-semibold">{debtAnalysis.highest.name}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Current Debt:</span>
                                <p className="font-medium text-red-600">
                                  UGX {debtAnalysis.highest.currentBalance.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Revenue:</span>
                                <p className="font-medium">UGX {debtAnalysis.highest.totalRevenue.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">KGs Hulled:</span>
                                <p className="font-medium">{debtAnalysis.highest.totalKgs.toFixed(1)} kg</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Transactions:</span>
                                <p className="font-medium">{debtAnalysis.highest.transactions}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Lowest Debt Customer */}
                    {debtAnalysis.lowest && debtAnalysis.all.length > 1 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-green-500" />
                            Lowest Debt Customer
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="font-semibold">{debtAnalysis.lowest.name}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Current Debt:</span>
                                <p className="font-medium text-green-600">
                                  UGX {debtAnalysis.lowest.currentBalance.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Revenue:</span>
                                <p className="font-medium">UGX {debtAnalysis.lowest.totalRevenue.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">KGs Hulled:</span>
                                <p className="font-medium">{debtAnalysis.lowest.totalKgs.toFixed(1)} kg</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Transactions:</span>
                                <p className="font-medium">{debtAnalysis.lowest.transactions}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* All Customers Summary */}
                  {debtAnalysis.all.length > 2 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">All Customers Balance Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {debtAnalysis.all.map((customer, index) => (
                            <div key={customer.id} className="flex justify-between items-center text-sm py-1 border-b last:border-b-0">
                              <span className="font-medium">{customer.name}</span>
                              <div className="text-right">
                                <p className={`font-medium ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  UGX {customer.currentBalance.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">{customer.totalKgs.toFixed(1)} kg hulled</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
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