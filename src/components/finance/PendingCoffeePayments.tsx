import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDataDisplay, ColumnDef } from '@/components/ui/responsive-data-display';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Coffee, DollarSign, Banknote, CreditCard, Eye, User, Calendar, AlertCircle, XCircle, Search, X, Trash2 } from 'lucide-react';
import { usePendingCoffeePayments } from '@/hooks/usePendingCoffeePayments';
import { useToast } from '@/hooks/use-toast';
import { useSupplierAdvances } from '@/hooks/useSupplierAdvances';
import { useDeletionRequest } from '@/hooks/useDeletionRequest';

export const PendingCoffeePayments = () => {
  const { coffeePayments, loading, processPayment, refetch } = usePendingCoffeePayments();
  const { toast } = useToast();
  const { getTotalOutstanding } = useSupplierAdvances();
  const { submitDeletionRequest, isSubmitting: isDeletionSubmitting } = useDeletionRequest();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [cashAmount, setCashAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [financePrice, setFinancePrice] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState({ available: 0, required: 0 });
  const [processing, setProcessing] = useState(false);
  const [recoverAdvance, setRecoverAdvance] = useState(false);
  const [supplierOutstanding, setSupplierOutstanding] = useState(0);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  
  // Ref to prevent duplicate submissions (synchronous check)
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (selectedPayment && showPaymentDialog) {
      console.log('🔍 Checking advances for supplier:', {
        supplierId: selectedPayment.supplierId,
        supplierCode: selectedPayment.supplierCode,
        supplierName: selectedPayment.supplier
      });
      const outstanding = getTotalOutstanding(selectedPayment.supplierId, selectedPayment.supplierCode);
      console.log('💰 Outstanding advance found:', outstanding);
      setSupplierOutstanding(outstanding);
      // Only auto-check on initial dialog open, not on every change
      if (outstanding > 0) {
        setRecoverAdvance(true);
      }
    } else {
      // Reset when dialog closes
      setRecoverAdvance(false);
      setSupplierOutstanding(0);
    }
  }, [selectedPayment, showPaymentDialog]); // Removed getTotalOutstanding from dependencies

  const handleProcessPayment = async () => {
    // Synchronous check to prevent duplicate submissions
    if (!selectedPayment || processing || isProcessingRef.current) {
      console.log('⚠️ Payment blocked - already processing');
      return;
    }

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

    // Calculate advance recovery
    let advanceRecovered = 0;
    if (recoverAdvance && supplierOutstanding > 0) {
      advanceRecovered = Math.min(supplierOutstanding, actualAmount);
    }

    console.log('💵 Payment calculation:', {
      recoverAdvance,
      supplierOutstanding,
      actualAmount,
      advanceRecovered,
      netPayment: actualAmount - advanceRecovered
    });

    // Set both synchronous ref flag and async state
    isProcessingRef.current = true;
    setProcessing(true);
    try {
      await processPayment({
        paymentId: selectedPayment.id,
        qualityAssessmentId: selectedPayment.qualityAssessmentId,
        method: paymentMethod,
        amount: actualAmount,
        notes: paymentNotes,
        batchNumber: selectedPayment.batchNumber,
        supplier: selectedPayment.supplier,
        supplierId: selectedPayment.supplierId,
        supplierCode: selectedPayment.supplierCode,
        advanceRecovered: advanceRecovered
      });

      const netPayment = actualAmount - advanceRecovered;
      
      if (paymentMethod === 'Cash') {
        toast({
          title: "Cash Payment Processed",
          description: `Payment of UGX ${netPayment.toLocaleString()} processed${advanceRecovered > 0 ? ` (Advance recovered: UGX ${advanceRecovered.toLocaleString()})` : ''}`
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
      setRecoverAdvance(false);
      setSupplierOutstanding(0);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      // Check if it's an insufficient funds error
      if (error.message && error.message.includes('Insufficient funds')) {
        // Extract the amounts from the error message
        const availableMatch = error.message.match(/Available: UGX ([0-9,]+)/);
        const requiredMatch = error.message.match(/Required: UGX ([0-9,]+)/);
        
        const available = availableMatch ? parseFloat(availableMatch[1].replace(/,/g, '')) : 0;
        const required = requiredMatch ? parseFloat(requiredMatch[1].replace(/,/g, '')) : actualAmount;
        
        setErrorDetails({ available, required });
        setErrorDialogOpen(true);
        setShowPaymentDialog(false);
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to process payment. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleDelete = async () => {
    if (!selectedPayment || !deleteReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for deletion",
        variant: "destructive"
      });
      return;
    }

    // Submit deletion request for the coffee_record (which will cascade to quality_assessments)
    const success = await submitDeletionRequest(
      'coffee_records',
      selectedPayment.id, // Use the coffee record ID
      {
        ...selectedPayment,
        batch_number: selectedPayment.batchNumber,
        supplier_name: selectedPayment.supplier,
        quality_assessment_id: selectedPayment.qualityAssessmentId
      },
      deleteReason,
      `${selectedPayment.batchNumber} - ${selectedPayment.supplier} (${selectedPayment.quantity}kg)`
    );

    if (success) {
      setShowDeleteDialog(false);
      setSelectedPayment(null);
      setDeleteReason('');
      // Refetch the list after successful deletion
      refetch();
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  // Filter coffee payments based on search term
  const filteredPayments = useMemo(() => {
    if (!searchTerm) return coffeePayments;
    
    const lowerSearch = searchTerm.toLowerCase();
    return coffeePayments.filter(payment => 
      payment.batchNumber?.toLowerCase().includes(lowerSearch) ||
      payment.supplier?.toLowerCase().includes(lowerSearch) ||
      payment.assessedBy?.toLowerCase().includes(lowerSearch) ||
      payment.dateAssessed?.toLowerCase().includes(lowerSearch)
    );
  }, [coffeePayments, searchTerm]);

  // Define columns for responsive display
  const columns: ColumnDef<any>[] = [
    {
      header: "Batch Number",
      mobileLabel: "Batch",
      cell: (payment) => <Badge variant="outline">{payment.batchNumber}</Badge>
    },
    {
      header: "Supplier",
      cell: (payment) => payment.supplier
    },
    {
      header: "Quality Assessor",
      mobileLabel: "Assessor",
      cell: (payment) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {payment.assessedBy}
        </div>
      )
    },
    {
      header: "Quantity (kg)",
      mobileLabel: "Quantity",
      cell: (payment) => `${payment.quantity} kg`
    },
    {
      header: "Price/kg",
      mobileLabel: "Price",
      cell: (payment) => payment.isPricedByQuality ? (
        <div className="flex items-center gap-1">
          {formatCurrency(payment.pricePerKg)}
          <Badge variant="secondary" className="ml-2 text-xs">Quality</Badge>
        </div>
      ) : (
        <Badge variant="outline" className="text-warning">Not Priced</Badge>
      )
    },
    {
      header: "Total Amount",
      mobileLabel: "Total",
      cell: (payment) => (
        <span className="font-bold text-success">
          {payment.isPricedByQuality ? formatCurrency(payment.totalAmount) : '-'}
        </span>
      )
    },
    {
      header: "Date",
      cell: (payment) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {payment.dateAssessed}
        </div>
      ),
      hiddenOnMobile: true
    },
    {
      header: "Actions",
      cell: (payment) => (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPayment(payment);
              setShowDetailsDialog(true);
            }}
            className="text-xs"
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">View</span>
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPayment(payment);
              setCashAmount(payment.totalAmount.toString());
              setFinancePrice('');
              setShowPaymentDialog(true);
            }}
            className="bg-success hover:bg-success/90 text-xs"
          >
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">{payment.isPricedByQuality ? 'Pay' : 'Price'}</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPayment(payment);
              setDeleteReason('');
              setShowDeleteDialog(true);
            }}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      )
    }
  ];

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Coffee className="h-5 w-5" />
                Incoming Coffee Payments
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Coffee assessments completed by Quality Control ready for payment processing
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 text-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coffeePayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coffee className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No pending coffee payments</p>
              <p className="text-sm mt-2">Completed quality assessments will appear here</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No results found for "{searchTerm}"</p>
              <p className="text-sm mt-2">Try adjusting your search terms</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="mt-4"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <ResponsiveDataDisplay
              data={filteredPayments}
              columns={columns}
              getRowKey={(payment) => payment.id}
              mobileCardTitle={(payment) => (
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{payment.batchNumber}</Badge>
                  <Badge variant={payment.isPricedByQuality ? "secondary" : "outline"} className="text-xs">
                    {payment.isPricedByQuality ? "Priced" : "Not Priced"}
                  </Badge>
                </div>
              )}
            />
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
                <p><span className="font-medium">Supplier ID:</span> <code className="text-xs bg-gray-200 px-2 py-1 rounded">{selectedPayment.supplierId || 'NOT SET'}</code></p>
                <p><span className="font-medium">Quantity:</span> {selectedPayment.quantity} kg</p>
                <p><span className="font-medium">Advance Outstanding:</span> <span className={supplierOutstanding > 0 ? 'text-amber-600 font-bold' : 'text-gray-500'}>UGX {supplierOutstanding.toLocaleString()}</span></p>
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

                {supplierOutstanding > 0 && (
                  <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100">
                          Outstanding Advance
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          UGX {supplierOutstanding.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="recover-advance"
                        checked={recoverAdvance}
                        onCheckedChange={(checked) => setRecoverAdvance(checked as boolean)}
                      />
                      <Label htmlFor="recover-advance" className="text-sm cursor-pointer">
                        Recover advance from this payment
                      </Label>
                    </div>
                     {recoverAdvance && (
                      <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1 bg-white/50 dark:bg-black/20 p-3 rounded border border-amber-300">
                        <p className="flex justify-between">
                          <span>Gross Payment:</span>
                          <span className="font-semibold">UGX {parseFloat(cashAmount || financePrice && (selectedPayment.quantity * parseFloat(financePrice)).toString() || '0').toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between text-orange-700 dark:text-orange-400">
                          <span>- Advance Recovery:</span>
                          <span className="font-semibold">UGX {Math.min(supplierOutstanding, parseFloat(cashAmount || financePrice && (selectedPayment.quantity * parseFloat(financePrice)).toString() || '0')).toLocaleString()}</span>
                        </p>
                        <div className="border-t border-amber-300 pt-2 mt-2">
                          <p className="flex justify-between text-base font-bold text-green-700 dark:text-green-400">
                            <span>Net Payment to Supplier:</span>
                            <span>UGX {Math.max(0, parseFloat(cashAmount || financePrice && (selectedPayment.quantity * parseFloat(financePrice)).toString() || '0') - supplierOutstanding).toLocaleString()}</span>
                          </p>
                        </div>
                        {Math.min(supplierOutstanding, parseFloat(cashAmount || financePrice && (selectedPayment.quantity * parseFloat(financePrice)).toString() || '0')) === supplierOutstanding ? (
                          <p className="text-xs text-green-700 dark:text-green-400 font-medium mt-2">✓ Advance will be fully paid</p>
                        ) : (
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-2">
                            Remaining advance: UGX {(supplierOutstanding - Math.min(supplierOutstanding, parseFloat(cashAmount || financePrice && (selectedPayment.quantity * parseFloat(financePrice)).toString() || '0'))).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1"
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleProcessPayment}
                  className="flex-1"
                  disabled={processing}
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Processing...
                    </div>
                  ) : (
                    paymentMethod === 'Cash' ? 'Pay Cash' : 'Submit for Approval'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coffee Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this coffee delivery and assessment
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              {/* Batch Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  Batch Information
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Batch Number</Label>
                    <p className="font-medium mt-1">
                      <Badge variant="outline">{selectedPayment.batchNumber}</Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Coffee Type</Label>
                    <p className="font-medium mt-1">{selectedPayment.coffeeType || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Quantity</Label>
                    <p className="font-medium mt-1">{selectedPayment.quantity} kg</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Number of Bags</Label>
                    <p className="font-medium mt-1">{selectedPayment.bags || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Supplier Information
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Supplier Name</Label>
                    <p className="font-medium mt-1">{selectedPayment.supplier}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Supplier Code</Label>
                    <p className="font-medium mt-1">
                      <code className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                        {selectedPayment.supplierCode || 'Not set'}
                      </code>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Supplier ID</Label>
                    <p className="font-medium mt-1">
                      <code className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                        {selectedPayment.supplierId || 'Not set'}
                      </code>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Outstanding Advance</Label>
                    <p className={`font-medium mt-1 ${supplierOutstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      UGX {supplierOutstanding.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Store/Input Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Input & Creation Details
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Input By (Store User)</Label>
                    <p className="font-medium mt-1 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedPayment.createdBy || 'Store Department'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date Received</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{selectedPayment.dateReceived || selectedPayment.dateAssessed}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Assessment */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Quality Assessment
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Assessed By (Quality User)</Label>
                    <p className="font-medium mt-1 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedPayment.assessedBy}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Assessment Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{selectedPayment.dateAssessed}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Quality Grade</Label>
                    <p className="font-medium mt-1">
                      <Badge>{selectedPayment.qualityGrade || 'Standard'}</Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Assessment ID</Label>
                    <p className="font-medium mt-1">
                      <code className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                        {selectedPayment.qualityAssessmentId?.substring(0, 8) || 'N/A'}
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Information
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div>
                    <Label className="text-muted-foreground">Price per Kg</Label>
                    {selectedPayment.isPricedByQuality ? (
                      <div className="mt-1">
                        <p className="font-bold text-lg text-green-600">
                          {formatCurrency(selectedPayment.pricePerKg)}
                        </p>
                        <Badge variant="secondary" className="mt-1">Set by Quality Department</Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 mt-1">
                        ⚠️ Not yet priced
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Amount</Label>
                    <p className="font-bold text-lg text-green-600 mt-1">
                      {selectedPayment.isPricedByQuality ? formatCurrency(selectedPayment.totalAmount) : 'Pending pricing'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quality Parameters */}
              {selectedPayment.qualityParams && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Quality Parameters</h3>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                    {selectedPayment.qualityParams.moisture && (
                      <div>
                        <Label className="text-muted-foreground">Moisture</Label>
                        <p className="font-medium mt-1">{selectedPayment.qualityParams.moisture}%</p>
                      </div>
                    )}
                    {selectedPayment.qualityParams.defects && (
                      <div>
                        <Label className="text-muted-foreground">Defects</Label>
                        <p className="font-medium mt-1">{selectedPayment.qualityParams.defects}%</p>
                      </div>
                    )}
                    {selectedPayment.qualityParams.grade && (
                      <div>
                        <Label className="text-muted-foreground">Grade</Label>
                        <p className="font-medium mt-1">{selectedPayment.qualityParams.grade}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)} variant="outline">
              Close
            </Button>
            <Button 
              onClick={() => {
                setShowDetailsDialog(false);
                setCashAmount(selectedPayment?.totalAmount.toString() || '');
                setFinancePrice('');
                setShowPaymentDialog(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insufficient Funds Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Insufficient Funds
            </DialogTitle>
            <DialogDescription>
              Unable to process payment due to insufficient available cash
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Cannot Be Processed</AlertTitle>
            <AlertDescription>
              The Finance department does not have enough cash to complete this payment.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Available Cash</Label>
                <div className="text-2xl font-bold text-orange-600">
                  UGX {errorDetails.available.toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Required Amount</Label>
                <div className="text-2xl font-bold text-red-600">
                  UGX {errorDetails.required.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-muted-foreground">Shortage</Label>
              <div className="text-xl font-bold text-red-600 mt-1">
                UGX {(errorDetails.required - errorDetails.available).toLocaleString()}
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Action Required</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Please contact the Administrator to add more cash to the Finance department before processing this payment.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)} variant="default">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Transaction
            </DialogTitle>
            <DialogDescription>
              This will submit a deletion request for admin approval. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p><span className="font-medium">Batch:</span> {selectedPayment.batchNumber}</p>
                <p><span className="font-medium">Supplier:</span> {selectedPayment.supplier}</p>
                <p><span className="font-medium">Quantity:</span> {selectedPayment.quantity} kg</p>
              </div>

              <div>
                <Label htmlFor="delete-reason">Reason for Deletion *</Label>
                <Textarea
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g., Orphaned record - not found in Quality or Store departments"
                  rows={3}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This transaction will be marked for deletion and requires admin approval before being permanently removed.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteReason('');
              }}
              disabled={isDeletionSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeletionSubmitting || !deleteReason.trim()}
            >
              {isDeletionSubmitting ? 'Submitting...' : 'Submit Deletion Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};