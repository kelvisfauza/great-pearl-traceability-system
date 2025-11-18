import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  User, 
  Calendar, 
  Phone, 
  FileText, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface AdminExpenseReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  riskAssessment: any;
  userProfile: { name?: string; phone?: string } | undefined;
  onApprove: () => void;
  onReject: () => void;
}

export const AdminExpenseReviewModal: React.FC<AdminExpenseReviewModalProps> = ({
  open,
  onOpenChange,
  request,
  riskAssessment,
  userProfile,
  onApprove,
  onReject,
}) => {
  console.log('🟢 AdminExpenseReviewModal rendered - open:', open, 'request:', !!request);
  console.log('🟢 onApprove function:', typeof onApprove, onApprove);
  console.log('🟢 onReject function:', typeof onReject, onReject);
  
  if (!request) {
    console.log('🟢 No request provided, returning null');
    return null;
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'default';
      default: return 'outline';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4" />;
      case 'LOW':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not available';
    
    const date = new Date(dateString);
    // Check if the date string includes time info (ISO format with T)
    const hasTime = dateString.includes('T') || dateString.includes(':');
    
    if (hasTime) {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Date only, no time
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const paymentPhone = request.details?.phoneNumber || userProfile?.phone || 'Not provided';

  // Check if this is a My Expenses type that admin has already approved
  const isMyExpenseType = ['Cash Requisition', 'Personal Expense', 'Salary Request'].includes(request.type);
  const adminAlreadyApproved = request.admin_approved_at || request.admin_approved_1_at;
  const canApprove = !(isMyExpenseType && adminAlreadyApproved);
  // For salary requests, use title/description as reason, otherwise use details.reason
  const isSalaryRequest = request.type?.includes('Salary');
  const expenseReason = isSalaryRequest 
    ? request.description || request.title 
    : (request.details?.reason || request.description || 'No reason provided');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expense Review - Admin Approval
          </DialogTitle>
          <DialogDescription>
            Review all details before approving or rejecting this request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Header */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{request.title}</h3>
            <p className="text-muted-foreground">{request.description}</p>
          </div>

          {/* Request Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Requested By</span>
              </div>
              <p className="font-medium">{userProfile?.name || request.requestedby}</p>
              <p className="text-sm text-muted-foreground">{request.requestedby}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Submission Time</span>
              </div>
              <p className="font-medium">{formatDateTime(request.daterequested)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Amount</span>
              </div>
              <p className="font-medium text-green-600">UGX {parseFloat(request.amount).toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>Payment Phone</span>
              </div>
              <p className="font-medium font-mono">{paymentPhone}</p>
            </div>
          </div>

          {/* Expense Details */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Expense Details</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-blue-800">Reason for Expense:</span>
                <p className="text-sm text-blue-700 mt-1">{expenseReason}</p>
              </div>
              {request.details?.expenseCategory && (
                <div>
                  <span className="text-sm font-medium text-blue-800">Category:</span>
                  <p className="text-sm text-blue-700">{request.details.expenseCategory}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-blue-800">Priority:</span>
                <Badge variant="outline" className="ml-2">{request.priority}</Badge>
              </div>
            </div>
          </div>

          {/* Finance Approval Info - only show if finance has approved */}
          {request.finance_approved_at && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">Finance Approval</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-800">Approved By:</span>
                  <span className="font-medium">{request.finance_approved_by || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-800">Approval Time:</span>
                  <span className="font-medium">{formatDateTime(request.finance_approved_at)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              {getRiskIcon(riskAssessment.riskLevel)}
              <span className="font-medium">Risk Assessment</span>
              <Badge variant={getRiskBadgeColor(riskAssessment.riskLevel)}>
                {riskAssessment.riskLevel} RISK
              </Badge>
              <span className="text-sm text-muted-foreground">
                (Score: {riskAssessment.riskScore}/100)
              </span>
            </div>
            
            {riskAssessment.flaggedReasons.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-orange-700 mb-1">Risk Factors:</p>
                <ul className="text-sm text-orange-600 space-y-1">
                  {riskAssessment.flaggedReasons.map((reason: string, index: number) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-orange-500">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Recommendations:</p>
              <ul className="text-sm text-green-600 space-y-1">
                {riskAssessment.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-green-500">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔴 Cancel button clicked');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                console.log('🔴 Reject button clicked');
                onReject();
              }}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            {canApprove && (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onApprove();
                }}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            )}
            {!canApprove && (
              <div className="text-sm text-muted-foreground italic">
                Admin approved - awaiting Finance final approval
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
