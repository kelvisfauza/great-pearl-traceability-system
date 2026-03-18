import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3 } from "lucide-react";

const SourcingTrendsTab = () => {
  const { data: purchases, isLoading } = useQuery({
    queryKey: ['field-sourcing-trends'],
    queryFn: async () => {
      const { data, error } = await supabase.from('field_purchases').select('district, village, kgs_purchased, farmer_name');
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Group by district/village
  const districtMap = new Map<string, { totalKg: number; farmers: Set<string>; count: number }>();
  purchases?.forEach((p: any) => {
    const key = p.district || 'Unknown';
    const existing = districtMap.get(key) || { totalKg: 0, farmers: new Set<string>(), count: 0 };
    existing.totalKg += p.kgs_purchased || 0;
    if (p.farmer_name) existing.farmers.add(p.farmer_name);
    existing.count += 1;
    districtMap.set(key, existing);
  });

  const districts = Array.from(districtMap.entries())
    .map(([name, data]) => ({ name, totalKg: data.totalKg, farmersCount: data.farmers.size, purchases: data.count }))
    .sort((a, b) => b.totalKg - a.totalKg);

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Sourcing Trends by District</h3>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>District</TableHead><TableHead>Purchases</TableHead><TableHead>Farmers</TableHead><TableHead>Total Kg</TableHead><TableHead>Avg per Purchase</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {districts.map(d => (
                <TableRow key={d.name}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.purchases}</TableCell>
                  <TableCell>{d.farmersCount}</TableCell>
                  <TableCell className="font-bold">{d.totalKg.toLocaleString()}</TableCell>
                  <TableCell>{d.purchases > 0 ? Math.round(d.totalKg / d.purchases).toLocaleString() : 0} kg</TableCell>
                </TableRow>
              ))}
              {districts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No field purchase data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcingTrendsTab;
