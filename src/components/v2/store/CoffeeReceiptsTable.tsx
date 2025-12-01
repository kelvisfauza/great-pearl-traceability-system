import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const CoffeeReceiptsTable = () => {
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['v2-coffee-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'PENDING': 'secondary',
      'QUALITY_REJECTED': 'destructive',
      'APPROVED_FOR_FINANCE': 'default',
      'PAID': 'outline',
      'SOLD': 'outline'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!receipts || receipts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No coffee receipts found. Create your first receipt to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Batch #</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Coffee Type</TableHead>
            <TableHead className="text-right">Kilograms</TableHead>
            <TableHead className="text-right">Bags</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Received By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((receipt) => (
            <TableRow key={receipt.id}>
              <TableCell>{format(new Date(receipt.date), 'PP')}</TableCell>
              <TableCell className="font-mono">{receipt.batch_number}</TableCell>
              <TableCell>{receipt.supplier_name}</TableCell>
              <TableCell>{receipt.coffee_type}</TableCell>
              <TableCell className="text-right">{receipt.kilograms}</TableCell>
              <TableCell className="text-right">{receipt.bags}</TableCell>
              <TableCell>{getStatusBadge(receipt.status)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {receipt.created_by || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CoffeeReceiptsTable;
