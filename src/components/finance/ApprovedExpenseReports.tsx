import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, DollarSign, Calendar, User, Phone } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovedExpenseRecord {
  id: string;
  title: string;
  description: string;
  amount: string;
  type: string;
  status: string;
  requestedby: string;
  daterequested: string;
  priority: string;
  phone?: string;
  department: string;
  finance_approved_at?: string | null;
  admin_approved_at?: string | null;
  finance_approved_by?: string | null;
  admin_approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

const ApprovedExpenseReports = () => {
  const [approvedRequests, setApprovedRequests] = useState<ApprovedExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedExpenses();
  }, []);

  const fetchApprovedExpenses = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('status', 'Approved')
        .in('type', ['Expense Request', 'Airtime/Data Request'])
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching approved expenses:', error);
        return;
      }

      console.log('Fetched approved expense requests:', data);
      setApprovedRequests(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalApprovedAmount = approvedRequests.reduce(
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
          <span>{approvedRequests.length} requests approved</span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Total: UGX {totalApprovedAmount.toLocaleString()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {approvedRequests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No approved expense requests found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Approved expense requests will appear here once they are fully processed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedRequests.map((request) => (
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

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">UGX {parseFloat(request.amount || '0').toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{request.requestedby}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{request.phone || 'N/A'}</span>
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
                  {request.finance_approved_at && (
                    <div>
                      <span className="font-medium">Finance Approved:</span>
                      <br />
                      {request.finance_approved_by || 'Finance Team'} - {format(new Date(request.finance_approved_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}
                  {request.admin_approved_at && (
                    <div>
                      <span className="font-medium">Admin Approved:</span>
                      <br />
                      {request.admin_approved_by || 'Admin Team'} - {format(new Date(request.admin_approved_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}
                  {!request.finance_approved_at && !request.admin_approved_at && (
                    <div className="col-span-2">
                      <span className="font-medium">Status:</span> Direct approval (legacy system)
                    </div>
                  )}
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