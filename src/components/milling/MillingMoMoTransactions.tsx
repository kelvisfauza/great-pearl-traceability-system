import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MoMoTransaction {
  id: string;
  reference: string;
  yo_reference: string | null;
  customer_id: string;
  customer_name: string;
  phone: string;
  amount: number;
  status: string;
  initiated_by: string;
  created_at: string;
  completed_at: string | null;
}

const MillingMoMoTransactions = () => {
  const [transactions, setTransactions] = useState<MoMoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('milling_momo_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data as MoMoTransaction[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('milling-momo-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milling_momo_transactions' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkStatus = async (txnId: string) => {
    setCheckingId(txnId);
    try {
      const { data, error } = await supabase.functions.invoke('milling-momo-check-status', {
        body: { transaction_id: txnId },
      });

      if (error) throw error;

      if (data?.status === 'completed') {
        toast.success(data.message || 'Payment successful! Balance updated.');
      } else if (data?.status === 'failed') {
        toast.error(data.message || 'Transaction failed');
      } else {
        toast.info(data?.message || 'Still pending - customer needs to enter PIN');
      }

      fetchTransactions();
    } catch (err: any) {
      toast.error('Failed to check status: ' + (err.message || 'Unknown error'));
    } finally {
      setCheckingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading MoMo transactions...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Mobile Money Transactions</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchTransactions} className="gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No MoMo transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-muted/50">
                    <td className="py-3 font-medium">{txn.customer_name}</td>
                    <td className="py-3 text-muted-foreground">{txn.phone}</td>
                    <td className="py-3 text-right font-semibold">UGX {txn.amount.toLocaleString()}</td>
                    <td className="py-3">{getStatusBadge(txn.status)}</td>
                    <td className="py-3 text-xs text-muted-foreground font-mono">{txn.reference}</td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {new Date(txn.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {txn.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => checkStatus(txn.id)}
                          disabled={checkingId === txn.id}
                          className="gap-1 text-xs"
                        >
                          {checkingId === txn.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                          Check
                        </Button>
                      )}
                      {txn.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => checkStatus(txn.id)}
                          disabled={checkingId === txn.id}
                          className="gap-1 text-xs"
                        >
                          {checkingId === txn.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                          Re-check
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MillingMoMoTransactions;
