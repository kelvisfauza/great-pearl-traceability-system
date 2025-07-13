
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, XCircle, CheckCircle, Calendar, DollarSign, Clock, FileText, User, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SalaryRequestsCardProps {
  pendingSalaryRequests: any[];
  onApproveSalaryPayment: (requestId: string) => void;
  onRejectSalaryPayment: (requestId: string) => void;
}

const SalaryRequestsCard = ({ 
  pendingSalaryRequests, 
  onApproveSalaryPayment, 
  onRejectSalaryPayment 
}: SalaryRequestsCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">HR Salary Payment Requests</CardTitle>
              <CardDescription className="text-sm">
                Review and approve monthly payroll requests from HR department
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {pendingSalaryRequests.length} pending
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {pendingSalaryRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              HR salary payment requests will appear here for your review and approval
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSalaryRequests.map((request, index) => (
              <div key={request.id} className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{request.title}</h4>
                      <Badge className={`text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                        {request.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{request.description}</p>
                  </div>
                  
                  <div className="flex gap-2 ml-6">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onRejectSalaryPayment(request.id)}
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => onApproveSalaryPayment(request.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>

                {/* Request Overview Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <User className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Requested By</p>
                      <p className="font-semibold text-gray-900">{request.requestedby}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Date Requested</p>
                      <p className="font-semibold text-gray-900">{new Date(request.daterequested).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Total Amount</p>
                      <p className="font-semibold text-green-600">{request.amount}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <Building2 className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Employees</p>
                      <p className="font-semibold text-gray-900">{request.details?.employee_count || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details Section */}
                {request.details && (
                  <div className="bg-white rounded-lg border p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <h5 className="font-semibold text-gray-900">Payment Breakdown</h5>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Payment Month</p>
                        <p className="font-semibold text-gray-900">{request.details.month}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Base Salaries</p>
                        <p className="font-semibold text-gray-900">UGX {request.details.total_salary?.toLocaleString()}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Payment Method</p>
                        <p className="font-semibold text-gray-900">{request.details.payment_method}</p>
                      </div>
                      
                      {request.details.bonuses > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 font-medium">Bonuses</p>
                          <p className="font-semibold text-green-600">+UGX {request.details.bonuses.toLocaleString()}</p>
                        </div>
                      )}
                      
                      {request.details.deductions > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 font-medium">Deductions</p>
                          <p className="font-semibold text-red-600">-UGX {request.details.deductions.toLocaleString()}</p>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Final Amount</p>
                        <p className="font-bold text-lg text-gray-900">UGX {request.details.total_amount?.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {request.details.notes && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-2">Additional Notes</p>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{request.details.notes}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {index < pendingSalaryRequests.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalaryRequestsCard;
