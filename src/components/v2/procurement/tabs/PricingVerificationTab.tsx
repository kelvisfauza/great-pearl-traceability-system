import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign } from "lucide-react";

const PricingVerificationTab = () => {
  const { data: assessments, isLoading } = useQuery({
    queryKey: ['procurement-pricing-verify'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_assessments')
        .select('batch_number, suggested_price, final_price, status, coffee_type, created_at')
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5" />Pricing Verification</h3>

      <Card>
        <CardHeader><CardTitle>Recent Prices</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Batch</TableHead><TableHead>Type</TableHead><TableHead>Suggested</TableHead><TableHead>Final</TableHead><TableHead>Variance</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {assessments?.map((a: any) => {
                const variance = (a.final_price || 0) - (a.suggested_price || 0);
                return (
                  <TableRow key={a.batch_number}>
                    <TableCell className="font-mono">{a.batch_number}</TableCell>
                    <TableCell>{a.coffee_type}</TableCell>
                    <TableCell>UGX {(a.suggested_price || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">UGX {(a.final_price || a.suggested_price || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={variance === 0 ? 'secondary' : variance > 0 ? 'outline' : 'destructive'}>
                        {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingVerificationTab;
