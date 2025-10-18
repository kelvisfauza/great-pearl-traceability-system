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
  XCircle
} from 'lucide-react';

interface FinanceReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  details: any;
  onApprove: () => void;
  onReject: () => void;
}

export const FinanceReviewModal: React.FC<FinanceReviewModalProps> = ({
  open,
  onOpenChange,
  request,
  details,
  onApprove,
  onReject,
}) => {
  if (!request) return null;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const phoneNumber = details.phoneNumber || 'Not provided';
  // For salary requests, use title/description as reason
  const isSalaryRequest = request.type?.includes('Salary');
  const reason = isSalaryRequest 
    ? request.description || request.title 
    : (details.reason || request.description || 'No reason provided');
  const expenseCategory = details.expenseCategory || details.expenseType || 'Not specified';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expense Review - Finance Approval
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
              <p className="font-medium">{request.requestedby}</p>
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
              <p className="font-medium text-green-600">UGX {request.amount.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>Payment Phone</span>
              </div>
              <p className="font-medium font-mono">{phoneNumber}</p>
            </div>
          </div>

          {/* Expense Details */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Expense Details</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-blue-800">Reason for Expense:</span>
                <p className="text-sm text-blue-700 mt-1">{reason}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-blue-800">Category:</span>
                <p className="text-sm text-blue-700">{expenseCategory}</p>
              </div>
              {details.urgency && (
                <div>
                  <span className="text-sm font-medium text-blue-800">Urgency:</span>
                  <p className="text-sm text-blue-700">{details.urgency}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-blue-800">Priority:</span>
                <Badge variant="outline" className="ml-2">{request.priority}</Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={onApprove}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
