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

  // Generate report for selected month
  const generateMonthReport = (monthValue: string) => {
    const [year, month] = monthValue.split('-');
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    
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
      },
      monthName: format(startDate, 'MMMM yyyy')
    };
    
    setMonthReportData(data);
  };

  // Print month report
  const printMonthReport = () => {
    if (!monthReportData) return;

    const debtAnalysis = customerDebtAnalysis();
    const totalDebt = customers.reduce((sum, customer) => sum + customer.current_balance, 0);
    
    const printContent = `
      <html>
        <head>
          <title>Milling Report - ${monthReportData.monthName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            h1, h2 { color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; }
            .section { margin: 20px 0; }
            .customer-list { font-family: monospace; white-space: pre; }
            .transaction-list { font-family: monospace; white-space: pre; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MILLING DEPARTMENT MONTHLY REPORT</h1>
            <h2>${monthReportData.monthName}</h2>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section summary">
            <h2>EXECUTIVE SUMMARY</h2>
            <p><strong>Total KGs Hulled:</strong> ${monthReportData.summary.totalKgsHulled} kg</p>
            <p><strong>Total Revenue Generated:</strong> UGX ${monthReportData.summary.totalRevenue.toLocaleString()}</p>
            <p><strong>Cash Received:</strong> UGX ${monthReportData.summary.totalCashReceived.toLocaleString()}</p>
            <p><strong>Total Transactions:</strong> ${monthReportData.summary.totalTransactions}</p>
            <p><strong>Cash Payments:</strong> ${monthReportData.summary.totalPayments}</p>
            <p><strong>Current Total Outstanding Debt:</strong> UGX ${totalDebt.toLocaleString()}</p>
          </div>

          <div class="section">
            <h2>CUSTOMER PERFORMANCE ANALYSIS</h2>
            ${debtAnalysis.highest ? `
              <h3>HIGHEST DEBT CUSTOMER</h3>
              <p><strong>Name:</strong> ${debtAnalysis.highest.name}</p>
              <p><strong>Current Debt:</strong> UGX ${debtAnalysis.highest.currentBalance.toLocaleString()}</p>
              <p><strong>Revenue Generated:</strong> UGX ${debtAnalysis.highest.totalRevenue.toLocaleString()}</p>
              <p><strong>Total KGs Processed:</strong> ${debtAnalysis.highest.totalKgs.toFixed(1)} kg</p>
              <p><strong>Number of Transactions:</strong> ${debtAnalysis.highest.transactions}</p>
            ` : '<p>No customer data available</p>'}
          </div>

          <div class="section">
            <h2>CUSTOMER DEBT RANKING (Top 15)</h2>
            <div class="customer-list">${debtAnalysis.all.slice(0, 15).map((customer, index) => 
              `${(index + 1).toString().padStart(2, '0')}. ${customer.name.padEnd(25)} | Debt: UGX ${customer.currentBalance.toLocaleString().padStart(12)}`
            ).join('\n')}</div>
          </div>

          <div class="section">
            <h2>DETAILED TRANSACTION LOG</h2>
            <div class="transaction-list">${monthReportData.transactions.map((t: any, index: number) => 
              `${(index + 1).toString().padStart(3, '0')}. ${t.date} | ${t.customer_name.padEnd(20)} | ${t.kgs_hulled}kg | UGX ${t.total_amount.toLocaleString()}`
            ).join('\n')}</div>
          </div>

          <div class="section">
            <h2>CASH PAYMENT LOG</h2>
            <div class="transaction-list">${monthReportData.cashTransactions.map((p: any, index: number) => 
              `${(index + 1).toString().padStart(3, '0')}. ${p.date} | ${p.customer_name.padEnd(20)} | UGX ${p.amount_paid.toLocaleString()}`
            ).join('\n')}</div>
          </div>

          <div class="section">
            <h2>RECOMMENDATIONS</h2>
            <ul>
              <li>Follow up with high-debt customers for payment collection</li>
              <li>Review payment terms for customers with increasing debt</li>
              <li>Monitor transaction patterns for business insights</li>
              <li>Consider incentives for prompt payment customers</li>
            </ul>
          </div>

          <div class="section">
            <p><strong>Report Generated by:</strong> Milling Department System</p>
            <p><strong>Generation Time:</strong> ${new Date().toLocaleString()}</p>
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