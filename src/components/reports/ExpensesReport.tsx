import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Printer, DollarSign, Calendar, User, FileText, Download, Clock } from 'lucide-react';
import { useEnhancedExpenseManagement } from '@/hooks/useEnhancedExpenseManagement';
import { useOvertimeAwards } from '@/hooks/useOvertimeAwards';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';
import { useReactToPrint } from 'react-to-print';

export const ExpensesReport = () => {
  const { expenseRequests, loading } = useEnhancedExpenseManagement();
  const { awards: overtimeAwards, loading: overtimeLoading } = useOvertimeAwards();
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const printRef = useRef<HTMLDivElement>(null);

  // Filter approved expenses and salary requests
  const approvedExpenses = expenseRequests.filter(req => 
    req.status === 'Approved' && 
    req.financeApprovedAt && 
    req.adminApprovedAt &&
    (req.type === 'Employee Expense Request' || req.type.includes('Expense'))
  );

  const approvedSalaryRequests = expenseRequests.filter(req =>
    req.status === 'Approved' &&
    req.financeApprovedAt &&
    req.adminApprovedAt &&
    (req.type === 'Employee Salary Request' || req.type === 'Salary Payment')
  );

  const approvedRequisitions = expenseRequests.filter(req =>
    req.status === 'Approved' &&
    req.financeApprovedAt &&
    req.adminApprovedAt &&
    req.type === 'Requisition'
  );

  // Filter completed overtime awards
  const completedOvertimeAwards = overtimeAwards.filter(award => award.status === 'completed');

  console.log('Approved Expenses:', approvedExpenses.map(e => ({
    id: e.id,
    title: e.title,
    daterequested: e.daterequested,
    requestedby: e.requestedby,
    amount: e.amount
  })));

  console.log('Approved Salary Requests:', approvedSalaryRequests.map(s => ({
    id: s.id,
    title: s.title,
    daterequested: s.daterequested,
    requestedby: s.requestedby,
    amount: s.amount
  })));

  // Apply filters
  const filterByPeriod = (requests: any[]) => {
    if (filterPeriod === 'all') return requests;
    
    const now = new Date();
    const startDate = new Date();
    
    switch (filterPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        return requests;
    }
    
    return requests.filter(req => new Date(req.daterequested) >= startDate);
  };

  const filteredExpenses = filterByPeriod(approvedExpenses);
  const filteredSalaryRequests = filterByPeriod(approvedSalaryRequests);
  const filteredRequisitions = filterByPeriod(approvedRequisitions);
  
  // Filter overtime by period (using completed_at)
  const filterOvertimeByPeriod = (awards: any[]) => {
    if (filterPeriod === 'all') return awards;
    
    const now = new Date();
    const startDate = new Date();
    
    switch (filterPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        return awards;
    }
    
    return awards.filter(award => award.completed_at && new Date(award.completed_at) >= startDate);
  };

  const filteredOvertimeAwards = filterOvertimeByPeriod(completedOvertimeAwards);

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, req) => sum + (parseFloat(req.amount?.toString() || '0')), 0);
  const totalSalaryRequests = filteredSalaryRequests.reduce((sum, req) => sum + (parseFloat(req.amount?.toString() || '0')), 0);
  const totalRequisitions = filteredRequisitions.reduce((sum, req) => sum + (parseFloat(req.amount?.toString() || '0')), 0);
  const totalOvertime = filteredOvertimeAwards.reduce((sum, award) => sum + (award.total_amount || 0), 0);
  const grandTotal = totalExpenses + totalSalaryRequests + totalRequisitions + totalOvertime;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Expenses Report - ${new Date().toLocaleDateString('en-GB')}`,
  });

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `UGX ${numAmount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading || overtimeLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Expenses Report
              </CardTitle>
              <CardDescription>View and print approved expenses and salary payments</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-blue-600 mt-1">{filteredExpenses.length} transactions</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Total Salary Payments</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(totalSalaryRequests)}</p>
              <p className="text-xs text-green-600 mt-1">{filteredSalaryRequests.length} transactions</p>
            </div>
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <p className="text-sm text-cyan-600 font-medium">Total Requisitions</p>
              <p className="text-2xl font-bold text-cyan-800">{formatCurrency(totalRequisitions)}</p>
              <p className="text-xs text-cyan-600 mt-1">{filteredRequisitions.length} transactions</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Total Overtime</p>
              <p className="text-2xl font-bold text-orange-800">{formatCurrency(totalOvertime)}</p>
              <p className="text-xs text-orange-600 mt-1">{filteredOvertimeAwards.length} awards</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Grand Total</p>
              <p className="text-2xl font-bold text-purple-800">{formatCurrency(grandTotal)}</p>
              <p className="text-xs text-purple-600 mt-1">{filteredExpenses.length + filteredSalaryRequests.length + filteredRequisitions.length + filteredOvertimeAwards.length} total</p>
            </div>
          </div>

          {/* Tabs for Expenses, Salary Requests, Requisitions, and Overtime */}
          <Tabs defaultValue="expenses" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="expenses">
                Expense Requests ({filteredExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="salary">
                Salary Requests ({filteredSalaryRequests.length})
              </TabsTrigger>
              <TabsTrigger value="requisitions">
                Requisitions ({filteredRequisitions.length})
              </TabsTrigger>
              <TabsTrigger value="overtime">
                Overtime Awards ({filteredOvertimeAwards.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expenses">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No approved expenses found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Finance Approved</TableHead>
                      <TableHead>Admin Approved</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.daterequested)}</TableCell>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>{expense.requestedby}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{expense.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{expense.financeApprovedBy}</div>
                            <div className="text-muted-foreground">{formatDate(expense.financeApprovedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{expense.adminApprovedBy}</div>
                            <div className="text-muted-foreground">{formatDate(expense.adminApprovedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-blue-50 font-bold">
                      <TableCell colSpan={6} className="text-right">Subtotal:</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="salary">
              {filteredSalaryRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No approved salary requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Finance Approved</TableHead>
                      <TableHead>Admin Approved</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaryRequests.map((salary) => (
                      <TableRow key={salary.id}>
                        <TableCell>{formatDate(salary.daterequested)}</TableCell>
                        <TableCell className="font-medium">{salary.title}</TableCell>
                        <TableCell>{salary.requestedby}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{salary.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{salary.financeApprovedBy}</div>
                            <div className="text-muted-foreground">{formatDate(salary.financeApprovedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{salary.adminApprovedBy}</div>
                            <div className="text-muted-foreground">{formatDate(salary.adminApprovedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(salary.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-green-50 font-bold">
                      <TableCell colSpan={6} className="text-right">Subtotal:</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalSalaryRequests)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="requisitions">
              {filteredRequisitions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No approved requisitions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Finance Approved</TableHead>
                      <TableHead>Admin Approved</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequisitions.map((requisition) => (
                      <TableRow key={requisition.id}>
                        <TableCell>{formatDate(requisition.daterequested)}</TableCell>
                        <TableCell className="font-medium">{requisition.title}</TableCell>
                        <TableCell>{requisition.requestedby}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{requisition.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{requisition.financeApprovedBy}</div>
                            <div className="text-muted-foreground">{formatDate(requisition.financeApprovedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{requisition.adminApprovedBy}</div>
                            <div className="text-muted-foreground">{formatDate(requisition.adminApprovedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(requisition.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-cyan-50 font-bold">
                      <TableCell colSpan={6} className="text-right">Subtotal:</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRequisitions)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="overtime">
              {filteredOvertimeAwards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No completed overtime awards found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Completed Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Completed By</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOvertimeAwards.map((award) => (
                      <TableRow key={award.id}>
                        <TableCell>{formatDate(award.completed_at!)}</TableCell>
                        <TableCell className="font-medium">{award.employee_name}</TableCell>
                        <TableCell>{award.department}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{award.reference_number}</Badge>
                        </TableCell>
                        <TableCell>
                          {award.hours}h {award.minutes}m
                        </TableCell>
                        <TableCell className="text-xs">{award.completed_by}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(award.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-orange-50 font-bold">
                      <TableCell colSpan={6} className="text-right">Subtotal:</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalOvertime)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Hidden Print Content */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="p-8 bg-white">
          <StandardPrintHeader
            title="EXPENSES REPORT"
            subtitle={`Period: ${filterPeriod === 'all' ? 'All Time' : filterPeriod}`}
            documentNumber={`EXP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`}
            includeDate={true}
          />

          {/* Summary Section */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Summary</h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="border p-3 rounded">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-gray-500">{filteredExpenses.length} transactions</p>
              </div>
              <div className="border p-3 rounded">
                <p className="text-sm text-gray-600">Total Salary Payments</p>
                <p className="text-xl font-bold">{formatCurrency(totalSalaryRequests)}</p>
                <p className="text-xs text-gray-500">{filteredSalaryRequests.length} transactions</p>
              </div>
              <div className="border p-3 rounded">
                <p className="text-sm text-gray-600">Total Requisitions</p>
                <p className="text-xl font-bold">{formatCurrency(totalRequisitions)}</p>
                <p className="text-xs text-gray-500">{filteredRequisitions.length} transactions</p>
              </div>
              <div className="border p-3 rounded">
                <p className="text-sm text-gray-600">Total Overtime</p>
                <p className="text-xl font-bold">{formatCurrency(totalOvertime)}</p>
                <p className="text-xs text-gray-500">{filteredOvertimeAwards.length} awards</p>
              </div>
              <div className="border p-3 rounded bg-gray-50">
                <p className="text-sm text-gray-600">Grand Total</p>
                <p className="text-xl font-bold">{formatCurrency(grandTotal)}</p>
                <p className="text-xs text-gray-500">{filteredExpenses.length + filteredSalaryRequests.length + filteredRequisitions.length + filteredOvertimeAwards.length} total</p>
              </div>
            </div>
          </div>

          {/* Expense Requests Table */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Expense Requests</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Date</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Title</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Requested By</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Type</th>
                  <th className="border border-gray-300 px-2 py-2 text-right text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{formatDate(expense.daterequested)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{expense.title}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{expense.requestedby}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{expense.type}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(expense.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="border border-gray-300 px-2 py-2 text-sm text-right">Subtotal:</td>
                  <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Salary Requests Table */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Salary Requests</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Date</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Title</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Employee</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Type</th>
                  <th className="border border-gray-300 px-2 py-2 text-right text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalaryRequests.map((salary) => (
                  <tr key={salary.id}>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{formatDate(salary.daterequested)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{salary.title}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{salary.requestedby}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{salary.type}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(salary.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="border border-gray-300 px-2 py-2 text-sm text-right">Subtotal:</td>
                  <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(totalSalaryRequests)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Requisitions Table */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Requisitions</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Date</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Title</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Requested By</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Type</th>
                  <th className="border border-gray-300 px-2 py-2 text-right text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequisitions.map((requisition) => (
                  <tr key={requisition.id}>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{formatDate(requisition.daterequested)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{requisition.title}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{requisition.requestedby}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{requisition.type}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(requisition.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="border border-gray-300 px-2 py-2 text-sm text-right">Subtotal:</td>
                  <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(totalRequisitions)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Overtime Awards Table */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Overtime Awards</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Completed Date</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Employee</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Department</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Reference</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-sm">Hours</th>
                  <th className="border border-gray-300 px-2 py-2 text-right text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredOvertimeAwards.map((award) => (
                  <tr key={award.id}>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{formatDate(award.completed_at!)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{award.employee_name}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{award.department}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{award.reference_number}</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm">{award.hours}h {award.minutes}m</td>
                    <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(award.total_amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={5} className="border border-gray-300 px-2 py-2 text-sm text-right">Subtotal:</td>
                  <td className="border border-gray-300 px-2 py-2 text-sm text-right">{formatCurrency(totalOvertime)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grand Total */}
          <div className="mt-8 border-t-2 border-gray-800 pt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">GRAND TOTAL:</span>
              <span className="font-bold text-xl">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-300">
            <div className="grid grid-cols-3 gap-8 text-sm">
              <div>
                <p className="mb-2">Prepared By:</p>
                <div className="border-t border-gray-400 pt-2 mt-8">
                  <p>Finance Department</p>
                  <p className="text-xs text-gray-600">Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
              <div>
                <p className="mb-2">Reviewed By:</p>
                <div className="border-t border-gray-400 pt-2 mt-8">
                  <p>___________________</p>
                  <p className="text-xs text-gray-600">Admin Signature</p>
                </div>
              </div>
              <div>
                <p className="mb-2">Approved By:</p>
                <div className="border-t border-gray-400 pt-2 mt-8">
                  <p>___________________</p>
                  <p className="text-xs text-gray-600">Management Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
