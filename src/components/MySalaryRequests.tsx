import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseSalaryRequests } from '@/hooks/useSupabaseSalaryRequests';
import IndividualSalaryRequestModal from '@/components/hr/IndividualSalaryRequestModal';
import { DollarSign, Clock, CheckCircle, XCircle, User, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MySalaryRequestsProps {
  employees?: any[];
}

const MySalaryRequests = ({ employees = [] }: MySalaryRequestsProps) => {
  const { employee } = useAuth();
  const { requests, loading, fetchRequestsByEmail } = useSupabaseSalaryRequests();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { toast } = useToast();

  // Filter salary requests for current user and fetch them
  useEffect(() => {
    if (employee?.email) {
      console.log('Fetching salary requests for:', employee.email);
      fetchRequestsByEmail(employee.email);
    }
  }, [employee?.email, fetchRequestsByEmail]);

  const mySalaryRequests = requests;
  
  console.log('MySalaryRequests - loading:', loading, 'requests:', mySalaryRequests.length);

  const handleRequestSubmitted = async (requestData: any) => {
    try {
      if (!employee?.authUserId) {
        toast({
          title: "Error",
          description: "User authentication ID not found. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      // Use the proper Supabase money_requests table
      const { data, error } = await supabase
        .from('money_requests')
        .insert([{
          user_id: employee.authUserId,
          amount: parseFloat(requestData.amount.replace(/[^\d.-]/g, '')),
          reason: requestData.details?.reason || requestData.description,
          request_type: requestData.details?.request_type || 'salary',
          requested_by: employee.email,
          status: 'pending',
          approval_stage: 'pending_finance'
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Salary request submitted successfully and awaiting Finance approval"
      });

      setShowRequestModal(false);
      fetchRequestsByEmail(employee.email);
    } catch (error: any) {
      console.error('Error submitting salary request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit salary request",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getApprovalStatus = (request: any) => {
    // For Supabase money_requests
    if (request.approval_stage === 'completed') {
      return 'Fully Approved';
    } else if (request.approval_stage === 'finance_approved') {
      return 'Finance Approved - Awaiting Admin';
    } else if (request.approval_stage === 'pending_finance') {
      return 'Pending Finance Approval';
    } else {
      return request.status || 'Pending';
    }
  };

  if (!employee) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view your salary requests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Salary Requests</h2>
          <p className="text-muted-foreground">Track your salary payment requests</p>
        </div>
        <Button onClick={() => setShowRequestModal(true)}>
          <DollarSign className="h-4 w-4 mr-2" />
          Request Salary
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{employee.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Monthly Salary</p>
                <p className="font-medium">UGX {employee.salary?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{employee.phone || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{employee.department}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>
            Your salary payment requests and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading requests...</p>
            </div>
          ) : mySalaryRequests.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Salary Requests</h3>
              <p className="text-muted-foreground mb-4">You haven't submitted any salary requests yet.</p>
              <Button onClick={() => setShowRequestModal(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                Submit First Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {mySalaryRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">Salary Request - {request.request_type}</h4>
                      <p className="text-sm text-muted-foreground">
                        Type: {request.request_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">UGX {request.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(request.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {getApprovalStatus(request)}
                        </div>
                      </Badge>
                      
                      <div className="flex gap-1">
                        <Badge 
                          variant="outline" 
                          className={request.finance_approved_at ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                        >
                          Finance: {request.finance_approved_at ? 'Approved' : 'Pending'}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={request.admin_approved_at ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                        >
                          Admin: {request.admin_approved_at ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    {request.status === 'approved' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Ready for Withdrawal
                      </Badge>
                    )}
                  </div>

                  {request.reason && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Reason: </span>
                        {request.reason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <IndividualSalaryRequestModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        onRequestSubmitted={handleRequestSubmitted}
        employees={employees}
      />
    </div>
  );
};

export default MySalaryRequests;