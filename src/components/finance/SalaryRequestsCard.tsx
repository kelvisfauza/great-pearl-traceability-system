
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, XCircle, CheckCircle, Calendar, DollarSign } from "lucide-react";

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
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              HR Salary Payment Requests
            </CardTitle>
            <CardDescription>
              Review and approve salary payment requests from HR department
            </CardDescription>
          </div>
          <Badge variant="secondary">{pendingSalaryRequests.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {pendingSalaryRequests.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-500">HR salary requests will appear here for approval</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingSalaryRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-lg font-semibold text-gray-900">{request.title}</h4>
                      <Badge variant="secondary">{request.priority}</Badge>
                    </div>
                    <p className="text-gray-600 mb-4">{request.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Requested by</p>
                          <p className="font-medium">{request.requestedby}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="font-medium">{new Date(request.daterequested).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-medium text-green-600">{request.amount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Employees</p>
                          <p className="font-medium">{request.details?.employee_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 ml-6">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onRejectSalaryPayment(request.id)}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => onApproveSalaryPayment(request.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
                
                {request.details && (
                  <div className="bg-white rounded-md p-4 border">
                    <h5 className="font-medium text-sm mb-3 text-gray-900">Payment Details</h5>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Month:</span>
                        <span className="ml-2 font-medium">{request.details.month}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Base Salary:</span>  
                        <span className="ml-2 font-medium">UGX {request.details.total_salary?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Payment Method:</span>
                        <span className="ml-2 font-medium">{request.details.payment_method}</span>
                      </div>
                      {request.details.bonuses > 0 && (
                        <div>
                          <span className="text-gray-500">Bonuses:</span>
                          <span className="ml-2 font-medium text-green-600">+UGX {request.details.bonuses.toLocaleString()}</span>
                        </div>
                      )}
                      {request.details.deductions > 0 && (
                        <div>
                          <span className="text-gray-500">Deductions:</span>
                          <span className="ml-2 font-medium text-red-600">-UGX {request.details.deductions.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {request.details.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-gray-500 text-sm font-medium">Notes:</span>
                        <p className="text-sm mt-1 text-gray-700">{request.details.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalaryRequestsCard;
