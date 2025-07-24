import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Mock data loading - all Firebase functionality disabled
  useEffect(() => {
    console.log('Mock: Loading employee requests');
    setRequests([]);
    setLoading(false);
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
      console.log('Mock: Approving request', request.id);
      
      toast({
        title: "Success",
        description: "Request has been approved (mock)"
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
      console.log('Mock: Rejecting request', request.id);

      toast({
        title: "Success",
        description: "Request has been rejected (mock)"
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

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests to review</h3>
            <p className="text-gray-600">Employee request management functionality is disabled. Mock data only.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeRequestsManager;