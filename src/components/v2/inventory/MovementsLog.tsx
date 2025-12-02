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
import { Loader2, ArrowUp, ArrowDown, ArrowLeftRight, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const MovementsLog = () => {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['v2-inventory-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No inventory movements recorded yet.
      </div>
    );
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'RECEIPT':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'SALE':
      case 'DISPATCH':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'TRANSFER':
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      case 'ADJUSTMENT':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'RECEIPT':
        return 'default';
      case 'SALE':
      case 'DISPATCH':
        return 'destructive';
      case 'TRANSFER':
        return 'secondary';
      case 'ADJUSTMENT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Coffee Record</TableHead>
            <TableHead className="text-right">Quantity (kg)</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>{format(new Date(movement.created_at), 'PP p')}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getMovementIcon(movement.movement_type)}
                  <Badge variant={getMovementColor(movement.movement_type)}>
                    {movement.movement_type}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{movement.coffee_record_id}</TableCell>
              <TableCell className="text-right font-semibold">
                {movement.quantity_kg.toLocaleString()}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {movement.reference_type && movement.reference_id && (
                  <span>{movement.reference_type}: {movement.reference_id}</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{movement.created_by}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {movement.notes || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MovementsLog;
