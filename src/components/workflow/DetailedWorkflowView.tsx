import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Calendar, 
  DollarSign, 
  Scale, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Printer,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Building
} from 'lucide-react';
import { useWorkflowTracking } from '@/hooks/useWorkflowTracking';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DetailedWorkflowViewProps {
  requestId: string;
  paymentId?: string;
  onApprove: () => void;
  onReject: () => void;
  onPrint: (workflowData: WorkflowData) => void;
  className?: string;
}

interface WorkflowData {
  supplier: {
    name: string;
    code: string;
    phone?: string;
  };
  coffee: {
    kilograms: number;
    unitPrice: number;
    totalAmount: number;
    coffeeType: string;
    batchNumber: string;
  };
  quality: {
    assessedBy: string;
    timeAssessed: string;
    moisture: number;
    group1Defects: number;
    group2Defects: number;
    deviations: string[];
    suggestedPrice: number;
    comments?: string;
  };
  finance: {
    sentToFinanceTime: string;
    financeComments?: string;
    approvedBy?: string;
    approvalTime?: string;
    paymentMethod: 'Bank Transfer' | 'Cheque';
    chequeNumber?: string;
    status: string;
  };
  workflow: any[];
}

export const DetailedWorkflowView: React.FC<DetailedWorkflowViewProps> = ({
  requestId,
  paymentId,
  onApprove,
  onReject,
  onPrint,
  className
}) => {
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const { getPaymentWorkflow } = useWorkflowTracking();

  useEffect(() => {
    fetchWorkflowData();
  }, [requestId, paymentId]);

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      
      // Get approval request details
      const requestDoc = await getDoc(doc(db, 'approval_requests', requestId));
      const requestData = requestDoc.data();
      
      if (!requestData) return;

      // Get payment record if available
      let paymentData = null;
      if (paymentId) {
        const paymentDoc = await getDoc(doc(db, 'payment_records', paymentId));
        paymentData = paymentDoc.data();
      }

      // Get quality assessment if available
      let qualityData = null;
      if (requestData.details?.qualityAssessmentId) {
        const qualityDoc = await getDoc(doc(db, 'quality_assessments', requestData.details.qualityAssessmentId));
        qualityData = qualityDoc.data();
      }

      // Get supplier details
      let supplierData = null;
      if (requestData.details?.supplier) {
        const supplierQuery = query(
          collection(db, 'suppliers'),
          where('name', '==', requestData.details.supplier)
        );
        const supplierSnapshot = await getDocs(supplierQuery);
        if (!supplierSnapshot.empty) {
          supplierData = supplierSnapshot.docs[0].data();
        }
      }

      // Get store record for batch details
      let storeData = null;
      if (requestData.details?.batchNumber) {
        const storeQuery = query(
          collection(db, 'store_records'),
          where('batch_number', '==', requestData.details.batchNumber)
        );
        const storeSnapshot = await getDocs(storeQuery);
        if (!storeSnapshot.empty) {
          storeData = storeSnapshot.docs[0].data();
        }
      }

      // Get workflow history
      const workflow = paymentId ? getPaymentWorkflow(paymentId) : [];

      // Calculate deviations
      const deviations: string[] = [];
      if (qualityData && storeData) {
        const originalKg = storeData.kilograms || 0;
        const qualityAdjustedKg = originalKg * (1 - (qualityData.moisture || 0) / 100);
        if (Math.abs(originalKg - qualityAdjustedKg) > 1) {
          deviations.push(`Moisture adjustment: ${originalKg}kg → ${qualityAdjustedKg.toFixed(2)}kg`);
        }
        
        if ((qualityData.group1_defects || 0) > 5) {
          deviations.push(`High Group 1 defects: ${qualityData.group1_defects}%`);
        }
        
        if ((qualityData.group2_defects || 0) > 10) {
          deviations.push(`High Group 2 defects: ${qualityData.group2_defects}%`);
        }
      }

      const compiledData: WorkflowData = {
        supplier: {
          name: requestData.details?.supplier || 'Unknown',
          code: supplierData?.code || 'N/A',
          phone: supplierData?.phone || 'N/A'
        },
        coffee: {
          kilograms: storeData?.kilograms || requestData.details?.amount || 0,
          unitPrice: qualityData?.suggested_price || 0,
          totalAmount: requestData.details?.amount || 0,
          coffeeType: storeData?.coffee_type || 'Arabica',
          batchNumber: requestData.details?.batchNumber || 'N/A'
        },
        quality: {
          assessedBy: qualityData?.assessed_by || 'N/A',
          timeAssessed: qualityData?.date_assessed || qualityData?.created_at || 'N/A',
          moisture: qualityData?.moisture || 0,
          group1Defects: qualityData?.group1_defects || 0,
          group2Defects: qualityData?.group2_defects || 0,
          deviations,
          suggestedPrice: qualityData?.suggested_price || 0,
          comments: qualityData?.comments
        },
        finance: {
          sentToFinanceTime: requestData.created_at,
          financeComments: requestData.description,
          approvedBy: requestData.requestedby,
          approvalTime: requestData.updated_at,
          paymentMethod: requestData.details?.method || 'Bank Transfer',
          chequeNumber: requestData.details?.chequeNumber,
          status: requestData.status
        },
        workflow
      };

      setWorkflowData(compiledData);
    } catch (error) {
      console.error('Error fetching workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workflowData) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No workflow data available
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with print button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Complete Transaction Chain</h3>
        <Button onClick={() => workflowData && onPrint(workflowData)} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print for Audit
        </Button>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-4">
          {/* Supplier Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{workflowData.supplier.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Code</p>
                  <p className="text-sm text-muted-foreground">{workflowData.supplier.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{workflowData.supplier.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coffee Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Coffee Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Batch Number</p>
                  <p className="text-sm text-muted-foreground">{workflowData.coffee.batchNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Coffee Type</p>
                  <p className="text-sm text-muted-foreground">{workflowData.coffee.coffeeType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Kilograms</p>
                  <p className="text-sm text-muted-foreground">{workflowData.coffee.kilograms.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Unit Price</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(workflowData.coffee.unitPrice)}/kg</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(workflowData.coffee.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quality Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Assessed By</p>
                  <p className="text-sm text-muted-foreground">{workflowData.quality.assessedBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Time Assessed</p>
                  <p className="text-sm text-muted-foreground">{formatDate(workflowData.quality.timeAssessed)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Moisture Content</p>
                  <p className="text-sm text-muted-foreground">{workflowData.quality.moisture}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Suggested Price</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(workflowData.quality.suggestedPrice)}/kg</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Group 1 Defects</p>
                  <p className="text-sm text-muted-foreground">{workflowData.quality.group1Defects}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Group 2 Defects</p>
                  <p className="text-sm text-muted-foreground">{workflowData.quality.group2Defects}%</p>
                </div>
              </div>
              
              {workflowData.quality.deviations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Quality Deviations
                  </p>
                  <div className="space-y-1">
                    {workflowData.quality.deviations.map((deviation, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {deviation}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {workflowData.quality.comments && (
                <div>
                  <p className="text-sm font-medium">Comments</p>
                  <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                    {workflowData.quality.comments}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finance Processing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Finance Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Sent to Finance</p>
                  <p className="text-sm text-muted-foreground">{formatDate(workflowData.finance.sentToFinanceTime)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <p className="text-sm text-muted-foreground">{workflowData.finance.paymentMethod}</p>
                  </div>
                </div>
                {workflowData.finance.chequeNumber && (
                  <div>
                    <p className="text-sm font-medium">Cheque Number</p>
                    <p className="text-sm text-muted-foreground font-mono">{workflowData.finance.chequeNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={workflowData.finance.status === 'Pending' ? 'secondary' : 'default'}>
                    {workflowData.finance.status}
                  </Badge>
                </div>
              </div>
              
              {workflowData.finance.financeComments && (
                <div>
                  <p className="text-sm font-medium">Finance Comments</p>
                  <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                    {workflowData.finance.financeComments}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow History */}
          {workflowData.workflow.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Workflow History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workflowData.workflow.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                      <div className="flex-shrink-0 mt-1">
                        {step.action === 'approved' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : step.action === 'rejected' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {step.action.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {step.fromDepartment} → {step.toDepartment}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{step.processedBy}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(step.timestamp)}</p>
                        {step.comments && (
                          <p className="text-xs text-muted-foreground mt-1 bg-gray-50 p-1 rounded">
                            {step.comments}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <Separator />
      <div className="flex justify-end gap-3">
        <Button onClick={onReject} variant="destructive">
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Payment
        </Button>
      </div>
    </div>
  );
};