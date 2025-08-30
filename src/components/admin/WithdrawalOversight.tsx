import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, AlertTriangle, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  phone_number: string;
  status: string;
  channel: string;
  request_ref: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface WithdrawalStats {
  totalRequests: number;
  pendingRequests: number;
  totalAmount: number;
  approvedToday: number;
}

export const WithdrawalOversight = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<WithdrawalStats>({
    totalRequests: 0,
    pendingRequests: 0,
    totalAmount: 0,
    approvedToday: 0
  });
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching requests:', error);
      return;
    }

    setRequests(data || []);
    
    // Calculate stats
    const totalRequests = data?.length || 0;
    const pendingRequests = data?.filter(r => r.status === 'pending').length || 0;
    const totalAmount = data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    
    const today = new Date().toDateString();
    const approvedToday = data?.filter(r => 
      r.status === 'approved' && 
      r.approved_at && 
      new Date(r.approved_at).toDateString() === today
    ).length || 0;

    setStats({
      totalRequests,
      pendingRequests,
      totalAmount,
      approvedToday
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      approved: 'default',
      rejected: 'destructive',
      processing: 'secondary'
    };

    return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
  };

  useEffect(() => {
    fetchRequests();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('withdrawal_oversight')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Withdrawal Oversight Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.pendingRequests}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.approvedToday}</div>
              <div className="text-sm text-muted-foreground">Approved Today</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">UGX {stats.totalAmount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </Card>
          </div>

          {stats.pendingRequests > 5 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                High number of pending withdrawal requests require attention
              </span>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-medium">Recent Withdrawal Requests</h3>
            {requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{request.request_ref}</div>
                    <div className="text-sm text-muted-foreground">
                      User: {request.user_id.slice(0, 8)}... • UGX {request.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                      {request.approved_at && (
                        <span className="ml-2">
                          • Approved: {new Date(request.approved_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {requests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No withdrawal requests found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdrawal Request Oversight</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Reference:</span>
                  <span>{selectedRequest.request_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">User ID:</span>
                  <span className="text-xs">{selectedRequest.user_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Amount:</span>
                  <span className="font-bold">UGX {selectedRequest.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Channel:</span>
                  <span>{selectedRequest.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Phone:</span>
                  <span>{selectedRequest.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Created:</span>
                  <span className="text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                </div>
                {selectedRequest.approved_at && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">Approved:</span>
                      <span className="text-sm">{new Date(selectedRequest.approved_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Approved By:</span>
                      <span className="text-sm">{selectedRequest.approved_by}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 text-sm text-muted-foreground">
                <p>This is for oversight purposes. Finance department handles approval and processing.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};