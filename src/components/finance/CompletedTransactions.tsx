import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CheckCircle, Search, DollarSign, Calendar, User, Receipt } from 'lucide-react';
import { useCompletedTransactions } from '@/hooks/useCompletedTransactions';

export const CompletedTransactions = () => {
  const { transactions, loading } = useCompletedTransactions();
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'Cash': return 'bg-green-100 text-green-800 border-green-200';
      case 'Bank Transfer': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const coffeeTransactions = filteredTransactions.filter(t => t.type === 'coffee');
  const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
  const hrTransactions = filteredTransactions.filter(t => t.type === 'hr');
  const cashTransactions = filteredTransactions.filter(t => t.type === 'cash');

  if (loading) {
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
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Completed Transactions
          </CardTitle>
          <CardDescription>
            All successfully processed payments and transactions
          </CardDescription>
          
          <div className="flex items-center gap-2 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier or batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="coffee" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="coffee">
                Coffee Payments ({coffeeTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="cash">
                Cash Deposits ({cashTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="expenses">
                Expense Payments ({expenseTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="hr">
                HR Payments ({hrTransactions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="coffee" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Date Completed</TableHead>
                    <TableHead>Processed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coffeeTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge variant="outline">{transaction.batchNumber}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {transaction.supplier}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getMethodBadgeColor(transaction.method)}>
                          {transaction.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {formatCurrency(transaction.amountPaid)}
                      </TableCell>
                      <TableCell>
                        {transaction.balance > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {formatCurrency(transaction.balance)}
                          </span>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {transaction.dateCompleted}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.processedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {coffeeTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No completed coffee payments</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cash" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Confirmed</TableHead>
                    <TableHead>Confirmed By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50">
                          {transaction.batchNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {transaction.supplier}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {formatCurrency(transaction.amountPaid)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {transaction.dateCompleted}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.processedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.notes || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {cashTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No confirmed cash deposits</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Completed</TableHead>
                    <TableHead>Approved By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {transaction.supplier}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getMethodBadgeColor(transaction.method)}>
                          {transaction.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">
                        {formatCurrency(transaction.amountPaid)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {transaction.dateCompleted}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.processedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {expenseTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No completed expense payments</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="hr" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Completed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hrTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {transaction.supplier}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.description}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getMethodBadgeColor(transaction.method)}>
                          {transaction.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-purple-600">
                        {formatCurrency(transaction.amountPaid)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {transaction.dateCompleted}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.notes || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hrTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No completed HR payments</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};