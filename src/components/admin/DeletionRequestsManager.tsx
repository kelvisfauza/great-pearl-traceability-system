import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar,
  User,
  Building,
  MessageSquare
} from 'lucide-react';

interface DeletionRequest {
  id: string;
  table_name: string;
  record_id: string;
  record_data: any;
  reason: string;
  requested_by: string;
  requested_by_department: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_comments?: string;
}

const DeletionRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminComments, setAdminComments] = useState<{ [key: string]: string }>({});
  const { employee } = useAuth();
  const { toast } = useToast();

  const isAdmin = employee?.role === 'Administrator';

  const fetchDeletionRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests((data as DeletionRequest[]) || []);
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deletion requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can review deletion requests",
        variant: "destructive"
      });
      return;
    }

    setProcessingId(requestId);
    
    try {
      // Update the deletion request status - the database trigger will handle actual deletion
      const { error } = await supabase
        .from('deletion_requests')
        .update({
          status: action,
          reviewed_by: employee?.name,
          reviewed_at: new Date().toISOString(),
          admin_comments: adminComments[requestId] || null
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: action === 'approved' ? "Request Approved" : "Request Rejected",
        description: action === 'approved' 
          ? "The record has been deleted successfully" 
          : "The deletion request has been rejected",
        variant: action === 'approved' ? "default" : "destructive"
      });

      await fetchDeletionRequests();
    } catch (error) {
      console.error('Error updating deletion request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process deletion request",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const tableNames: { [key: string]: string } = {
      'employees': 'Employees',
      'suppliers': 'Suppliers',
      'payment_records': 'Payment Records',
      'quality_assessments': 'Quality Assessments',
      'coffee_records': 'Coffee Records',
      'finance_expenses': 'Finance Expenses',
      'reports': 'Reports',
      'approval_requests': 'Approval Requests',
      'salary_payments': 'Salary Payments',
      'daily_tasks': 'Daily Tasks',
      'contract_approvals': 'Contract Approvals',
      'supplier_contracts': 'Supplier Contracts',
      'finance_transactions': 'Finance Transactions'
    };
    return tableNames[tableName] || tableName;
  };

  const getRecordSummary = (recordData: any, tableName: string) => {
    switch (tableName) {
      case 'employees':
        return `${recordData.name} - ${recordData.position}`;
      case 'suppliers':
        return `${recordData.name} (${recordData.code})`;
      case 'payment_records':
        return `${recordData.supplier} - UGX ${recordData.amount?.toLocaleString()}`;
      case 'quality_assessments':
        return `Batch ${recordData.batch_number} - ${recordData.assessed_by}`;
      case 'reports':
        return `${recordData.name} - ${recordData.type}`;
      default:
        return recordData.name || recordData.title || recordData.description || 'Record';
    }
  };

  useEffect(() => {
    fetchDeletionRequests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Deletion Requests Management</h2>
          <p className="text-muted-foreground">
            Review and approve deletion requests from all departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-yellow-600">
            {pendingRequests.length} Pending
          </Badge>
          <Badge variant="secondary">
            {processedRequests.length} Processed
          </Badge>
        </div>
      </div>

      {!isAdmin && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Administrator Access Required</p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Only administrators can review and approve deletion requests.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Pending Deletion Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>
              Requests awaiting administrator approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-yellow-200">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="font-medium">{getTableDisplayName(request.table_name)}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm font-medium">
                            Record: {getRecordSummary(request.record_data, request.table_name)}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {request.requested_by}
                            </div>
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {request.requested_by_department}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.requested_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Reason for deletion:</p>
                        <p className="text-sm text-gray-700">{request.reason}</p>
                      </div>

                      {isAdmin && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Administrator Comments (Optional)
                            </label>
                            <Textarea
                              placeholder="Add comments about this deletion request..."
                              value={adminComments[request.id] || ''}
                              onChange={(e) => setAdminComments(prev => ({
                                ...prev,
                                [request.id]: e.target.value
                              }))}
                              className="min-h-[80px]"
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRequestAction(request.id, 'approved')}
                              disabled={processingId === request.id}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve & Execute
                            </Button>
                            <Button
                              onClick={() => handleRequestAction(request.id, 'rejected')}
                              disabled={processingId === request.id}
                              variant="destructive"
                              className="flex items-center gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
            <CardDescription>
              Previously reviewed deletion requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processedRequests.map((request) => (
                <Card key={request.id} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{getTableDisplayName(request.table_name)}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm font-medium">
                            Record: {getRecordSummary(request.record_data, request.table_name)}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {request.requested_by}
                            </div>
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {request.requested_by_department}
                            </div>
                          </div>
                        </div>
                      </div>

                      {request.reviewed_by && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-4 text-sm">
                            <span><strong>Reviewed by:</strong> {request.reviewed_by}</span>
                            <span><strong>Date:</strong> {new Date(request.reviewed_at!).toLocaleString()}</span>
                          </div>
                          {request.admin_comments && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Admin Comments:</p>
                              <p className="text-sm text-gray-700 mt-1">{request.admin_comments}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-medium">No Deletion Requests</h3>
              <p className="text-muted-foreground">
                There are currently no deletion requests to review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeletionRequestsManager;