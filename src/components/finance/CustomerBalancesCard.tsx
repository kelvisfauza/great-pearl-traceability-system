import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CreditCard, AlertCircle, CheckCircle2, Database } from "lucide-react";
import { useCombinedCustomerBalances } from "@/hooks/useCombinedCustomerBalances";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CustomerBalancesCardProps {
  formatCurrency: (amount: number) => string;
}

const CustomerBalancesCard = ({ formatCurrency }: CustomerBalancesCardProps) => {
  const { customers, addPayment, loading, getStats } = useCombinedCustomerBalances();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Get stats and filter customers with outstanding balances
  const stats = getStats();
  const customersWithBalances = customers.filter(c => c.current_balance > 0);

  const handleCompletePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedCustomer.current_balance) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount not exceeding the balance.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      await addPayment({
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        amount_paid: amount,
        payment_method: "Cash",
        notes: "Payment completion via Finance dashboard",
        date: new Date().toISOString().split('T')[0],
        created_by: "Finance Team"
      });

      toast({
        title: "Payment Completed",
        description: `Payment of ${formatCurrency(amount)} recorded for ${selectedCustomer.name}`,
      });

      setPaymentDialogOpen(false);
      setSelectedCustomer(null);
      setPaymentAmount("");
    } catch (error) {
      console.error('Error completing payment:', error);
      toast({
        title: "Error",
        description: "Failed to complete payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Customer Balances
        </CardTitle>
        <CardDescription>
          Track and complete customer payments for outstanding balances
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-sm font-medium text-amber-700">Outstanding Balances</p>
            <p className="text-2xl font-bold text-amber-900">{customersWithBalances.length}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-red-700">Total Amount Due</p>
            <p className="text-2xl font-bold text-red-900">
              {formatCurrency(stats.totalOutstanding)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-700">Data Sources</p>
            <div className="flex justify-center gap-2 mt-1">
              <Badge variant="outline">{stats.supabaseCustomers} Supabase</Badge>
              <Badge variant="outline">{stats.firebaseCustomers} Firebase</Badge>
            </div>
          </div>
        </div>

        {/* Customer Balances Table */}
        {customersWithBalances.length > 0 ? (
          <div className="space-y-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Outstanding Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersWithBalances.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.address || 'No address'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.source === 'supabase' ? 'default' : 'secondary'}
                          className="flex items-center gap-1 w-fit"
                        >
                          <Database className="h-3 w-3" />
                          {customer.source === 'supabase' ? 'Supabase' : 'Firebase'}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="text-red-600 font-semibold">
                          {formatCurrency(customer.current_balance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" />
                          Outstanding
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog open={paymentDialogOpen && selectedCustomer?.id === customer.id} onOpenChange={setPaymentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedCustomer(customer)}
                              className="flex items-center gap-2"
                            >
                              <CreditCard className="h-4 w-4" />
                              Complete Payment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Complete Payment for {customer.name}</DialogTitle>
                              <DialogDescription>
                                Record a payment to reduce or clear the outstanding balance
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="p-4 bg-muted rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium">Customer:</p>
                                    <p>{customer.name}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Current Balance:</p>
                                    <p className="text-red-600 font-bold">{formatCurrency(customer.current_balance)}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="payment-amount">Payment Amount</Label>
                                <Input
                                  id="payment-amount"
                                  type="number"
                                  placeholder="Enter payment amount"
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(e.target.value)}
                                  max={customer.current_balance}
                                  min="0.01"
                                  step="0.01"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Maximum: {formatCurrency(customer.current_balance)}
                                </p>
                              </div>

                              {paymentAmount && (
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <p className="text-sm">
                                    <span className="font-medium">New Balance:</span> {formatCurrency(Math.max(0, customer.current_balance - parseFloat(paymentAmount || "0")))}
                                  </p>
                                  {parseFloat(paymentAmount || "0") >= customer.current_balance && (
                                    <div className="flex items-center gap-2 mt-2 text-green-700">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span className="text-sm font-medium">Balance will be fully cleared</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setPaymentDialogOpen(false);
                                    setSelectedCustomer(null);
                                    setPaymentAmount("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleCompletePayment}
                                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || processing}
                                  className="flex items-center gap-2"
                                >
                                  {processing ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                  ) : (
                                    <CreditCard className="h-4 w-4" />
                                  )}
                                  Complete Payment
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Balances Cleared</h3>
            <p className="text-muted-foreground">No customers have outstanding balances at this time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerBalancesCard;