import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  phone_number: string;
  status: string;
  transaction_reference?: string;
  mno_transaction_id?: string;
  created_at: string;
  processed_at?: string;
  completion_date?: string;
  failure_reason?: string;
}

export const WithdrawalProcessingManager: React.FC = () => {
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawal requests:', error);
        return;
      }

      setWithdrawalRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (withdrawalId: string) => {
    setProcessing(withdrawalId);
    try {
      console.log('Processing withdrawal ID:', withdrawalId);
      
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: { withdrawalRequestId: withdrawalId }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: 'Withdrawal Initiated',
        description: 'Mobile money transfer has been initiated successfully.',
      });

      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process withdrawal request.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const checkWithdrawalStatus = async (transactionReference: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-withdrawal-status', {
        body: { transactionReference }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Status Updated',
        description: `Transaction status: ${data.status}`,
      });

      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error checking status:', error);
      toast({
        title: 'Status Check Failed',
        description: error.message || 'Failed to check transaction status.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Withdrawal Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading withdrawal requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Withdrawal Processing ({withdrawalRequests.length})
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchWithdrawalRequests}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {withdrawalRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No withdrawal requests found.
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawalRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(request.amount)}</span>
                      <Badge className={`${getStatusColor(request.status)} flex items-center gap-1`}>
                        {getStatusIcon(request.status)}
                        {request.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Phone: {request.phone_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requested: {new Date(request.created_at).toLocaleString()}
                    </p>
                    {request.transaction_reference && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {request.transaction_reference}
                      </p>
                    )}
                    {request.mno_transaction_id && (
                      <p className="text-xs text-muted-foreground">
                        MNO ID: {request.mno_transaction_id}
                      </p>
                    )}
                    {request.failure_reason && (
                      <p className="text-xs text-red-600">
                        Reason: {request.failure_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => processWithdrawal(request.id)}
                        disabled={processing === request.id}
                      >
                        {processing === request.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Process'
                        )}
                      </Button>
                    )}
                    {request.status === 'processing' && request.transaction_reference && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkWithdrawalStatus(request.transaction_reference!)}
                      >
                        Check Status
                      </Button>
                    )}
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