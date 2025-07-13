
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, Users, Building2, RefreshCw } from "lucide-react";

const ApprovalRequests = () => {
  const { requests, loading, updateRequestStatus, fetchRequests } = useApprovalRequests();
  const { employee, hasRole } = useAuth();
  const { toast } = useToast();

  // Check if user can approve requests (supervisors, operations managers, administrators)
  const canApproveRequests = hasRole('Supervisor') || hasRole('Operations Manager') || 
    hasRole('Administrator') || employee?.position === 'Supervisor' || 
    employee?.position === 'Operations Manager';

  console.log('ApprovalRequests - Can approve:', canApproveRequests);
  console.log('ApprovalRequests - Employee role:', employee?.role);
  console.log('ApprovalRequests - Employee position:', employee?.position);
  console.log('ApprovalRequests - Total requests:', requests.length);

  const handleApprove = async (requestId: string, requestTitle: string) => {
    console.log('Approving request:', requestId, requestTitle);
    const success = await updateRequestStatus(requestId, 'Approved');
    if (success) {
      toast({
        title: "Request Approved",
        description: `${requestTitle} has been approved successfully`,
      });
      // Refresh the list after approval
      setTimeout(() => fetchRequests(), 1000);
    } else {
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (requestId: string, requestTitle: string) => {
    console.log('Rejecting request:', requestId, requestTitle);
    const success = await updateRequestStatus(requestId, 'Rejected');
    if (success) {
      toast({
        title: "Request Rejected", 
        description: `${requestTitle} has been rejected`,
      });
      // Refresh the list after rejection
      setTimeout(() => fetchRequests(), 1000);
    } else {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    console.log('Manually refreshing approval requests');
    fetchRequests();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approval Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading approval requests...</div>
        </CardContent>
      </Card>
    );
  }

  if (!canApproveRequests) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">You don't have permission to view approval requests.</p>
          <p className="text-sm text-gray-400 mt-2">
            Current role: {employee?.role} | Position: {employee?.position}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Only show pending requests
  const pendingRequests = requests.filter(req => req.status === 'Pending');
  console.log('Pending requests for display:', pendingRequests.length);

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approval Requests
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>All caught up! No pending approval requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending approval requests</p>
            <p className="text-sm text-gray-400 mt-2">Total requests found: {requests.length}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Pending Approval Requests
          <Badge variant="destructive">{pendingRequests.length}</Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Review and approve requests from various departments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-3 bg-amber-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {request.type === 'Bank Transfer' && <DollarSign className="h-4 w-4 text-green-600" />}
                    {request.type === 'Salary Payment' && <Users className="h-4 w-4 text-blue-600" />}
                    {request.department === 'Finance' && <Building2 className="h-4 w-4 text-purple-600" />}
                    
                    <h4 className="font-semibold">{request.title}</h4>
                    <Badge variant="secondary">{request.priority}</Badge>
                    <Badge variant="outline">{request.type}</Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Department:</span>
                      <span className="ml-2 font-medium">{request.department}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Requested by:</span>
                      <span className="ml-2 font-medium">{request.requestedby}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Amount:</span>
                      <span className="ml-2 font-medium text-green-600">UGX {request.amount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">{new Date(request.daterequested).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleReject(request.id, request.title)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleApprove(request.id, request.title)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
              
              {/* Show additional details for bank transfers */}
              {request.type === 'Bank Transfer' && request.details && (
                <div className="bg-white rounded p-3 border">
                  <h5 className="font-medium text-sm mb-2">Payment Details:</h5>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Supplier:</span>
                      <span className="ml-1 font-medium">{request.details.supplier}</span>
                    </div>
                    {request.details.batchNumber && (
                      <div>
                        <span className="text-gray-500">Batch:</span>
                        <span className="ml-1 font-medium">{request.details.batchNumber}</span>
                      </div>
                    )}
                    {request.details.kilograms && (
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <span className="ml-1 font-medium">{request.details.kilograms} kg</span>
                      </div>
                    )}
                    {request.details.pricePerKg && (
                      <div>
                        <span className="text-gray-500">Price/Kg:</span>
                        <span className="ml-1 font-medium">UGX {request.details.pricePerKg.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalRequests;
