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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PendingLotsTable = () => {
  const navigate = useNavigate();
  
  const { data: pendingLots, isLoading } = useQuery({
    queryKey: ['v2-pending-quality'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
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

  if (!pendingLots || pendingLots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending lots for quality assessment.
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingLots.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell>{format(new Date(lot.date), 'PP')}</TableCell>
              <TableCell className="font-mono">{lot.batch_number}</TableCell>
              <TableCell>{lot.supplier_name}</TableCell>
              <TableCell>{lot.coffee_type}</TableCell>
              <TableCell className="text-right">{lot.kilograms}</TableCell>
              <TableCell className="text-right">{lot.bags}</TableCell>
              <TableCell>
                <Badge variant="secondary">PENDING</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => navigate(`/v2/quality/assess/${lot.id}`)}
                >
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Assess
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PendingLotsTable;
