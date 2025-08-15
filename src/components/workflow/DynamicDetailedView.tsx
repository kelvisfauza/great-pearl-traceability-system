import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Printer,
  Building,
  Package,
  Settings,
  Trash2,
  UserPlus,
  Scale,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { UnifiedApprovalRequest } from '@/hooks/useUnifiedApprovalRequests';

interface DynamicDetailedViewProps {
  request: UnifiedApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  onPrint?: (data: any) => void;
  className?: string;
}

export const DynamicDetailedView: React.FC<DynamicDetailedViewProps> = ({
  request,
  onApprove,
  onReject,
  onPrint,
  className
}) => {
  const formatCurrency = (amount: string | number) => {
    if (!amount || amount === 0 || amount === '0') return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
    if (isNaN(numericAmount)) return amount;
    return `UGX ${numericAmount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const renderStoreReportDeletion = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            Store Report Deletion Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Report Date</p>
              <p className="text-sm text-muted-foreground">{request.details?.reportDate || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Report ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.details?.reportId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Coffee Type</p>
              <p className="text-sm text-muted-foreground">{request.details?.coffeeType || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Input By</p>
              <p className="text-sm text-muted-foreground">{request.details?.inputBy || 'N/A'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Deletion Reason</p>
            <p className="text-sm text-muted-foreground bg-red-50 p-3 rounded border border-red-200">
              {request.details?.deleteReason || 'No reason provided'}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderUserRegistration = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-500" />
            User Registration Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">First Name</p>
              <p className="text-sm text-muted-foreground">{request.details?.firstName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Last Name</p>
              <p className="text-sm text-muted-foreground">{request.details?.lastName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{request.details?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">{request.details?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Requested Role</p>
              <Badge variant="outline">{request.details?.role || 'User'}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Target Department</p>
              <Badge variant="secondary">{request.department}</Badge>
            </div>
          </div>
          {request.details?.reason && (
            <div>
              <p className="text-sm font-medium">Additional Information</p>
              <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
                {request.details.reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderSalaryPayment = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Salary Payment Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Month</p>
              <p className="text-sm text-muted-foreground">{request.details?.month || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Employee Count</p>
              <p className="text-sm text-muted-foreground">{request.details?.employee_count || 0} employees</p>
            </div>
            <div>
              <p className="text-sm font-medium">Total Amount</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(request.details?.total_amount || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Payment Method</p>
              <p className="text-sm text-muted-foreground">{request.details?.payment_method || 'Bank Transfer'}</p>
            </div>
          </div>
          
          {request.details?.bonuses && Number(request.details.bonuses) > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Bonuses</p>
                <p className="text-sm text-green-600">{formatCurrency(request.details.bonuses)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Deductions</p>
                <p className="text-sm text-red-600">{formatCurrency(request.details?.deductions || 0)}</p>
              </div>
            </div>
          )}

          {request.details?.notes && (
            <div>
              <p className="text-sm font-medium">Notes</p>
              <p className="text-sm text-muted-foreground bg-green-50 p-3 rounded border border-green-200">
                {request.details.notes}
              </p>
            </div>
          )}

          {request.details?.employee_details && Array.isArray(request.details.employee_details) && (
            <div>
              <p className="text-sm font-medium mb-2">Employee Details</p>
              <div className="max-h-32 overflow-y-auto border rounded">
                <div className="text-xs bg-gray-50 p-2 font-medium grid grid-cols-3 gap-2">
                  <span>Employee</span>
                  <span>Position</span>
                  <span>Amount</span>
                </div>
                {request.details.employee_details.slice(0, 5).map((emp: any, index: number) => (
                  <div key={index} className="text-xs p-2 border-t grid grid-cols-3 gap-2">
                    <span className="font-medium">{emp.name || 'N/A'}</span>
                    <span className="text-muted-foreground">{emp.position || 'N/A'}</span>
                    <span className="font-medium">{formatCurrency(emp.amount || 0)}</span>
                  </div>
                ))}
                {request.details.employee_details.length > 5 && (
                  <div className="text-xs p-2 text-center text-muted-foreground border-t">
                    +{request.details.employee_details.length - 5} more employees
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderBankTransfer = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-500" />
            Bank Transfer Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Supplier</p>
              <p className="text-sm text-muted-foreground">{request.details?.supplier || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Amount</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(request.details?.amount || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Batch Number</p>
              <p className="text-sm text-muted-foreground">{request.details?.batchNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Payment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.details?.paymentId || 'N/A'}</p>
            </div>
          </div>
          
          {request.details?.qualityAssessmentId && (
            <div>
              <p className="text-sm font-medium">Quality Assessment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.details.qualityAssessmentId}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderModificationRequest = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-500" />
            Modification Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Target Department</p>
              <Badge variant="secondary">{request.targetDepartment || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Original Payment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.originalPaymentId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Batch Number</p>
              <p className="text-sm text-muted-foreground">{request.batchNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Quality Assessment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.qualityAssessmentId || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium">Modification Reason</p>
            <p className="text-sm text-muted-foreground bg-purple-50 p-3 rounded border border-purple-200">
              {request.reason || 'No reason provided'}
            </p>
          </div>
          
          {request.comments && (
            <div>
              <p className="text-sm font-medium">Additional Comments</p>
              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded border border-gray-200">
                {request.comments}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderRequestContent = () => {
    switch (request.requestType) {
      case 'Store Report Deletion':
        return renderStoreReportDeletion();
      case 'User Registration':
        return renderUserRegistration();
      case 'Salary Payment':
        return renderSalaryPayment();
      case 'Bank Transfer':
        return renderBankTransfer();
      case 'Modification Request':
        return renderModificationRequest();
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                General Request Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm text-muted-foreground">{request.requestType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{request.department}</p>
                  </div>
                </div>
                {request.details && (
                  <div>
                    <p className="text-sm font-medium">Additional Details</p>
                    <pre className="text-xs text-muted-foreground bg-gray-50 p-3 rounded overflow-auto">
                      {JSON.stringify(request.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{request.title}</h3>
          <p className="text-sm text-muted-foreground">{request.description}</p>
        </div>
        {onPrint && (
          <Button onClick={() => onPrint(request)} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print Details
          </Button>
        )}
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-4">
          {/* Basic Request Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Requested By</p>
                  <p className="text-sm text-muted-foreground">{request.requestedBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <Badge variant="outline">{request.department}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Date Requested</p>
                  <p className="text-sm text-muted-foreground">{request.dateRequested}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <Badge variant={request.priority === 'High' ? 'destructive' : 
                                request.priority === 'Medium' ? 'default' : 'secondary'}>
                    {request.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(request.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Source</p>
                  <Badge variant="outline">{request.source}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specific Request Content */}
          {renderRequestContent()}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <Separator />
      <div className="flex justify-end gap-3">
        <Button onClick={onReject} variant="destructive">
          <XCircle className="h-4 w-4 mr-2" />
          Reject Request
        </Button>
        <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Request
        </Button>
      </div>
    </div>
  );
};