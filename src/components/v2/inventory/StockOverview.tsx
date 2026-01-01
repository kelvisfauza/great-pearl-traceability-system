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

interface StockItem {
  id: string;
  coffee_type: string;
  location: string;
  total_bags: number;
  total_kilograms: number;
  status: string;
  last_updated: string;
}

const StockOverview = () => {
  const { data: stockItems, isLoading: isLoadingStock } = useQuery({
    queryKey: ['v2-inventory-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('coffee_type', { ascending: true })
        .order('location', { ascending: true });
      
      if (error) throw error;
      return data as StockItem[];
    }
  });

  // Fetch sold out coffee from sales transactions
  const { data: soldOutData, isLoading: isLoadingSold } = useQuery({
    queryKey: ['v2-inventory-sold-out'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('coffee_type, weight, created_at');
      
      if (error) throw error;
      
      // Group by coffee type
      const soldByCoffeeType: Record<string, { total_kg: number; last_sale: string }> = {};
      
      data?.forEach((sale) => {
        const type = sale.coffee_type || 'Unknown';
        if (!soldByCoffeeType[type]) {
          soldByCoffeeType[type] = { total_kg: 0, last_sale: sale.created_at };
        }
        soldByCoffeeType[type].total_kg += Number(sale.weight) || 0;
        if (sale.created_at > soldByCoffeeType[type].last_sale) {
          soldByCoffeeType[type].last_sale = sale.created_at;
        }
      });
      
      return soldByCoffeeType;
    }
  });

  const isLoading = isLoadingStock || isLoadingSold;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Combine stock items with sold out items
  const allItems: StockItem[] = [...(stockItems || [])];
  
  // Add sold out items
  if (soldOutData) {
    Object.entries(soldOutData).forEach(([coffeeType, data]) => {
      allItems.push({
        id: `sold-${coffeeType}`,
        coffee_type: coffeeType,
        location: 'Sold',
        total_bags: Math.round(data.total_kg / 60), // Estimate bags
        total_kilograms: data.total_kg,
        status: 'sold_out',
        last_updated: data.last_sale,
      });
    });
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No inventory items found.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'In Stock':
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
          {allItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.coffee_type}</TableCell>
              <TableCell>{item.location}</TableCell>
              <TableCell className="text-right">{item.total_bags.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.total_kilograms.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(item.status)}>
                  {item.status.toUpperCase().replace('_', ' ')}
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
