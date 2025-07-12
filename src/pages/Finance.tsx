import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Users, FileText, Receipt, Banknote, Calculator, PlusCircle, Eye, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const Finance = () => {
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [floatAmount, setFloatAmount] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptDescription, setReceiptDescription] = useState("");

  const payments = [
    { id: 1, supplier: "Bushenyi Cooperative", amount: "UGX 2,450,000", status: "Paid", date: "Today", method: "Bank Transfer" },
    { id: 2, supplier: "Masaka Traders", amount: "UGX 1,800,000", status: "Pending", date: "Yesterday", method: "Cash" },
    { id: 3, supplier: "Ntungamo Union", amount: "UGX 950,000", status: "Processing", date: "2 days ago", method: "Bank Transfer" },
  ];

  const pricedCoffee = [
    { id: 1, batchId: "BATCH-001", supplier: "Bushenyi Cooperative", kilograms: 500, price: "UGX 4,900/kg", totalAmount: "UGX 2,450,000", status: "Pending Payment", paymentMethod: "Bank", qualityScore: 94.2 },
    { id: 2, batchId: "BATCH-002", supplier: "Masaka Traders", kilograms: 360, price: "UGX 5,000/kg", totalAmount: "UGX 1,800,000", status: "Ready for Cash", paymentMethod: "Cash", qualityScore: 92.1 },
    { id: 3, batchId: "BATCH-003", supplier: "Ntungamo Union", kilograms: 190, price: "UGX 5,000/kg", totalAmount: "UGX 950,000", status: "Payment Issued", paymentMethod: "Bank", qualityScore: 95.3 },
  ];

  const dailyTransactions = [
    { id: 1, type: "Receipt", description: "Coffee Sale - Premium Grade", amount: "+UGX 3,200,000", time: "09:30 AM" },
    { id: 2, type: "Payment", description: "Supplier Payment - Bushenyi Coop", amount: "-UGX 2,450,000", time: "10:15 AM" },
    { id: 3, type: "Expense", description: "Transport Costs", amount: "-UGX 150,000", time: "11:00 AM" },
    { id: 4, type: "Float", description: "Daily Float Received", amount: "+UGX 500,000", time: "08:00 AM" },
  ];

  const expenses = [
    { id: 1, description: "Transport & Logistics", amount: "UGX 450,000", date: "Today", category: "Operations", status: "Approved" },
    { id: 2, description: "Equipment Maintenance", amount: "UGX 200,000", date: "Yesterday", category: "Maintenance", status: "Pending" },
    { id: 3, description: "Office Supplies", amount: "UGX 75,000", date: "2 days ago", category: "Admin", status: "Approved" },
  ];

  const handleBankPayment = (paymentId: number) => {
    toast({
      title: "Bank Payment Requested",
      description: "Payment request has been sent to managers for approval",
    });
  };

  const handleCashPayment = (paymentId: number) => {
    if (!cashAmount) {
      toast({
        title: "Error",
        description: "Please enter cash amount",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Cash Payment Issued",
      description: `Cash payment of ${cashAmount} has been processed`,
    });
    setCashAmount("");
  };

  const handleExpenseSubmit = () => {
    if (!expenseAmount || !expenseDescription) {
      toast({
        title: "Error",
        description: "Please fill in all expense details",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Expense Recorded",
      description: "Expense has been added to the system",
    });
    setExpenseAmount("");
    setExpenseDescription("");
  };

  const handleFloatSubmit = () => {
    if (!floatAmount) {
      toast({
        title: "Error",
        description: "Please enter float amount",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Float Recorded",
      description: `Daily float of ${floatAmount} has been recorded`,
    });
    setFloatAmount("");
  };

  const handleReceiptIssue = () => {
    if (!receiptAmount || !receiptDescription) {
      toast({
        title: "Error",
        description: "Please fill in receipt details",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Receipt Issued",
      description: "Receipt has been generated successfully",
    });
    setReceiptAmount("");
    setReceiptDescription("");
  };

  return (
    <Layout 
      title="Finance Management" 
      subtitle="Process payments, manage cash flow, and generate financial reports"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold">UGX 847M</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold">UGX 45M</p>
                </div>
                <CreditCard className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Operating Costs</p>
                  <p className="text-2xl font-bold">UGX 234M</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cash on Hand</p>
                  <p className="text-2xl font-bold">UGX 12M</p>
                </div>
                <Banknote className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="payments">Payment Processing</TabsTrigger>
            <TabsTrigger value="daily">Daily Reports</TabsTrigger>
            <TabsTrigger value="cash">Cash Management</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Priced Coffee - Payment Processing</CardTitle>
                <CardDescription>Process payments for coffee batches received from quality control</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Kilograms</TableHead>
                      <TableHead>Price/kg</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricedCoffee.map((coffee) => (
                      <TableRow key={coffee.id}>
                        <TableCell className="font-medium">{coffee.batchId}</TableCell>
                        <TableCell>{coffee.supplier}</TableCell>
                        <TableCell>{coffee.kilograms} kg</TableCell>
                        <TableCell>{coffee.price}</TableCell>
                        <TableCell className="font-bold">{coffee.totalAmount}</TableCell>
                        <TableCell>
                          <Badge variant={coffee.paymentMethod === "Bank" ? "default" : "secondary"}>
                            {coffee.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            coffee.status === "Payment Issued" ? "default" :
                            coffee.status === "Pending Payment" ? "destructive" : "secondary"
                          }>
                            {coffee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coffee.paymentMethod === "Bank" ? (
                            <Button size="sm" onClick={() => handleBankPayment(coffee.id)}>
                              Request Bank Payment
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Input
                                placeholder="Cash amount"
                                value={cashAmount}
                                onChange={(e) => setCashAmount(e.target.value)}
                                className="w-32"
                              />
                              <Button size="sm" onClick={() => handleCashPayment(coffee.id)}>
                                Issue Cash
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Transaction Report</CardTitle>
                  <CardDescription>Today's financial activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dailyTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {transaction.type === "Receipt" && <Receipt className="h-5 w-5 text-green-600" />}
                          {transaction.type === "Payment" && <CreditCard className="h-5 w-5 text-red-600" />}
                          {transaction.type === "Expense" && <FileText className="h-5 w-5 text-orange-600" />}
                          {transaction.type === "Float" && <Banknote className="h-5 w-5 text-blue-600" />}
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{transaction.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${transaction.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Balance</CardTitle>
                  <CardDescription>Cash flow summary for today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span className="font-medium">Total Receipts</span>
                      <span className="text-xl font-bold text-green-600">UGX 3,700,000</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                      <span className="font-medium">Total Payments</span>
                      <span className="text-xl font-bold text-red-600">UGX 2,600,000</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <span className="font-medium">Net Cash Flow</span>
                      <span className="text-xl font-bold text-blue-600">UGX 1,100,000</span>
                    </div>
                    <Button className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Daily Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cash" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Float Management</CardTitle>
                  <CardDescription>Record daily money received as float</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Float amount (UGX)"
                      value={floatAmount}
                      onChange={(e) => setFloatAmount(e.target.value)}
                    />
                    <Button onClick={handleFloatSubmit}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Record Float
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Current Float Balance</p>
                    <p className="text-2xl font-bold">UGX 500,000</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Issue Receipts</CardTitle>
                  <CardDescription>Generate receipts for transactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Amount (UGX)"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Description"
                    value={receiptDescription}
                    onChange={(e) => setReceiptDescription(e.target.value)}
                  />
                  <Button onClick={handleReceiptIssue} className="w-full">
                    <Receipt className="h-4 w-4 mr-2" />
                    Issue Receipt
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Record New Expense</CardTitle>
                  <CardDescription>Add expenses and payouts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Expense description"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                  />
                  <Input
                    placeholder="Amount (UGX)"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                  <Button onClick={handleExpenseSubmit} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Record Expense
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Recent expense transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-gray-500">{expense.category} • {expense.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{expense.amount}</p>
                          <Badge variant={expense.status === "Approved" ? "default" : "secondary"}>
                            {expense.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Payments</CardTitle>
                      <CardDescription>Latest supplier payments</CardDescription>
                    </div>
                    <Button>
                      <DollarSign className="h-4 w-4 mr-2" />
                      New Payment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{payment.supplier}</p>
                          <p className="text-sm text-gray-500">{payment.method} • {payment.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{payment.amount}</p>
                          <Badge variant={
                            payment.status === "Paid" ? "default" : 
                            payment.status === "Pending" ? "destructive" : "secondary"
                          }>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Summary</CardTitle>
                  <CardDescription>Financial overview for this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span className="font-medium">Total Revenue</span>
                      <span className="text-xl font-bold text-green-600">UGX 847M</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                      <span className="font-medium">Total Expenses</span>
                      <span className="text-xl font-bold text-red-600">UGX 623M</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <span className="font-medium">Net Profit</span>
                      <span className="text-xl font-bold text-blue-600">UGX 224M</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">Profit Margin</span>
                      <span className="text-xl font-bold text-gray-600">26.4%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Finance;
