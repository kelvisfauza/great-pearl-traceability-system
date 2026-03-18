import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3 } from "lucide-react";

const SupplierAnalysisTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analyst-supplier-analysis'],
    queryFn: async () => {
      const { data: assessments, error } = await supabase.from('quality_assessments')
        .select('supplier_name, moisture, outturn, group1_defects, suggested_price, final_price, status');
      if (error) throw error;

      const supplierMap = new Map<string, { count: number; moisture: number[]; outturn: number[]; defects: number[]; prices: number[]; rejected: number }>();
      assessments?.forEach((a: any) => {
        const key = a.supplier_name || 'Unknown';
        const existing = supplierMap.get(key) || { count: 0, moisture: [], outturn: [], defects: [], prices: [], rejected: 0 };
        existing.count += 1;
        if (a.moisture) existing.moisture.push(a.moisture);
        if (a.outturn) existing.outturn.push(a.outturn);
        if (a.group1_defects) existing.defects.push(a.group1_defects);
        const price = a.final_price || a.suggested_price;
        if (price) existing.prices.push(price);
        if (a.status === 'rejected') existing.rejected += 1;
        supplierMap.set(key, existing);
      });

      const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : '—';

      return Array.from(supplierMap.entries()).map(([name, d]) => ({
        name, count: d.count,
        avgMoisture: avg(d.moisture),
        avgOutturn: avg(d.outturn),
        avgDefects: avg(d.defects),
        avgPrice: d.prices.length > 0 ? Math.round(d.prices.reduce((s, v) => s + v, 0) / d.prices.length) : 0,
        rejected: d.rejected,
        rejectionRate: d.count > 0 ? ((d.rejected / d.count) * 100).toFixed(0) : '0',
      })).sort((a, b) => b.count - a.count);
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Supplier Quality & Pricing Analysis</h3>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Supplier</TableHead><TableHead>Lots</TableHead><TableHead>Avg Moisture</TableHead><TableHead>Avg Outturn</TableHead><TableHead>Avg Defects</TableHead><TableHead>Avg Price</TableHead><TableHead>Rejection</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data?.map(s => (
              <TableRow key={s.name}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.count}</TableCell>
                <TableCell>{s.avgMoisture}%</TableCell>
                <TableCell>{s.avgOutturn}%</TableCell>
                <TableCell>{s.avgDefects}%</TableCell>
                <TableCell>UGX {s.avgPrice.toLocaleString()}</TableCell>
                <TableCell><Badge variant={Number(s.rejectionRate) > 10 ? 'destructive' : 'secondary'}>{s.rejectionRate}%</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default SupplierAnalysisTab;
