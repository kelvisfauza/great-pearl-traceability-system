import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserRequests } from '@/hooks/useUserRequests';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  DollarSign, 
  MessageSquare, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye,
  Forward,
  MessageCircle
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface EmployeeRequest {
  id: string;
  userId: string;
  employeeId: string;
  requestType: 'payment_advance' | 'supplier_motivation' | 'complaint' | 'feedback' | 'leave_request' | 'expense_reimbursement';
  title: string;
  description: string;
  amount?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'With HR' | 'With Finance' | 'Awaiting Management Approval' | 'Completed' | 'Rejected' | 'Reviewing' | 'Resolved';
  requestedDate: string;
  currentStep: 'hr' | 'finance' | 'management' | 'admin' | 'completed';
  workflowHistory?: any[];
  createdAt: string;
  updatedAt: string;
  responseMessage?: string;
  employeeName?: string;
  employeeDepartment?: string;
}

const EmployeeRequestsManager = () => {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  // Fetch all user requests from Firebase
  useEffect(() => {
    const q = query(
      collection(db, 'user_requests'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        };
      }) as EmployeeRequest[];
      
      setRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'With HR': return 'secondary';
      case 'With Finance': return 'default';
      case 'Awaiting Management Approval': return 'default';
      case 'Completed': return 'default';
      case 'Rejected': return 'destructive';
      case 'Reviewing': return 'secondary';
      case 'Resolved': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'With HR': return <Clock className="h-4 w-4" />;
      case 'With Finance': return <DollarSign className="h-4 w-4" />;
      case 'Awaiting Management Approval': return <Eye className="h-4 w-4" />;
      case 'Completed': return <CheckCircle className="h-4 w-4" />;
      case 'Rejected': return <XCircle className="h-4 w-4" />;
      case 'Reviewing': return <Eye className="h-4 w-4" />;
      case 'Resolved': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'payment_advance': return <DollarSign className="h-5 w-5" />;
      case 'supplier_motivation': return <FileText className="h-5 w-5" />;
      case 'complaint': return <AlertTriangle className="h-5 w-5" />;
      case 'feedback': return <MessageSquare className="h-5 w-5" />;
      case 'leave_request': return <Calendar className="h-5 w-5" />;
      case 'expense_reimbursement': return <DollarSign className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const formatRequestType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleApprove = async (request: EmployeeRequest) => {
    try {
      let newStatus = '';
      let newStep = '';

      if (request.requestType === 'complaint') {
        newStatus = 'Resolved';
        newStep = 'completed';
      } else {
        // Regular workflow: HR -> Finance -> Management
        if (request.currentStep === 'hr') {
          newStatus = 'With Finance';
          newStep = 'finance';
        } else if (request.currentStep === 'finance') {
          newStatus = 'Awaiting Management Approval';
          newStep = 'management';
        } else if (request.currentStep === 'management') {
          newStatus = 'Completed';
          newStep = 'completed';
        }
      }

      const updatedWorkflowHistory = [
        ...(request.workflowHistory || []),
        {
          step: request.currentStep,
          timestamp: new Date().toISOString(),
          action: 'approved',
          reviewedBy: 'HR Manager', // This should come from auth context
          notes: responseMessage || `Approved and forwarded to ${newStep}`
        }
      ];

      await updateDoc(doc(db, 'user_requests', request.id), {
        status: newStatus,
        currentStep: newStep,
        workflowHistory: updatedWorkflowHistory,
        responseMessage: responseMessage || `Approved by HR`,
        reviewedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast({
        title: "Success",
        description: `Request has been approved and ${newStep === 'completed' ? 'completed' : `forwarded to ${newStep}`}`
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
          step: request.currentStep,
          timestamp: new Date().toISOString(),
          action: 'rejected',
          reviewedBy: 'HR Manager',
          notes: responseMessage || 'Rejected by HR'
        }
      ];

      await updateDoc(doc(db, 'user_requests', request.id), {
        status: 'Rejected',
        currentStep: 'completed',
        workflowHistory: updatedWorkflowHistory,
        responseMessage: responseMessage || 'Rejected by HR',
        reviewedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

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

  // Filter requests for HR (only those currently with HR or complaints)
  const hrRequests = requests.filter(request => {
    const isHRRequest = request.currentStep === 'hr' || (request.requestType === 'complaint' && request.currentStep === 'admin');
    const statusMatch = filterStatus === 'all' || request.status === filterStatus;
    const typeMatch = filterType === 'all' || request.requestType === filterType;
    return isHRRequest && statusMatch && typeMatch;
  });

  const stats = {
    total: hrRequests.length,
    pending: hrRequests.filter(r => r.status === 'With HR' || r.status === 'Reviewing').length,
    completed: hrRequests.filter(r => r.status === 'Completed' || r.status === 'Resolved').length,
    rejected: hrRequests.filter(r => r.status === 'Rejected').length
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
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
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
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="With HR">With HR</SelectItem>
                <SelectItem value="Reviewing">Reviewing</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment_advance">Payment Advance</SelectItem>
                <SelectItem value="supplier_motivation">Supplier Motivation</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="leave_request">Leave Request</SelectItem>
                <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p>Loading requests...</p>
            </div>
          ) : hrRequests.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests to review</h3>
              <p className="text-gray-600">There are no employee requests waiting for HR review at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hrRequests.map((request) => (
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
                        <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status}
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
                        {(request.status === 'With HR' || request.status === 'Reviewing') && (
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
                        )}
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
                  <Badge variant={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2">Request: {selectedRequest.title}</Label>
                <p className="text-sm text-gray-600">{selectedRequest.description}</p>
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
                  Approve & Forward
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

export default EmployeeRequestsManager;