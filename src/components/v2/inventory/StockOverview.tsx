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
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface InventorySummary {
  id: string;
  coffee_type: string;
  status: string;
  total_kilograms: number;
  remaining_kilograms: number;
  sold_kilograms: number;
  batch_count: number;
  last_updated: string;
}

const StockOverview = () => {
  const { data: inventorySummary, isLoading } = useQuery({
    queryKey: ['v2-inventory-overview'],
    queryFn: async () => {
      // Get inventory batches grouped by coffee type and status
      const { data: batches, error } = await supabase
        .from('inventory_batches')
        .select('*')
        .order('coffee_type', { ascending: true });
      
      if (error) throw error;

      // Group by coffee type
      const summaryMap: Record<string, {
        active_kg: number;
        sold_kg: number;
        batch_count: number;
        last_updated: string;
      }> = {};

      batches?.forEach((batch) => {
        const type = batch.coffee_type;
        if (!summaryMap[type]) {
          summaryMap[type] = {
            active_kg: 0,
            sold_kg: 0,
            batch_count: 0,
            last_updated: batch.updated_at,
          };
        }
        
        summaryMap[type].batch_count += 1;
        summaryMap[type].active_kg += Number(batch.remaining_kilograms) || 0;
        summaryMap[type].sold_kg += (Number(batch.total_kilograms) - Number(batch.remaining_kilograms)) || 0;
        
        if (batch.updated_at > summaryMap[type].last_updated) {
          summaryMap[type].last_updated = batch.updated_at;
        }
      });

      // Convert to array with both active and sold out rows
      const result: InventorySummary[] = [];
      
      Object.entries(summaryMap).forEach(([coffeeType, data]) => {
        // Add active stock row
        if (data.active_kg > 0) {
          result.push({
            id: `active-${coffeeType}`,
            coffee_type: coffeeType,
            status: 'available',
            total_kilograms: data.active_kg,
            remaining_kilograms: data.active_kg,
            sold_kilograms: 0,
            batch_count: data.batch_count,
            last_updated: data.last_updated,
          });
        }
        
        // Add sold out row
        if (data.sold_kg > 0) {
          result.push({
            id: `sold-${coffeeType}`,
            coffee_type: coffeeType,
            status: 'sold_out',
            total_kilograms: data.sold_kg,
            remaining_kilograms: 0,
            sold_kilograms: data.sold_kg,
            batch_count: data.batch_count,
            last_updated: data.last_updated,
          });
        }
      });

      return result;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inventorySummary || inventorySummary.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No inventory items found. Run migration to import existing stock.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'reserved':
        return 'secondary';
      case 'depleted':
        return 'destructive';
      case 'sold_out':
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
            <TableHead>Coffee Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Kilograms</TableHead>
            <TableHead className="text-right">Batches</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventorySummary.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.coffee_type}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(item.status)}>
                  {item.status === 'sold_out' ? 'SOLD OUT' : item.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{item.total_kilograms.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.batch_count}</TableCell>
              <TableCell>{format(new Date(item.last_updated), 'PP')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StockOverview;
