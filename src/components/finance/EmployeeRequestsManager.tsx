import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  DollarSign, 
  Eye,
  CheckCircle, 
  XCircle, 
  MessageCircle,
  FileText,
  AlertTriangle
} from 'lucide-react';
// Mock Firebase functionality - Firebase disabled
import { useToast } from '@/hooks/use-toast';

interface EmployeeRequest {
  id: string;
  userId: string;
  employeeId: string;
  requestType: 'payment_advance' | 'expense_reimbursement';
  title: string;
  description: string;
  amount?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'With Finance' | 'Approved - Awaiting Payment';
  requestedDate: string;
  currentStep: 'finance' | 'finance_payment';
  workflowHistory?: any[];
  createdAt: string;
  updatedAt: string;
  responseMessage?: string;
  employeeName?: string;
  employeeDepartment?: string;
}

const FinanceEmployeeRequestsManager = () => {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  // Mock data loading - Firebase disabled
  useEffect(() => {
    console.log('Mock: Loading finance employee requests');
    setRequests([]);
    setLoading(false);
  }, []);

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'payment_advance': return <DollarSign className="h-5 w-5" />;
      case 'expense_reimbursement': return <DollarSign className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const formatRequestType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleApprove = async (request: EmployeeRequest) => {
    try {
      const isPaymentProcessing = request.currentStep === 'finance_payment';
      
      const updatedWorkflowHistory = [
        ...(request.workflowHistory || []),
        {
          step: isPaymentProcessing ? 'finance_payment' : 'finance',
          timestamp: new Date().toISOString(),
          action: isPaymentProcessing ? 'payment_processed' : 'approved',
          reviewedBy: 'Finance Manager',
          notes: responseMessage || (isPaymentProcessing ? 'Payment processed and completed' : 'Approved by Finance and forwarded to Management')
        }
      ];

      let finalStatus: string;
      let currentStep: string;

      if (isPaymentProcessing) {
        // If processing payment after management approval, mark as completed
        finalStatus = 'Completed';
        currentStep = 'completed';
      } else {
        // If initial finance review, forward to management
        finalStatus = 'Awaiting Management Approval';
        currentStep = 'management';
      }

      console.log('Mock: Updating request', request.id, { status: finalStatus, currentStep });

      toast({
        title: "Success",
        description: isPaymentProcessing 
          ? "Payment processed and request completed"
          : "Request approved and forwarded to Management"
      });

      setIsResponseOpen(false);
      setResponseMessage('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (request: EmployeeRequest) => {
    try {
      const updatedWorkflowHistory = [
        ...(request.workflowHistory || []),
        {
          step: 'finance',
          timestamp: new Date().toISOString(),
          action: 'rejected',
          reviewedBy: 'Finance Manager',
          notes: responseMessage || 'Rejected by Finance'
        }
      ];

      console.log('Mock: Rejecting request', request.id);

      toast({
        title: "Success",
        description: "Request has been rejected"
      });

      setIsResponseOpen(false);
      setResponseMessage('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive"
      });
    }
  };

  const filteredRequests = requests.filter(request => {
    return filterType === 'all' || request.requestType === filterType;
  });

  const stats = {
    total: filteredRequests.length,
    pending: filteredRequests.filter(r => r.currentStep === 'finance').length,
    paymentProcessing: filteredRequests.filter(r => r.currentStep === 'finance_payment').length,
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Payment Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Initial Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Process Payment</p>
                <p className="text-2xl font-bold">{stats.paymentProcessing}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Payment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment_advance">Payment Advance</SelectItem>
                <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p>Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests</h3>
              <p className="text-gray-600">There are no payment requests from HR awaiting finance review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getRequestTypeIcon(request.requestType)}
                        <div>
                          <h4 className="font-semibold text-lg">{request.title}</h4>
                          <p className="text-sm text-gray-600">
                            {formatRequestType(request.requestType)}
                            {request.amount && ` - UGX ${request.amount.toLocaleString()}`}
                          </p>
                          <p className="text-xs text-gray-500">Employee ID: {request.employeeId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {request.currentStep === 'finance_payment' ? 'Process Payment' : 'With Finance'}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{request.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        <span>Submitted: {new Date(request.requestedDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsResponseOpen(true);
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm">{formatRequestType(selectedRequest.requestType)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant="secondary">With Finance</Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="text-sm">{selectedRequest.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>
              {selectedRequest.amount && (
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm">UGX {selectedRequest.amount.toLocaleString()}</p>
                </div>
              )}
              {selectedRequest.workflowHistory && selectedRequest.workflowHistory.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Workflow History</Label>
                  <div className="space-y-2 mt-2">
                    {selectedRequest.workflowHistory.map((entry, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        <p><strong>{entry.step.toUpperCase()}:</strong> {entry.action} by {entry.reviewedBy}</p>
                        <p className="text-gray-600">{entry.notes}</p>
                        <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Payment Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2">Request: {selectedRequest.title}</Label>
                <p className="text-sm text-gray-600">{selectedRequest.description}</p>
                {selectedRequest.amount && (
                  <p className="text-sm font-medium mt-2">Amount: UGX {selectedRequest.amount.toLocaleString()}</p>
                )}
              </div>
              <div>
                <Label htmlFor="response">Response Message</Label>
                <Textarea
                  id="response"
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Add your response or comments..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleApprove(selectedRequest)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {selectedRequest.currentStep === 'finance_payment' ? 'Process Payment & Complete' : 'Approve & Forward to Management'}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleReject(selectedRequest)}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceEmployeeRequestsManager;