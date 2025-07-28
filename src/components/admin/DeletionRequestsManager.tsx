import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';

interface DeletionRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string;
  employee_email: string;
  requested_by: string;
  requester_name: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  request_date: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

const DeletionRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDeletionRequests = async () => {
    try {
      const q = query(collection(db, 'deletion_requests'), orderBy('request_date', 'desc'));
      const snapshot = await getDocs(q);
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeletionRequest[];
      
      setRequests(requestsData);
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

  useEffect(() => {
    fetchDeletionRequests();
  }, []);

  const handleApprove = async (requestId: string, employeeId: string) => {
    try {
      // Update request status
      await updateDoc(doc(db, 'deletion_requests', requestId), {
        status: 'Approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin'
      });

      // Delete the employee
      await deleteDoc(doc(db, 'employees', employeeId));

      toast({
        title: "Request Approved",
        description: "Employee has been deleted successfully",
      });

      fetchDeletionRequests();
    } catch (error) {
      console.error('Error approving deletion request:', error);
      toast({
        title: "Error",
        description: "Failed to approve deletion request",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'deletion_requests', requestId), {
        status: 'Rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin'
      });

      toast({
        title: "Request Rejected",
        description: "Deletion request has been rejected",
      });

      fetchDeletionRequests();
    } catch (error) {
      console.error('Error rejecting deletion request:', error);
      toast({
        title: "Error",
        description: "Failed to reject deletion request",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'secondary';
      case 'Approved':
        return 'default';
      case 'Rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Employee Deletion Requests
        </CardTitle>
        <CardDescription>
          Review and manage employee deletion requests from HR
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No deletion requests found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.employee_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.employee_position}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {request.employee_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {request.requester_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.request_date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(request.status)}
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === 'Pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id, request.employee_id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {request.status !== 'Pending' && (
                        <div className="text-sm text-muted-foreground">
                          {request.reviewed_at && `Reviewed ${format(new Date(request.reviewed_at), 'MMM dd')}`}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeletionRequestsManager;