import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Banknote, CheckCircle, Clock, XCircle, RefreshCw, Edit } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast';

import { PaymentRecord } from '@/hooks/useFirebaseFinance';
import { ModificationRequestModal } from '../workflow/ModificationRequestModal';
import { useWorkflowTracking } from '@/hooks/useWorkflowTracking';

interface PaymentProcessingCardProps {
  pendingPayments: PaymentRecord[];
  processingPayments: PaymentRecord[];
  completedPayments: PaymentRecord[];
  rejectedPayments: PaymentRecord[]; // Add rejected payments
  onProcessPayment: (paymentId: string, method: 'Bank Transfer' | 'Cash', actualAmount?: number) => void;
  onModifyPayment: (paymentId: string, targetDepartment: string, reason: string, comments?: string) => void;
  formatCurrency: (amount: number) => string;
}

const PaymentProcessingCard: React.FC<PaymentProcessingCardProps> = ({
  pendingPayments,
  processingPayments,
  completedPayments,
  rejectedPayments,
  onProcessPayment,
  onModifyPayment,
  formatCurrency
}) => {
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [modificationModalOpen, setModificationModalOpen] = useState(false);
  const [selectedPaymentForModification, setSelectedPaymentForModification] = useState<PaymentRecord | null>(null);
  const { createModificationRequest } = useWorkflowTracking();
  const { toast } = useToast();

  const handleProcessPayment = (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    console.log('Processing payment:', paymentId, method);
    onProcessPayment(paymentId, method);
    setSelectedPayment(null);
    setCashAmount("");
  };

  const handleCashPayment = () => {
    if (!selectedPayment || !cashAmount) return;

    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    onProcessPayment(selectedPayment.id, 'Cash', amount);
    setSelectedPayment(null);
    setCashAmount("");
  };

  const handleModificationRequest = async (targetDepartment: string, reason: string, comments?: string) => {
    if (!selectedPaymentForModification) return;
    
    await createModificationRequest({
      originalPaymentId: selectedPaymentForModification.id,
      qualityAssessmentId: selectedPaymentForModification.qualityAssessmentId,
      requestedBy: 'Finance Department',
      requestedByDepartment: 'Finance',
      targetDepartment,
      reason,
      comments,
      status: 'pending'
    });

    onModifyPayment(selectedPaymentForModification.id, targetDepartment, reason, comments);
    setSelectedPaymentForModification(null);
  };

  const renderPaymentCard = (payment: PaymentRecord, showActions: boolean = true) => (
    <Card key={payment.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-lg">{payment.supplier}</h4>
            <p className="text-sm text-muted-foreground">
              Batch: {payment.batchNumber || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
            {payment.paid_amount && payment.paid_amount < payment.amount && (
              <p className="text-sm text-orange-600">
                Paid: {formatCurrency(payment.paid_amount)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge 
            variant={
              payment.status === 'Pending' ? 'default' :
              payment.status === 'Processing' ? 'secondary' :
              payment.status === 'Paid' ? 'default' :
              payment.status === 'Rejected' ? 'destructive' :
              'outline'
            }
            className={
              payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
              payment.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
              payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
              payment.status === 'Rejected' ? 'bg-red-100 text-red-800' :
              ''
            }
          >
            {payment.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {payment.method || 'Bank Transfer'}
          </span>
        </div>

        {/* Show rejection reason if rejected */}
        {payment.status === 'Rejected' && payment.rejection_reason && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-medium text-red-800">
              Rejection Reason: {payment.rejection_reason.replace('_', ' ')}
            </p>
            {payment.rejection_comments && (
              <p className="text-sm text-red-700 mt-1">{payment.rejection_comments}</p>
            )}
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 mt-3">
            {payment.status === 'Pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onProcessPayment(payment.id, 'Bank Transfer')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Bank Transfer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPayment(payment)}
                >
                  <Banknote className="h-4 w-4 mr-1" />
                  Cash Payment
                </Button>
              </>
            )}
            
            {payment.status === 'Rejected' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPaymentForModification(payment);
                    setModificationModalOpen(true);
                  }}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Send for Modification
                </Button>
                <Button
                  size="sm"
                  onClick={() => onProcessPayment(payment.id, 'Bank Transfer')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resubmit
                </Button>
              </>
            )}
            
            {payment.status === 'Partial' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedPayment(payment)}
              >
                <Banknote className="h-4 w-4 mr-1" />
                Complete Payment
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({processingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Payments
              </CardTitle>
              <CardDescription>
                Payments waiting for processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No pending payments
                </p>
              ) : (
                <div className="grid gap-4">
                  {pendingPayments.map(payment => renderPaymentCard(payment))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Processing Payments
              </CardTitle>
              <CardDescription>
                Payments awaiting approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingPayments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No payments being processed
                </p>
              ) : (
                <div className="grid gap-4">
                  {processingPayments.map(payment => renderPaymentCard(payment, false))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Rejected Payments
              </CardTitle>
              <CardDescription>
                Payments that were rejected and need modification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedPayments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No rejected payments
                </p>
              ) : (
                <div className="grid gap-4">
                  {rejectedPayments.map(payment => renderPaymentCard(payment))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Completed Payments
              </CardTitle>
              <CardDescription>
                Successfully processed payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedPayments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No completed payments
                </p>
              ) : (
                <div className="grid gap-4">
                  {completedPayments.map(payment => renderPaymentCard(payment, false))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cash Payment Modal */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Process Cash Payment</DialogTitle>
              <CardDescription>Enter the cash amount received for {selectedPayment.supplier}</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cash-amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="cash-amount"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="col-span-3"
                  type="number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setSelectedPayment(null)}>
                Cancel
              </Button>
              <Button onClick={handleCashPayment}>Process Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ModificationRequestModal
        open={modificationModalOpen}
        onClose={() => {
          setModificationModalOpen(false);
          setSelectedPaymentForModification(null);
        }}
        onConfirm={handleModificationRequest}
        currentDepartment="Finance"
      />
    </div>
  );
};

export default PaymentProcessingCard;
