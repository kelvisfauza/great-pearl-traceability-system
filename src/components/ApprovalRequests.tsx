
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Package, 
  Users, 
  FileText, 
  Truck,
  Shield,
  Coffee,
  TrendingUp
} from "lucide-react";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useToast } from "@/hooks/use-toast";

const ApprovalRequests = () => {
  const { requests, loading, updateRequestStatus } = useApprovalRequests();
  const { toast } = useToast();

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case "Procurement": return Package;
      case "Human Resources": return Users;
      case "Finance": return DollarSign;
      case "Quality Control": return Shield;
      case "Sales & Marketing": return TrendingUp;
      case "Logistics": return Truck;
      case "Processing": return Coffee;
      default: return FileText;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "destructive";
      case "Medium": return "secondary";
      case "Low": return "outline";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "default";
      case "Rejected": return "destructive";
      case "Pending": return "secondary";
      default: return "outline";
    }
  };

  const handleApprove = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Approved');
    if (success) {
      toast({
        title: "Request Approved",
        description: "The approval request has been approved successfully.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to approve the request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Rejected');
    if (success) {
      toast({
        title: "Request Rejected",
        description: "The approval request has been rejected.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to reject the request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pendingRequests = requests.filter(req => req.status === "Pending");
  const completedRequests = requests.filter(req => req.status !== "Pending");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Approval Requests
          </CardTitle>
          <CardDescription>
            Centralized approval system for all departments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Loading approval requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
          Approval Requests
        </CardTitle>
        <CardDescription>
          Centralized approval system for all departments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({completedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No pending approvals</p>
              </div>
            ) : (
              pendingRequests.map((request) => {
                const DepartmentIcon = getDepartmentIcon(request.department);
                return (
                  <div key={request.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <DepartmentIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{request.title}</h4>
                            <Badge variant={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{request.department}</span>
                            <span>•</span>
                            <span>By {request.requestedby}</span>
                            <span>•</span>
                            <span>{new Date(request.daterequested).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-medium text-gray-700">{request.amount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReject(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                    {request.details && (
                      <div className="bg-gray-50 rounded p-3 mt-3">
                        <h5 className="font-medium text-sm mb-2">Request Details:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(request.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-500 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>
                              <span className="ml-1 font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No completed approvals</p>
              </div>
            ) : (
              completedRequests.map((request) => {
                const DepartmentIcon = getDepartmentIcon(request.department);
                return (
                  <div key={request.id} className="border rounded-lg p-4 opacity-75">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <DepartmentIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{request.title}</h4>
                            <Badge variant={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{request.department}</span>
                            <span>•</span>
                            <span>{request.requestedby}</span>
                            <span>•</span>
                            <span>{new Date(request.daterequested).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-medium">{request.amount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {request.status === "Approved" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ApprovalRequests;
