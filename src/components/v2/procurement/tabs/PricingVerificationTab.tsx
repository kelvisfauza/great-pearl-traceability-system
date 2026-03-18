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

  const { data: marketPrices } = useQuery({
    queryKey: ['procurement-market-prices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('price_submissions').select('arabica_faq, robusta_faq, status')
        .eq('status', 'approved').order('created_at', { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5" />Pricing Verification</h3>

      {marketPrices && (
        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Market Arabica FAQ</p><p className="text-2xl font-bold">UGX {(marketPrices as any)?.arabica_faq?.toLocaleString() || '—'}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Market Robusta FAQ</p><p className="text-2xl font-bold">UGX {(marketPrices as any)?.robusta_faq?.toLocaleString() || '—'}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Recent Prices vs Market</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Batch</TableHead><TableHead>Type</TableHead><TableHead>Suggested</TableHead><TableHead>Final</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {assessments?.map((a: any) => (
                <TableRow key={a.batch_number}>
                  <TableCell className="font-mono">{a.batch_number}</TableCell>
                  <TableCell>{a.coffee_type}</TableCell>
                  <TableCell>UGX {(a.suggested_price || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">UGX {(a.final_price || a.suggested_price || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingVerificationTab;
