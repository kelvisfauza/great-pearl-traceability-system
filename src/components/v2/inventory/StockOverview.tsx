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

const StockOverview = () => {
  const { data: stockItems, isLoading } = useQuery({
    queryKey: ['v2-inventory-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('coffee_type', { ascending: true })
        .order('location', { ascending: true });
      
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

  if (!stockItems || stockItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No inventory items found.
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
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Total Bags</TableHead>
            <TableHead className="text-right">Total Kilograms</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.coffee_type}</TableCell>
              <TableCell>{item.location}</TableCell>
              <TableCell className="text-right">{item.total_bags.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.total_kilograms.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(item.status)}>
                  {item.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(item.last_updated), 'PP')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StockOverview;
