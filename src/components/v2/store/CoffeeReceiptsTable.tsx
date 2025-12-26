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
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Package, User, Scale, Layers } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const CoffeeReceiptsTable = () => {
  const isMobile = useIsMobile();
  
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
    return <Badge variant={variants[status] || 'default'} className="text-xs">{status}</Badge>;
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

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {receipts.map((receipt) => (
          <Card key={receipt.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{receipt.batch_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(receipt.date), 'PP')}
                  </p>
                </div>
                {getStatusBadge(receipt.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{receipt.supplier_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{receipt.coffee_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{receipt.kilograms} kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{receipt.bags} bags</span>
                </div>
              </div>
              
              {receipt.created_by && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  Received by: {receipt.created_by}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="rounded-md border overflow-x-auto">
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
