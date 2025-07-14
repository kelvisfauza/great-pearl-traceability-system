
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, Clock, CheckCircle2, AlertTriangle, Banknote, Receipt } from "lucide-react";
import { useState } from "react";
import ReceiptPrintModal from "./ReceiptPrintModal";

interface PaymentProcessingCardProps {
  pendingPayments: any[];
  processingPayments: any[];
  completedPayments: any[];
  onProcessPayment: (paymentId: string, method: 'Bank Transfer' | 'Cash', actualAmount?: number) => void;
  formatCurrency: (amount: number) => string;
}

const PaymentProcessingCard = ({ 
  pendingPayments, 
  processingPayments, 
  completedPayments, 
  onProcessPayment, 
  formatCurrency 
}: PaymentProcessingCardProps) => {
  const [cashPaymentDialog, setCashPaymentDialog] = useState<{open: boolean, payment: any}>({
    open: false,
    payment: null
  });
  const [actualAmount, setActualAmount] = useState('');
  const [receiptPrintModal, setReceiptPrintModal] = useState<{open: boolean, payment: any}>({
    open: false,
    payment: null
  });

  const handleCashPaymentClick = (payment: any) => {
    setCashPaymentDialog({open: true, payment});
    setActualAmount(payment.amount.toString());
  };

  const handleCashPaymentSubmit = () => {
    if (cashPaymentDialog.payment && actualAmount) {
      const amountPaid = parseFloat(actualAmount);
      onProcessPayment(cashPaymentDialog.payment.id, 'Cash', amountPaid);
      setCashPaymentDialog({open: false, payment: null});
      setActualAmount('');
    }
  };

  const getPaymentStatusBadge = (payment: any) => {
    const originalAmount = payment.amount;
    const paidAmount = payment.paid_amount || 0;
    const balance = originalAmount - paidAmount;

    if (balance <= 0) {
      return <Badge variant="default" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Fully Paid
      </Badge>;
    } else if (paidAmount > 0) {
      return <Badge variant="secondary" className="gap-1">
        <Banknote className="h-3 w-3" />
        Partial ({formatCurrency(balance)} remaining)
      </Badge>;
    } else {
      return <Badge variant="destructive">{payment.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Pending Payments
              </CardTitle>
              <CardDescription>Payments requiring immediate attention</CardDescription>
            </div>
            <Badge variant="destructive">{pendingPayments.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No pending payments to process</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => {
                    const originalAmount = payment.amount;
                    const paidAmount = payment.paid_amount || 0;
                    const balance = originalAmount - paidAmount;
                    
                    return (
                      <TableRow key={payment.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{payment.supplier}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.batchNumber || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-blue-600">
                          {formatCurrency(originalAmount)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(paidAmount)}
                        </TableCell>
                        <TableCell className="font-medium text-amber-600">
                          {formatCurrency(balance)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(payment)}
                        </TableCell>
                        <TableCell className="text-gray-500">{payment.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => onProcessPayment(payment.id, 'Bank Transfer')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Bank Transfer
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCashPaymentClick(payment)}
                            >
                              <Banknote className="h-4 w-4 mr-1" />
                              Cash
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Payment Dialog */}
      <Dialog open={cashPaymentDialog.open} onOpenChange={(open) => setCashPaymentDialog({open, payment: null})}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Cash Payment
            </DialogTitle>
            <DialogDescription>
              Process cash payment for {cashPaymentDialog.payment?.supplier}
            </DialogDescription>
          </DialogHeader>
          {cashPaymentDialog.payment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(cashPaymentDialog.payment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Previously Paid:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(cashPaymentDialog.payment.paid_amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-gray-600">Remaining Balance:</span>
                  <span className="font-bold text-amber-600">
                    {formatCurrency(cashPaymentDialog.payment.amount - (cashPaymentDialog.payment.paid_amount || 0))}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Amount Being Paid (UGX)
                </label>
                <Input
                  type="number"
                  placeholder="Enter actual amount paid"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  You can enter partial payments. The remaining balance will be tracked.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCashPaymentDialog({open: false, payment: null})}
            >
              Cancel
            </Button>
            <Button onClick={handleCashPaymentSubmit}>
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Payments */}
      {processingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Awaiting Approval
            </CardTitle>
            <CardDescription>Payments pending manager approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.supplier}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.batchNumber || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Processing
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">{payment.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completed Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Recent Completions
          </CardTitle>
          <CardDescription>Successfully processed payments</CardDescription>
        </CardHeader>
        <CardContent>
          {completedPayments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No completed payments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedPayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{payment.supplier}</p>
                      <p className="text-sm text-gray-500">
                        {payment.method} • {payment.date}
                        {payment.batchNumber && ` • ${payment.batchNumber}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                    {getPaymentStatusBadge(payment)}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => setReceiptPrintModal({open: true, payment})}
                    >
                      <Receipt className="h-4 w-4 mr-1" />
                      Print Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Print Modal */}
      <ReceiptPrintModal 
        isOpen={receiptPrintModal.open}
        onClose={() => setReceiptPrintModal({open: false, payment: null})}
        payment={receiptPrintModal.payment}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

export default PaymentProcessingCard;
