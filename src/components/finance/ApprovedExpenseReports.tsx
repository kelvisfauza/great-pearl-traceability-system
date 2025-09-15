import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { CheckCircle, DollarSign, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

const ApprovedExpenseReports = () => {
  const { requests, loading } = useApprovalRequests();

  // Filter for fully approved expense requests
  const approvedExpenseRequests = requests.filter(
    request => 
      request.type === 'Expense Request' && 
      request.status === 'Approved' &&
      request.finance_approved_at && 
      request.admin_approved_at
  );

  const totalApprovedAmount = approvedExpenseRequests.reduce(
    (sum, request) => sum + parseFloat(request.amount || '0'), 
    0
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Approved Expense Requests
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{approvedExpenseRequests.length} requests approved</span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Total: UGX {totalApprovedAmount.toLocaleString()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {approvedExpenseRequests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No approved expense requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedExpenseRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{request.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.description}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    Fully Approved
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">UGX {parseFloat(request.amount || '0').toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{request.requestedby}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(request.daterequested), 'MMM dd, yyyy')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      request.priority === 'High' ? 'border-red-200 text-red-700' :
                      request.priority === 'Medium' ? 'border-yellow-200 text-yellow-700' :
                      'border-green-200 text-green-700'
                    }>
                      {request.priority}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Finance Approved:</span>
                    <br />
                    {request.finance_approved_by} - {format(new Date(request.finance_approved_at!), 'MMM dd, yyyy HH:mm')}
                  </div>
                  <div>
                    <span className="font-medium">Admin Approved:</span>
                    <br />
                    {request.admin_approved_by} - {format(new Date(request.admin_approved_at!), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApprovedExpenseReports;