import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SalesTransaction {
  id: string;
  customer: string;
  coffee_type: string;
  weight: number;
  unit_price: number;
  total_amount: number;
  status: string;
  date: string;
  created_at: string;
}

const SalesTransactionsList = () => {
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching sales transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      'completed': { variant: 'default', label: 'Completed' },
      'pending': { variant: 'secondary', label: 'Pending' },
      'cancelled': { variant: 'destructive', label: 'Cancelled' },
    };
    const config = statusConfig[status?.toLowerCase()] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sales transactions found. Start by recording a new sale.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Coffee Type</TableHead>
          <TableHead className="text-right">Weight (kg)</TableHead>
          <TableHead className="text-right">Unit Price</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              {format(new Date(transaction.date || transaction.created_at), 'dd MMM yyyy')}
            </TableCell>
            <TableCell className="font-medium">{transaction.customer}</TableCell>
            <TableCell>{transaction.coffee_type}</TableCell>
            <TableCell className="text-right">{transaction.weight?.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {transaction.unit_price?.toLocaleString()} UGX
            </TableCell>
            <TableCell className="text-right font-medium">
              {transaction.total_amount?.toLocaleString()} UGX
            </TableCell>
            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SalesTransactionsList;
