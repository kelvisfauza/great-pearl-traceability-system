import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Printer, X } from 'lucide-react';

interface AuditPrintModalProps {
  open: boolean;
  onClose: () => void;
  workflowData: any;
  requestId: string;
}

export const AuditPrintModal: React.FC<AuditPrintModalProps> = ({
  open,
  onClose,
  workflowData,
  requestId
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            Audit Trail Report
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Print-friendly content */}
        <div className="print:p-0 space-y-6">
          {/* Header for print */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">PAYMENT APPROVAL AUDIT TRAIL</h1>
            <p className="text-sm text-gray-600">Request ID: {requestId}</p>
            <p className="text-sm text-gray-600">Generated: {new Date().toLocaleString()}</p>
          </div>

          {workflowData && (
            <>
              {/* Supplier Information */}
              <Card className="print:border print:border-gray-300">
                <CardHeader className="print:bg-gray-50">
                  <CardTitle className="text-lg">1. SUPPLIER INFORMATION</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Supplier Name:</p>
                    <p>{workflowData.supplier.name}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Supplier Code:</p>
                    <p>{workflowData.supplier.code}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Contact Phone:</p>
                    <p>{workflowData.supplier.phone}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Coffee Transaction Details */}
              <Card className="print:border print:border-gray-300">
                <CardHeader className="print:bg-gray-50">
                  <CardTitle className="text-lg">2. COFFEE TRANSACTION DETAILS</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Batch Number:</p>
                    <p className="font-mono">{workflowData.coffee.batchNumber}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Coffee Type:</p>
                    <p>{workflowData.coffee.coffeeType}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Quantity:</p>
                    <p>{workflowData.coffee.kilograms.toLocaleString()} kg</p>
                  </div>
                  <div>
                    <p className="font-semibold">Unit Price:</p>
                    <p>{formatCurrency(workflowData.coffee.unitPrice)} per kg</p>
                  </div>
                  <div className="col-span-2 bg-yellow-50 p-3 rounded border">
                    <p className="font-semibold text-lg">Total Amount:</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(workflowData.coffee.totalAmount)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Assessment */}
              <Card className="print:border print:border-gray-300">
                <CardHeader className="print:bg-gray-50">
                  <CardTitle className="text-lg">3. QUALITY ASSESSMENT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-semibold">Assessed By:</p>
                      <p>{workflowData.quality.assessedBy}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Assessment Date:</p>
                      <p>{formatDate(workflowData.quality.timeAssessed)}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Moisture Content:</p>
                      <p>{workflowData.quality.moisture}%</p>
                    </div>
                    <div>
                      <p className="font-semibold">Suggested Price:</p>
                      <p>{formatCurrency(workflowData.quality.suggestedPrice)} per kg</p>
                    </div>
                    <div>
                      <p className="font-semibold">Group 1 Defects:</p>
                      <p>{workflowData.quality.group1Defects}%</p>
                    </div>
                    <div>
                      <p className="font-semibold">Group 2 Defects:</p>
                      <p>{workflowData.quality.group2Defects}%</p>
                    </div>
                  </div>

                  {workflowData.quality.deviations.length > 0 && (
                    <div className="mb-4">
                      <p className="font-semibold mb-2">Quality Deviations:</p>
                      <div className="space-y-1">
                        {workflowData.quality.deviations.map((deviation: string, index: number) => (
                          <div key={index} className="bg-orange-50 border border-orange-200 p-2 rounded text-sm">
                            • {deviation}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {workflowData.quality.comments && (
                    <div>
                      <p className="font-semibold">Quality Comments:</p>
                      <div className="bg-gray-50 p-3 rounded border mt-1">
                        <p className="text-sm">{workflowData.quality.comments}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Finance Processing */}
              <Card className="print:border print:border-gray-300">
                <CardHeader className="print:bg-gray-50">
                  <CardTitle className="text-lg">4. FINANCE PROCESSING</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Sent to Finance:</p>
                    <p>{formatDate(workflowData.finance.sentToFinanceTime)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Payment Method:</p>
                    <p className="font-semibold text-blue-600">{workflowData.finance.paymentMethod}</p>
                  </div>
                  {workflowData.finance.chequeNumber && (
                    <div className="col-span-2 bg-blue-50 p-3 rounded border">
                      <p className="font-semibold">Cheque Number:</p>
                      <p className="text-lg font-mono font-bold">{workflowData.finance.chequeNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">Current Status:</p>
                    <Badge variant={workflowData.finance.status === 'Pending' ? 'secondary' : 'default'} className="print:border print:border-gray-400">
                      {workflowData.finance.status}
                    </Badge>
                  </div>
                  {workflowData.finance.financeComments && (
                    <div className="col-span-2">
                      <p className="font-semibold">Finance Comments:</p>
                      <div className="bg-gray-50 p-3 rounded border mt-1">
                        <p className="text-sm">{workflowData.finance.financeComments}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workflow Timeline */}
              {workflowData.workflow.length > 0 && (
                <Card className="print:border print:border-gray-300">
                  <CardHeader className="print:bg-gray-50">
                    <CardTitle className="text-lg">5. APPROVAL WORKFLOW TIMELINE</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {workflowData.workflow.map((step: any, index: number) => (
                        <div key={step.id} className="border-l-4 border-blue-200 pl-4 pb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="print:border print:border-gray-400">
                              Step {index + 1}: {step.action.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="font-semibold">From:</span> {step.fromDepartment}</p>
                            <p><span className="font-semibold">To:</span> {step.toDepartment}</p>
                            <p><span className="font-semibold">Processed By:</span> {step.processedBy}</p>
                            <p><span className="font-semibold">Timestamp:</span> {formatDate(step.timestamp)}</p>
                            {step.comments && (
                              <div className="bg-gray-50 p-2 rounded border mt-2">
                                <p className="font-semibold">Comments:</p>
                                <p>{step.comments}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Audit Footer */}
              <div className="hidden print:block border-t pt-4 mt-8">
                <div className="grid grid-cols-3 gap-8 text-sm">
                  <div>
                    <p className="font-semibold">Quality Officer:</p>
                    <div className="mt-8 border-t border-gray-400">
                      <p className="text-center mt-1">Signature & Date</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Finance Officer:</p>
                    <div className="mt-8 border-t border-gray-400">
                      <p className="text-center mt-1">Signature & Date</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Operations Manager:</p>
                    <div className="mt-8 border-t border-gray-400">
                      <p className="text-center mt-1">Signature & Date</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};