import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const PricingVerificationTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-pricing-verify'],
    queryFn: async () => {
      // Fetch assessments with their linked coffee records for coffee_type
      const { data: assessments, error } = await supabase
        .from('quality_assessments')
        .select('id, batch_number, suggested_price, final_price, status, created_at, date_assessed, moisture, outturn, store_record_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get coffee types from linked coffee records
      const recordIds = assessments?.map(a => a.store_record_id).filter(Boolean) || [];
      let coffeeTypeMap: Record<string, string> = {};

      if (recordIds.length > 0) {
        const { data: records } = await supabase
          .from('coffee_records')
          .select('id, coffee_type, supplier_name')
          .in('id', recordIds);

        if (records) {
          coffeeTypeMap = Object.fromEntries(records.map(r => [r.id, r.coffee_type]));
        }
      }

      const enriched = (assessments || []).map(a => ({
        ...a,
        coffee_type: a.store_record_id ? coffeeTypeMap[a.store_record_id] || 'Unknown' : 'Unknown',
        variance: (a.final_price || 0) - (a.suggested_price || 0),
      }));

      const withVariance = enriched.filter(a => a.final_price && a.variance !== 0);
      const avgSuggested = enriched.length > 0 ? enriched.reduce((s, a) => s + a.suggested_price, 0) / enriched.length : 0;
      const avgFinal = enriched.filter(a => a.final_price).length > 0
        ? enriched.filter(a => a.final_price).reduce((s, a) => s + (a.final_price || 0), 0) / enriched.filter(a => a.final_price).length
        : 0;

      return {
        assessments: enriched,
        totalAssessments: enriched.length,
        withVariance: withVariance.length,
        avgSuggested: Math.round(avgSuggested),
        avgFinal: Math.round(avgFinal),
        priceOverrides: withVariance.filter(a => a.variance > 0).length,
        priceReductions: withVariance.filter(a => a.variance < 0).length,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5" />Pricing Verification</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Assessed</p>
          <p className="text-2xl font-bold">{data?.totalAssessments || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Avg Suggested Price</p>
          <p className="text-2xl font-bold">UGX {(data?.avgSuggested || 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Avg Final Price</p>
          <p className="text-2xl font-bold">UGX {(data?.avgFinal || 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Price Overrides</p>
          <p className="text-2xl font-bold">
            <span className="text-green-600">{data?.priceOverrides || 0}↑</span>
            {' / '}
            <span className="text-red-600">{data?.priceReductions || 0}↓</span>
          </p>
        </CardContent></Card>
      </div>

      {(data?.withVariance || 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-sm">{data?.withVariance} assessments have price variances</p>
              <p className="text-xs text-muted-foreground">Final price differs from suggested price — review below</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Pricing ({data?.assessments.length || 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Moisture</TableHead>
              <TableHead>Outturn</TableHead>
              <TableHead>Suggested</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.assessments.map((a: any) => (
                <TableRow key={a.id} className={a.variance !== 0 ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                  <TableCell className="font-mono text-xs">{a.batch_number}</TableCell>
                  <TableCell className="text-xs">{a.coffee_type}</TableCell>
                  <TableCell className="text-xs">{a.moisture}%</TableCell>
                  <TableCell className="text-xs">{a.outturn ? `${a.outturn}%` : '—'}</TableCell>
                  <TableCell>UGX {(a.suggested_price || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">UGX {(a.final_price || a.suggested_price || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    {a.variance !== 0 ? (
                      <Badge variant={a.variance > 0 ? 'outline' : 'destructive'} className="flex items-center gap-1 w-fit">
                        {a.variance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {a.variance > 0 ? '+' : ''}{a.variance.toLocaleString()}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                  <TableCell className="text-xs">{format(new Date(a.date_assessed), 'dd MMM')}</TableCell>
                </TableRow>
              ))}
              {(!data?.assessments || data.assessments.length === 0) && (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No pricing data found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingVerificationTab;
