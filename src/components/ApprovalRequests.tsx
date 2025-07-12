
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  Users, 
  FileText, 
  Truck,
  Shield,
  Coffee,
  TrendingUp
} from "lucide-react";

const ApprovalRequests = () => {
  // Sample approval requests from different departments
  const approvalRequests = [
    {
      id: "APR-2024-001",
      department: "Procurement",
      type: "High Price Exception",
      title: "Ntungamo Growers Union - Wugar Premium",
      description: "Price approval for Wugar at UGX 8,200/bag (15% above reference)",
      amount: "UGX 4,100,000",
      requestedBy: "Sarah Nakato",
      dateRequested: "2024-01-12",
      priority: "High",
      status: "Pending",
      details: {
        supplier: "Ntungamo Growers Union",
        quantity: "500 bags",
        referencePrice: "UGX 7,200",
        requestedPrice: "UGX 8,200",
        reason: "Premium quality lot with exceptional cupping scores"
      }
    },
    {
      id: "APR-2024-002",
      department: "Human Resources",
      type: "Staff Overtime",
      title: "Processing Team Overtime Authorization",
      description: "Overtime approval for weekend processing to meet export deadline",
      amount: "UGX 1,850,000",
      requestedBy: "James Mugisha",
      dateRequested: "2024-01-11",
      priority: "High",
      status: "Pending",
      details: {
        staff: "12 processing team members",
        hours: "16 hours overtime each",
        rate: "UGX 9,650/hour",
        deadline: "Export shipment on Jan 15"
      }
    },
    {
      id: "APR-2024-003",
      department: "Finance",
      type: "Budget Variance",
      title: "Equipment Maintenance Budget Increase",
      description: "Additional budget for critical roaster maintenance",
      amount: "UGX 2,500,000",
      requestedBy: "Rose Namuli",
      dateRequested: "2024-01-10",
      priority: "Medium",
      status: "Pending",
      details: {
        originalBudget: "UGX 5,000,000",
        additionalAmount: "UGX 2,500,000",
        equipment: "Primary roasting machine",
        urgency: "Preventive maintenance to avoid breakdown"
      }
    },
    {
      id: "APR-2024-004",
      department: "Quality Control",
      type: "Batch Rejection",
      title: "Reject 150 bags - Moisture Content Issue",
      description: "Approval to reject coffee batch due to high moisture content",
      amount: "UGX 1,080,000",
      requestedBy: "Peter Ssali",
      dateRequested: "2024-01-09",
      priority: "High",
      status: "Approved",
      details: {
        supplier: "Mbarara Coffee Cooperative",
        quantity: "150 bags",
        moistureContent: "14.5%",
        standard: "Max 12.5%",
        action: "Return to supplier for re-drying"
      }
    },
    {
      id: "APR-2024-005",
      department: "Sales & Marketing",
      type: "Price Discount",
      title: "Bulk Order Discount - European Client",
      description: "Special pricing for 500-bag order from German buyer",
      amount: "UGX 15,000,000",
      requestedBy: "Grace Apio",
      dateRequested: "2024-01-08",
      priority: "Medium",
      status: "Approved",
      details: {
        client: "Hamburg Coffee Roasters",
        standardPrice: "UGX 32,000/bag",
        discountedPrice: "UGX 30,000/bag",
        discount: "6.25%",
        totalOrder: "500 bags"
      }
    },
    {
      id: "APR-2024-006",
      department: "Logistics",
      type: "Transport Emergency",
      title: "Emergency Transport for Export Deadline",
      description: "Additional truck hire for urgent export shipment",
      amount: "UGX 800,000",
      requestedBy: "David Okello",
      dateRequested: "2024-01-07",
      priority: "High",
      status: "Pending",
      details: {
        destination: "Mombasa Port",
        quantity: "20 tonnes",
        deadline: "January 15, 2024",
        reason: "Regular transporter unavailable"
      }
    }
  ];

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

  const pendingRequests = approvalRequests.filter(req => req.status === "Pending");
  const completedRequests = approvalRequests.filter(req => req.status !== "Pending");

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
                            <span>By {request.requestedBy}</span>
                            <span>•</span>
                            <span>{request.dateRequested}</span>
                            <span>•</span>
                            <span className="font-medium text-gray-700">{request.amount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm">
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
                              <span className="ml-1 font-medium">{value}</span>
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
            {completedRequests.map((request) => {
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
                          <span>{request.requestedBy}</span>
                          <span>•</span>
                          <span>{request.dateRequested}</span>
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
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ApprovalRequests;
