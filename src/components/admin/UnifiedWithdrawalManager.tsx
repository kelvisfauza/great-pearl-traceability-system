import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, ArrowRight, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  phone_number: string;
  channel: string;
  status: string;
  request_ref: string;
  created_at: string;
  approved_at?: string;
  processed_at?: string;
  transaction_reference?: string;
  failure_reason?: string;
  approved_by?: string;
}

interface WithdrawalStats {
  total_requests: number;
  pending_count: number;
  approved_today: number;
  total_amount_pending: number;
}

export const UnifiedWithdrawalManager: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<WithdrawalStats>({
    total_requests: 0,
    pending_count: 0,
    approved_today: 0,
    total_amount_pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setWithdrawals(data || []);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const totalRequests = data?.length || 0;
      const pendingCount = data?.filter(req => req.status === 'pending')?.length || 0;
      const approvedToday = data?.filter(req => 
        req.approved_at && req.approved_at.startsWith(today)
      )?.length || 0;
      const totalAmountPending = data
        ?.filter(req => req.status === 'pending')
        ?.reduce((sum, req) => sum + Number(req.amount), 0) || 0;

      setStats({
        total_requests: totalRequests,
        pending_count: pendingCount,
        approved_today: approvedToday,
        total_amount_pending: totalAmountPending
      });

    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to fetch withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (requestId: string) => {
    setProcessing(prev => ({ ...prev, [requestId]: true }));
    
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          approved_by: 'Admin'
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Withdrawal request approved');
      await fetchWithdrawals();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast.error('Failed to approve withdrawal');
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const rejectWithdrawal = async (requestId: string, reason: string) => {
    setProcessing(prev => ({ ...prev, [requestId]: true }));
    
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'failed',
          failure_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Withdrawal request rejected');
      await fetchWithdrawals();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error('Failed to reject withdrawal');
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const processWithdrawal = async (requestId: string) => {
    if (!requestId) return;
    
    setProcessing(prev => ({ ...prev, [requestId]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: { withdrawalRequestId: requestId }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Withdrawal processed successfully');
        await fetchWithdrawals();
      } else {
        toast.error(data?.error || 'Failed to process withdrawal');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('withdrawal_requests')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        () => {
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total_requests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Approved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved_today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Pending Amount</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(stats.total_amount_pending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for high pending requests */}
      {stats.pending_count > 10 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                High number of pending withdrawal requests ({stats.pending_count}). Consider processing them soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawals List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Manage and process withdrawal requests</CardDescription>
            </div>
            <Button onClick={fetchWithdrawals} variant="outline">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No withdrawal requests found</p>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-lg">
                          {formatCurrency(request.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {request.channel} • {request.phone_number}
                        </p>
                      </div>
                      <Badge className={`flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="capitalize">{request.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>ID: {request.request_ref}</span>
                      <span>•</span>
                      <span>{new Date(request.created_at).toLocaleString()}</span>
                      {request.approved_at && (
                        <>
                          <span>•</span>
                          <span>Approved: {new Date(request.approved_at).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Withdrawal Request Details</DialogTitle>
                          <DialogDescription>
                            Request #{selectedRequest?.request_ref}
                          </DialogDescription>
                        </DialogHeader>
                        {selectedRequest && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Amount</p>
                                <p className="text-lg">{formatCurrency(selectedRequest.amount)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Status</p>
                                <Badge className={getStatusColor(selectedRequest.status)}>
                                  {selectedRequest.status}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Channel</p>
                                <p>{selectedRequest.channel}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Phone</p>
                                <p>{selectedRequest.phone_number}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Created</p>
                                <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                              </div>
                              {selectedRequest.transaction_reference && (
                                <div>
                                  <p className="text-sm font-medium">Transaction Ref</p>
                                  <p className="font-mono text-xs">{selectedRequest.transaction_reference}</p>
                                </div>
                              )}
                            </div>
                            {selectedRequest.failure_reason && (
                              <div>
                                <p className="text-sm font-medium text-red-600">Failure Reason</p>
                                <p className="text-red-600">{selectedRequest.failure_reason}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveWithdrawal(request.id)}
                          disabled={processing[request.id]}
                        >
                          {processing[request.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectWithdrawal(request.id, 'Rejected by admin')}
                          disabled={processing[request.id]}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {request.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => processWithdrawal(request.id)}
                        disabled={processing[request.id]}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing[request.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Process
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};