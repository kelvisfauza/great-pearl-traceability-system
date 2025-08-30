import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, Check, X, Printer } from 'lucide-react';
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

export const WithdrawalRequestsManager = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [searchRef, setSearchRef] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return;
    }

    setRequests(data || []);
  };

  const searchByReference = async () => {
    if (!searchRef.trim()) {
      fetchRequests();
      return;
    }

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('request_ref', searchRef.trim())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching requests:', error);
      return;
    }

    setRequests(data || []);
    if (data && data.length === 0) {
      toast({
        title: "No Results",
        description: "No withdrawal request found with that reference number.",
        variant: "destructive"
      });
    }
  };

  const approveRequest = async (request: WithdrawalRequest) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'Finance Department'
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Request Approved",
        description: "Withdrawal request has been approved successfully.",
      });

      // Generate and print payment slip
      printPaymentSlip(request);
      
      fetchRequests();
      setShowDetails(false);
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (request: WithdrawalRequest) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          approved_by: 'Finance Department'
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "Withdrawal request has been rejected.",
      });

      fetchRequests();
      setShowDetails(false);
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const printPaymentSlip = (request: WithdrawalRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Payment Slip – ${request.request_ref}</title>
        <style>
          body { font: 14px/1.4 system-ui; margin: 0; padding: 20px; }
          .slip { width: 640px; margin: 0 auto; padding: 24px; border: 2px solid #000; }
          h1 { font-size: 20px; margin: 0 0 16px; text-align: center; }
          h2 { font-size: 16px; margin: 16px 0 8px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .amount { font-size: 18px; font-weight: bold; }
          .signatures { margin-top: 40px; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 30px; }
          @media print { .no-print { display:none; } }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="slip">
          <h1>OFFICIAL PAYMENT SLIP</h1>
          
          <h2>Request Details</h2>
          <div class="row"><div>Reference:</div><div><strong>${request.request_ref}</strong></div></div>
          <div class="row"><div>User ID:</div><div>${request.user_id}</div></div>
          <div class="row"><div>Amount:</div><div class="amount">UGX ${request.amount.toLocaleString()}</div></div>
          <div class="row"><div>Channel:</div><div>${request.channel}</div></div>
          <div class="row"><div>Phone:</div><div>${request.phone_number}</div></div>
          
          <h2>Approval Details</h2>
          <div class="row"><div>Status:</div><div><strong>APPROVED</strong></div></div>
          <div class="row"><div>Approved By:</div><div>${request.approved_by}</div></div>
          <div class="row"><div>Approved At:</div><div>${new Date().toLocaleString()}</div></div>
          
          <div class="signatures">
            <div class="sig-row">
              <div>
                <div>Finance Officer:</div>
                <div style="margin-top: 20px;">_____________________</div>
                <div style="margin-top: 5px;">Signature & Date</div>
              </div>
              <div>
                <div>Recipient:</div>
                <div style="margin-top: 20px;">_____________________</div>
                <div style="margin-top: 5px;">Signature & Date</div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            This is an official payment authorization slip. Keep for your records.
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
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
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Withdrawal Requests Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search by reference number (e.g., WR-2025-08-30-1234)"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchByReference()}
            />
            <Button onClick={searchByReference}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={fetchRequests}>
              Show All
            </Button>
          </div>

          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{request.request_ref}</div>
                    <div className="text-sm text-muted-foreground">
                      UGX {request.amount.toLocaleString()} • {request.channel} • {request.phone_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
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
            <DialogTitle>Withdrawal Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Reference:</span>
                  <span>{selectedRequest.request_ref}</span>
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
                  <span>{new Date(selectedRequest.created_at).toLocaleString()}</span>
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => approveRequest(selectedRequest)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve & Print Slip
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectRequest(selectedRequest)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}

              {selectedRequest.status === 'approved' && (
                <Button
                  onClick={() => printPaymentSlip(selectedRequest)}
                  className="w-full"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Print Payment Slip
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};