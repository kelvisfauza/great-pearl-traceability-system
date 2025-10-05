import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coffee, DollarSign, Banknote, CreditCard, Eye, User, Calendar } from 'lucide-react';
import { usePendingCoffeePayments } from '@/hooks/usePendingCoffeePayments';
import { useToast } from '@/hooks/use-toast';

export const PendingCoffeePayments = () => {
  const { coffeePayments, loading, processPayment } = usePendingCoffeePayments();
  const { toast } = useToast();
  
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [cashAmount, setCashAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [financePrice, setFinancePrice] = useState('');

  const handleProcessPayment = async () => {
    if (!selectedPayment) return;

    // If not priced by Quality, Finance must set a price
    if (!selectedPayment.isPricedByQuality && !financePrice) {
      toast({
        title: "Price Required",
        description: "Please set a price per kg before processing payment",
        variant: "destructive"
      });
      return;
    }

    const pricePerKg = selectedPayment.isPricedByQuality 
      ? selectedPayment.pricePerKg 
      : parseFloat(financePrice);
    const totalAmount = selectedPayment.quantity * pricePerKg;
    const actualAmount = paymentMethod === 'Cash' ? parseFloat(cashAmount) || totalAmount : totalAmount;

    try {
      await processPayment({
        paymentId: selectedPayment.id,
        method: paymentMethod,
        amount: actualAmount,
        notes: paymentNotes,
        batchNumber: selectedPayment.batchNumber,
        supplier: selectedPayment.supplier
      });

      if (paymentMethod === 'Cash') {
        toast({
          title: "Cash Payment Processed",
          description: `Payment of UGX ${actualAmount.toLocaleString()} processed successfully`
        });
      } else {
        toast({
          title: "Bank Transfer Submitted",
          description: `Bank transfer submitted for admin approval - UGX ${totalAmount.toLocaleString()}`
        });
      }

      setShowPaymentDialog(false);
      setSelectedPayment(null);
      setCashAmount('');
      setPaymentNotes('');
      setFinancePrice('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

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
            <Coffee className="h-5 w-5" />
            Incoming Coffee Payments
          </CardTitle>
          <CardDescription>
            Coffee assessments completed by Quality Control ready for payment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coffeePayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coffee className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No pending coffee payments</p>
              <p className="text-sm mt-2">Completed quality assessments will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Quality Assessor</TableHead>
                  <TableHead>Quantity (kg)</TableHead>
                  <TableHead>Price/kg</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coffeePayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{payment.batchNumber}</Badge>
                    </TableCell>
                    <TableCell>{payment.supplier}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {payment.assessedBy}
                      </div>
                    </TableCell>
                    <TableCell>{payment.quantity}</TableCell>
                    <TableCell>
                      {payment.isPricedByQuality ? (
                        <div className="flex items-center gap-1">
                          {formatCurrency(payment.pricePerKg)}
                          <Badge variant="secondary" className="ml-2 text-xs">Quality</Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">Not Priced</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {payment.isPricedByQuality ? formatCurrency(payment.totalAmount) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {payment.dateAssessed}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setCashAmount(payment.totalAmount.toString());
                            setFinancePrice('');
                            setShowPaymentDialog(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          {payment.isPricedByQuality ? 'Process Payment' : 'Price & Pay'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Processing Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Coffee Payment</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p><span className="font-medium">Batch:</span> {selectedPayment.batchNumber}</p>
                <p><span className="font-medium">Supplier:</span> {selectedPayment.supplier}</p>
                <p><span className="font-medium">Quantity:</span> {selectedPayment.quantity} kg</p>
                {selectedPayment.isPricedByQuality ? (
                  <>
                    <p><span className="font-medium">Price/kg:</span> {formatCurrency(selectedPayment.pricePerKg)} <Badge variant="secondary" className="ml-2">Set by Quality</Badge></p>
                    <p><span className="font-medium">Total:</span> {formatCurrency(selectedPayment.totalAmount)}</p>
                  </>
                ) : (
                  <Badge variant="outline" className="text-yellow-600">⚠️ Not yet priced by Quality - Finance can set price</Badge>
                )}
              </div>

              <div className="space-y-4">
                {!selectedPayment.isPricedByQuality && (
                  <div>
                    <Label htmlFor="finance-price">Set Price per Kg (UGX)</Label>
                    <Input
                      id="finance-price"
                      type="number"
                      value={financePrice}
                      onChange={(e) => setFinancePrice(e.target.value)}
                      placeholder="Enter price per kilogram"
                    />
                    {financePrice && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Total: {formatCurrency(selectedPayment.quantity * parseFloat(financePrice || '0'))}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(value: 'Cash' | 'Bank') => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Cash Payment
                        </div>
                      </SelectItem>
                      <SelectItem value="Bank">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Bank Transfer (Admin Approval Required)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'Cash' && (
                  <div>
                    <Label htmlFor="cash-amount">Cash Amount</Label>
                    <Input
                      id="cash-amount"
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter partial amount for partial payment
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="payment-notes">Notes (Optional)</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add any payment notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleProcessPayment}
                  className="flex-1"
                >
                  {paymentMethod === 'Cash' ? 'Pay Cash' : 'Submit for Approval'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};