import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManagementRequest {
  id: string;
  userId: string;
  employeeId: string;
  requestType: string;
  title: string;
  description: string;
  amount?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: string;
  requestedDate: string;
  currentStep: string;
  workflowHistory?: any[];
  createdAt: string;
  updatedAt: string;
  responseMessage?: string;
  employeeName?: string;
  employeeDepartment?: string;
}

const ManagementRequests = () => {
  const [requests, setRequests] = useState<ManagementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ManagementRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  // Fetch requests awaiting management approval or complaints
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        // Using approval_requests table for now with mock data
        const { data, error } = await supabase
          .from('approval_requests')
          .select('*')
          .in('status', ['Pending'])
          .order('daterequested', { ascending: false });

        if (error) throw error;

        // Transform data to match expected interface - using mock data for now
        const transformedData: ManagementRequest[] = [];
        
        setRequests(transformedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching management requests:', error);
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'payment_advance': return <DollarSign className="h-5 w-5" />;
      case 'expense_reimbursement': return <DollarSign className="h-5 w-5" />;
      case 'complaint': return <AlertTriangle className="h-5 w-5" />;
      case 'leave_request': return <Calendar className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const formatRequestType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'secondary';
      case 'Medium': return 'default';
      case 'High': return 'destructive';
      case 'Urgent': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleApprove = async (request: ManagementRequest) => {
    try {
      const isPaymentRequest = ['payment_advance', 'expense_reimbursement'].includes(request.requestType);
      const isComplaint = request.requestType === 'complaint';
      
      const updatedWorkflowHistory = [
        ...(request.workflowHistory || []),
        {
          step: isComplaint ? 'admin' : 'management',
          timestamp: new Date().toISOString(),
          action: 'approved',
          reviewedBy: 'Management',
          notes: responseMessage || 'Approved by Management'
        }
      ];

      let finalStatus: string;
      let currentStep: string;

      if (isComplaint) {
        finalStatus = 'Resolved';
        currentStep = 'completed';
      } else if (isPaymentRequest) {
        // Payment requests go back to finance for payment processing
        finalStatus = 'Approved - Awaiting Payment';
        currentStep = 'finance_payment';
        
        // Add note to workflow that this is for payment processing
        updatedWorkflowHistory.push({
          step: 'finance_payment',
          timestamp: new Date().toISOString(),
          action: 'forwarded',
          reviewedBy: 'Management',
          notes: 'Forwarded to Finance for payment processing'
        });
      } else {
        // Other requests are completed
        finalStatus = 'Completed';
        currentStep = 'completed';
      }

      // Update with Supabase - using approval_requests table temporarily
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: finalStatus,
          // Store additional data in details field for now
          details: {
            ...((request as any).details || {}),
            currentStep,
            workflowHistory: updatedWorkflowHistory,
            responseMessage: responseMessage || 'Approved by Management',
            reviewedAt: new Date().toISOString()
          }
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: isPaymentRequest 
          ? "Request approved and forwarded to Finance for payment processing"
          : `Request ${finalStatus.toLowerCase()} successfully`
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

  const handleReject = async (request: ManagementRequest) => {
    try {
      const updatedWorkflowHistory = [
        ...(request.workflowHistory || []),
        {
          step: request.requestType === 'complaint' ? 'admin' : 'management',
          timestamp: new Date().toISOString(),
          action: 'rejected',
          reviewedBy: 'Management',
          notes: responseMessage || 'Rejected by Management'
        }
      ];

      // Update with Supabase - using approval_requests table temporarily
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'Rejected',
          // Store additional data in details field for now
          details: {
            ...((request as any).details || {}),
            currentStep: 'completed',
            workflowHistory: updatedWorkflowHistory,
            responseMessage: responseMessage || 'Rejected by Management',
            reviewedAt: new Date().toISOString()
          }
        })
        .eq('id', request.id);

      if (error) throw error;

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
    if (filterType === 'all') return true;
    if (filterType === 'complaints') return request.requestType === 'complaint';
    if (filterType === 'payments') return ['payment_advance', 'expense_reimbursement'].includes(request.requestType);
    if (filterType === 'other') return !['complaint', 'payment_advance', 'expense_reimbursement'].includes(request.requestType);
    return true;
  });

  const stats = {
    total: filteredRequests.length,
    complaints: requests.filter(r => r.requestType === 'complaint').length,
    payments: requests.filter(r => ['payment_advance', 'expense_reimbursement'].includes(r.requestType)).length,
    others: requests.filter(r => !['complaint', 'payment_advance', 'expense_reimbursement'].includes(r.requestType)).length,
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Complaints</p>
                <p className="text-2xl font-bold">{stats.complaints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Payment Requests</p>
                <p className="text-2xl font-bold">{stats.payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Other Requests</p>
                <p className="text-2xl font-bold">{stats.others}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Management Approval Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All ({stats.total})
            </Button>
            <Button
              variant={filterType === 'complaints' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('complaints')}
            >
              Complaints ({stats.complaints})
            </Button>
            <Button
              variant={filterType === 'payments' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('payments')}
            >
              Payments ({stats.payments})
            </Button>
            <Button
              variant={filterType === 'other' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('other')}
            >
              Other ({stats.others})
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p>Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending requests</h3>
              <p className="text-gray-600">All requests have been processed.</p>
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
                        <Badge variant={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{request.description}</p>
                    
                    {/* Workflow Chain Display */}
                    {request.workflowHistory && request.workflowHistory.length > 0 && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-2">Approval Chain:</p>
                        <div className="space-y-1">
                          {request.workflowHistory.map((entry, index) => (
                            <div key={index} className="text-xs flex items-center gap-2">
                              <span className="font-medium">{entry.step.toUpperCase()}:</span>
                              <span className={`px-2 py-1 rounded ${
                                entry.action === 'approved' ? 'bg-green-100 text-green-800' : 
                                entry.action === 'rejected' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {entry.action} by {entry.reviewedBy}
                              </span>
                              <span className="text-gray-500">
                                {new Date(entry.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
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
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge variant={getPriorityColor(selectedRequest.priority)}>{selectedRequest.priority}</Badge>
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
                  <Label className="text-sm font-medium">Full Workflow History</Label>
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
            <DialogTitle>
              {selectedRequest?.requestType === 'complaint' ? 'Review Complaint' : 'Review Request'}
            </DialogTitle>
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
                  {selectedRequest.requestType === 'complaint' ? 'Mark as Resolved' : 'Approve'}
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

export default ManagementRequests;