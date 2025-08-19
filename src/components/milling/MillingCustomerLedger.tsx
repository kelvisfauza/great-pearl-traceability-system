import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMillingData } from "@/hooks/useMillingData";
import { format, isWithinInterval, parseISO } from 'date-fns';
import { CalendarIcon, Search, Printer, Download, Star, TrendingUp, TrendingDown, DollarSign, Package, User, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";
import MillingCustomerReportModal from './MillingCustomerReportModal';

const MillingCustomerLedger = () => {
  const { customers, transactions, cashTransactions } = useMillingData();
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCustomer, setReportCustomer] = useState<any>(null);

  // Filter customers based on search
  const filteredCustomers = customers?.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get customer analytics
  const getCustomerAnalytics = () => {
    if (!customers || !transactions) return { biggest: [], least: [], rated: [] };

    const customerStats = customers.map(customer => {
      const customerTransactions = transactions.filter(t => t.customer_id === customer.id);
      const customerCashTransactions = cashTransactions?.filter(t => t.customer_id === customer.id) || [];
      
      const totalTransactions = customerTransactions.length + customerCashTransactions.length;
      const totalAmount = customerTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const totalPaid = customerTransactions.reduce((sum, t) => sum + Number(t.amount_paid), 0) +
                       customerCashTransactions.reduce((sum, t) => sum + Number(t.amount_paid), 0);
      const outstandingBalance = Number(customer.current_balance);

      // Rating based on transaction frequency, amount, and payment reliability
      const paymentReliability = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 100;
      const frequency = totalTransactions;
      const rating = Math.min(5, Math.round((paymentReliability / 100 + Math.min(frequency / 10, 1)) * 2.5));

      return {
        ...customer,
        totalTransactions,
        totalAmount,
        totalPaid,
        outstandingBalance,
        paymentReliability,
        rating
      };
    });

    return {
      biggest: customerStats.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5),
      least: customerStats.sort((a, b) => a.totalAmount - b.totalAmount).slice(0, 5),
      rated: customerStats.sort((a, b) => b.rating - a.rating)
    };
  };

  // Get customer transactions
  const getCustomerTransactions = (customerId: string) => {
    const customerTxns = transactions?.filter(t => t.customer_id === customerId) || [];
    const customerCashTxns = cashTransactions?.filter(t => t.customer_id === customerId) || [];
    
    let allTransactions: any[] = [
      ...customerTxns.map(t => ({ ...t, type: 'service', date: parseISO(t.date) })),
      ...customerCashTxns.map(t => ({ ...t, type: 'payment', date: parseISO(t.date) }))
    ];

    // Filter by date range if selected
    if (dateRange.from && dateRange.to) {
      allTransactions = allTransactions.filter(t => 
        isWithinInterval(t.date, { start: dateRange.from!, end: dateRange.to! })
      );
    }

    return allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const analytics = getCustomerAnalytics();
  const selectedCustomerData = customers?.find(c => c.id === selectedCustomer);
  const customerTransactions = selectedCustomer ? getCustomerTransactions(selectedCustomer) : [];

  const handlePrintReport = (customer: any) => {
    setReportCustomer(customer);
    setShowReportModal(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={cn("h-4 w-4", i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} 
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customer Ledger</h2>
          <p className="text-muted-foreground">Manage customer transactions and analytics</p>
        </div>
      </div>

      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ledger">Customer Ledger</TabsTrigger>
          <TabsTrigger value="analytics">Customer Analytics</TabsTrigger>
          <TabsTrigger value="reports">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-fit">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          "Filter by date"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange as any}
                        onSelect={(range) => setDateRange(range || {})}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {selectedCustomerData && (
                    <Button 
                      onClick={() => handlePrintReport(selectedCustomerData)}
                      variant="outline"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print Report
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedCustomerData ? (
                <div className="space-y-6">
                  {/* Customer Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-semibold">{selectedCustomerData.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomerData.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="font-semibold text-lg">
                        UGX {Number(selectedCustomerData.current_balance).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                      <p className="font-semibold text-lg">{customerTransactions.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={selectedCustomerData.status === 'Active' ? 'default' : 'secondary'}>
                        {selectedCustomerData.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
                    {customerTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Balance Impact</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerTransactions.map((transaction, index) => (
                            <TableRow key={`${transaction.type}-${transaction.id}`}>
                              <TableCell>{format(transaction.date, 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <Badge variant={transaction.type === 'service' ? 'default' : 'secondary'}>
                                  {transaction.type === 'service' ? 'Service' : 'Payment'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {transaction.type === 'service' 
                                  ? `${(transaction as any).transaction_type} - ${(transaction as any).kgs_hulled}kg`
                                  : `Payment - ${(transaction as any).payment_method}`
                                }
                              </TableCell>
                              <TableCell>
                                UGX {Number(
                                  transaction.type === 'service' 
                                    ? (transaction as any).total_amount 
                                    : (transaction as any).amount_paid
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {transaction.type === 'service' ? (
                                  <span className="text-red-600 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +{Number((transaction as any).total_amount - (transaction as any).amount_paid).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-green-600 flex items-center">
                                    <TrendingDown className="h-4 w-4 mr-1" />
                                    -{Number((transaction as any).amount_paid).toLocaleString()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {transaction.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No transactions found for the selected period
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a customer to view their transaction history
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biggest Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top Customers by Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.biggest.map((customer, index) => (
                    <div key={customer.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{customer.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.totalTransactions} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">#{index + 1}</p>
                        <p className="text-sm text-green-600">
                          UGX {customer.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Ratings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Customer Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.rated.slice(0, 5).map((customer) => (
                    <div key={customer.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{customer.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.paymentReliability.toFixed(1)}% payment rate
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {renderStars(customer.rating)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* New/Inactive Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Least Active Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.least.map((customer, index) => (
                    <div key={customer.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{customer.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.totalTransactions} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-orange-600">
                          UGX {customer.totalAmount.toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Needs attention
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Customer Reports</CardTitle>
              <p className="text-muted-foreground">Generate detailed reports for specific customers and date ranges</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => {
                  const customerStats = analytics.rated.find(c => c.id === customer.id);
                  return (
                    <Card key={customer.id} className="border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{customer.full_name}</h3>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {customerStats && renderStars(customerStats.rating)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Balance</p>
                              <p className="font-medium">UGX {Number(customer.current_balance).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Transactions</p>
                              <p className="font-medium">{customerStats?.totalTransactions || 0}</p>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handlePrintReport(customer)}
                            className="w-full"
                            variant="outline"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Report
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showReportModal && reportCustomer && (
        <MillingCustomerReportModal
          customer={reportCustomer}
          onClose={() => {
            setShowReportModal(false);
            setReportCustomer(null);
          }}
        />
      )}
    </div>
  );
};

export default MillingCustomerLedger;