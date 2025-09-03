import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Eye, 
  CreditCard, 
  Banknote, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  Package,
  Printer
} from 'lucide-react';
import { useQualityControl } from '@/hooks/useQualityControl';
import { useApprovalSystem } from '@/hooks/useApprovalSystem';
import { useWorkflowTracking } from '@/hooks/useWorkflowTracking';
import { useToast } from '@/hooks/use-toast';

interface QualityAssessmentReportsProps {
  onProcessPayment: (paymentData: any) => void;
  formatCurrency: (amount: number) => string;
}

const QualityAssessmentReports: React.FC<QualityAssessmentReportsProps> = ({
  onProcessPayment,
  formatCurrency
}) => {
  const { qualityAssessments, loading } = useQualityControl();
  const { createApprovalRequest, loading: submittingApproval } = useApprovalSystem();
  const { trackWorkflowStep } = useWorkflowTracking();
  const { toast } = useToast();
  
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cash'>('Bank Transfer');
  const [cashAmount, setCashAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const handleViewDetails = (assessment: any) => {
    setSelectedAssessment(assessment);
  };

  const handleInitiatePayment = (assessment: any) => {
    setSelectedAssessment(assessment);
    setShowPaymentDialog(true);
    setCashAmount((assessment.kilograms * assessment.suggested_price).toString());
  };

  const handleProcessPayment = async () => {
    if (!selectedAssessment) return;

    const totalAmount = selectedAssessment.kilograms * selectedAssessment.suggested_price;
    const actualAmount = paymentMethod === 'Cash' ? parseFloat(cashAmount) : totalAmount;

    try {
      // Create payment record first
      const paymentData = {
        id: `payment_${Date.now()}`,
        supplier: selectedAssessment.supplier_name || 'Unknown Supplier',
        amount: totalAmount,
        status: 'Pending',
        method: paymentMethod,
        batchNumber: selectedAssessment.batch_number,
        qualityAssessmentId: selectedAssessment.id,
        paid_amount: paymentMethod === 'Cash' ? actualAmount : 0,
        date: new Date().toISOString().split('T')[0]
      };

      // Call the parent's process payment function which handles the proper workflow
      onProcessPayment(paymentData);

      if (paymentMethod === 'Bank Transfer') {
        // Track workflow step for bank transfer
        await trackWorkflowStep({
          paymentId: paymentData.id,
          fromDepartment: 'Finance',
          toDepartment: 'Management',
          action: 'submitted',
          reason: 'Bank transfer payment approval required',
          comments: paymentNotes,
          status: 'pending',
          processedBy: 'Finance Department'
        });

        toast({
          title: "Bank Transfer Submitted",
          description: `Bank transfer payment submitted for approval - ${formatCurrency(totalAmount)}`
        });
      } else {
        // Track workflow step for cash payment
        await trackWorkflowStep({
          paymentId: paymentData.id,
          fromDepartment: 'Finance',
          toDepartment: 'Finance',
          action: 'approved',
          reason: 'Direct cash payment processed',
          comments: `Cash payment of ${formatCurrency(actualAmount)} processed. ${paymentNotes}`,
          status: 'completed',
          processedBy: 'Finance Department'
        });

        toast({
          title: "Cash Payment Processed",
          description: `Payment of ${formatCurrency(actualAmount)} processed successfully`
        });
      }

      setShowPaymentDialog(false);
      setSelectedAssessment(null);
      setCashAmount('');
      setPaymentNotes('');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePrintReport = (assessment: any) => {
    const printContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="text-align: center; margin-bottom: 20px;">Quality Assessment Report</h2>
        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px;">
          <h3>Assessment Details</h3>
          <p><strong>Batch Number:</strong> ${assessment.batch_number}</p>
          <p><strong>Supplier:</strong> ${assessment.supplier_name || 'Unknown Supplier'}</p>
          <p><strong>Coffee Type:</strong> ${assessment.coffee_type || 'Unknown Type'}</p>
          <p><strong>Quantity:</strong> ${assessment.kilograms} kg</p>
          <p><strong>Assessed By:</strong> ${assessment.assessed_by}</p>
          <p><strong>Date Assessed:</strong> ${new Date(assessment.date_assessed).toLocaleDateString()}</p>
        </div>
        
        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px;">
          <h3>Quality Parameters</h3>
          <p><strong>Moisture:</strong> ${assessment.moisture}%</p>
          <p><strong>Group 1 Defects:</strong> ${assessment.group1_defects || 0}</p>
          <p><strong>Group 2 Defects:</strong> ${assessment.group2_defects || 0}</p>
          <p><strong>Below Screen 12:</strong> ${assessment.below12 || 0}%</p>
          <p><strong>Pods:</strong> ${assessment.pods || 0}%</p>
          <p><strong>Husks:</strong> ${assessment.husks || 0}%</p>
          <p><strong>Stones:</strong> ${assessment.stones || 0}%</p>
        </div>
        
        <div style="border: 1px solid #ccc; padding: 15px;">
          <h3>Pricing Information</h3>
          <p><strong>Suggested Price:</strong> ${formatCurrency(assessment.suggested_price)}/kg</p>
          <p><strong>Total Value:</strong> ${formatCurrency(assessment.kilograms * assessment.suggested_price)}</p>
          ${assessment.comments ? `<p><strong>Comments:</strong> ${assessment.comments}</p>` : ''}
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p>Generated on ${new Date().toLocaleDateString()} by Finance Department</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assessed': return 'bg-blue-100 text-blue-800';
      case 'submitted_to_finance': return 'bg-yellow-100 text-yellow-800';
      case 'payment_processed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingAssessments = qualityAssessments.filter(a => 
    a.status === 'assessed' || a.status === 'submitted_to_finance'
  );
  const processedAssessments = qualityAssessments.filter(a => 
    a.status === 'payment_processed'
  );

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
            <FileText className="h-5 w-5" />
            Quality Assessment Reports
          </CardTitle>
          <CardDescription>
            Review quality assessments from Quality Control and process payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pending ({pendingAssessments.length})
              </TabsTrigger>
              <TabsTrigger value="processed">
                Processed ({processedAssessments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Assessed By</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price/kg</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">
                        {assessment.batch_number}
                      </TableCell>
                      <TableCell>{(assessment as any).supplier_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {assessment.assessed_by}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {(assessment as any).kilograms || 0} kg
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(assessment.suggested_price)}</TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(((assessment as any).kilograms || 0) * assessment.suggested_price)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(assessment.status)}>
                          {assessment.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(assessment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleInitiatePayment(assessment)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintReport(assessment)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pendingAssessments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No pending quality assessments</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="processed" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Assessed By</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">
                        {assessment.batch_number}
                      </TableCell>
                      <TableCell>{(assessment as any).supplier_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {assessment.assessed_by}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {(assessment as any).kilograms || 0} kg
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(((assessment as any).kilograms || 0) * assessment.suggested_price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(assessment.date_assessed).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintReport(assessment)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {processedAssessments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No processed assessments</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Assessment Details Dialog */}
      {selectedAssessment && !showPaymentDialog && (
        <Dialog open={!!selectedAssessment} onOpenChange={() => setSelectedAssessment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Quality Assessment Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Batch Number</Label>
                  <p className="text-sm">{selectedAssessment.batch_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Supplier</Label>
                  <p className="text-sm">{selectedAssessment.supplier_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Coffee Type</Label>
                  <p className="text-sm">{selectedAssessment.coffee_type || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="text-sm">{selectedAssessment.kilograms} kg</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Assessed By</Label>
                  <p className="text-sm">{selectedAssessment.assessed_by}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date Assessed</Label>
                  <p className="text-sm">{new Date(selectedAssessment.date_assessed).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-3 block">Quality Parameters</Label>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Moisture:</span> {selectedAssessment.moisture}%
                  </div>
                  <div>
                    <span className="font-medium">Group 1 Defects:</span> {selectedAssessment.group1_defects || 0}
                  </div>
                  <div>
                    <span className="font-medium">Group 2 Defects:</span> {selectedAssessment.group2_defects || 0}
                  </div>
                  <div>
                    <span className="font-medium">Below 12:</span> {selectedAssessment.below12 || 0}%
                  </div>
                  <div>
                    <span className="font-medium">Pods:</span> {selectedAssessment.pods || 0}%
                  </div>
                  <div>
                    <span className="font-medium">Husks:</span> {selectedAssessment.husks || 0}%
                  </div>
                  <div>
                    <span className="font-medium">Stones:</span> {selectedAssessment.stones || 0}%
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Suggested Price</Label>
                    <p className="text-lg font-bold">{formatCurrency(selectedAssessment.suggested_price)}/kg</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Value</Label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedAssessment.kilograms * selectedAssessment.suggested_price)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedAssessment.comments && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Comments</Label>
                  <p className="text-sm mt-1">{selectedAssessment.comments}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Processing Dialog */}
      {showPaymentDialog && selectedAssessment && (
        <Dialog open={showPaymentDialog} onOpenChange={() => setShowPaymentDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Supplier</Label>
                <p className="text-sm">{selectedAssessment.supplier_name || 'Unknown'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Total Amount</Label>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(selectedAssessment.kilograms * selectedAssessment.suggested_price)}
                </p>
              </div>

              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value: 'Bank Transfer' | 'Cash') => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash Payment</SelectItem>
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
                    placeholder="Enter cash amount"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="payment-notes">Notes (Optional)</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add payment notes..."
                  rows={3}
                />
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
                  disabled={submittingApproval}
                  className="flex-1"
                >
                  {paymentMethod === 'Bank Transfer' ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Request Approval
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      Process Cash
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default QualityAssessmentReports;