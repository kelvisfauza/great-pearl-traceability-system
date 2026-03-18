import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const SupplierAnalyticsTab = () => {
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['supplier-analytics-records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coffee_records').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['supplier-analytics-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_assessments').select('*');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = recordsLoading || assessmentsLoading;

  // Compute supplier stats
  const supplierStats = (() => {
    if (!records || !assessments) return [];
    const map: Record<string, any> = {};
    
    records.forEach(r => {
      if (!map[r.supplier_name]) {
        map[r.supplier_name] = { supplier_name: r.supplier_name, total_kg: 0, total_lots: 0, rejected_lots: 0, moistures: [], outturns: [], defects: [] };
      }
      map[r.supplier_name].total_kg += r.kilograms || 0;
      map[r.supplier_name].total_lots += 1;
      if (r.status === 'QUALITY_REJECTED') map[r.supplier_name].rejected_lots += 1;
    });

    assessments.forEach(a => {
      // Find matching record
      const rec = records.find(r => r.batch_number === a.batch_number);
      if (rec && map[rec.supplier_name]) {
        const s = map[rec.supplier_name];
        if (a.moisture != null) s.moistures.push(a.moisture);
        if (a.outturn != null) s.outturns.push(a.outturn);
        const totalDef = (a.group1_defects || 0) + (a.group2_defects || 0) + (a.pods || 0) + (a.husks || 0) + (a.fm || 0);
        s.defects.push(totalDef);
      }
    });

    return Object.values(map).map((s: any) => {
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const avgMoisture = avg(s.moistures);
      const avgDefects = avg(s.defects);
      const rejectionRate = s.total_lots ? (s.rejected_lots / s.total_lots) * 100 : 0;
      const risk = avgMoisture > 14.5 || avgDefects > 7 || rejectionRate > 20 ? 'High' : avgMoisture > 13.5 || avgDefects > 5 || rejectionRate > 10 ? 'Medium' : 'Low';
      return {
        supplier_name: s.supplier_name,
        total_kg: s.total_kg,
        avg_moisture: parseFloat(avgMoisture.toFixed(1)),
        avg_outturn: parseFloat(avg(s.outturns).toFixed(1)),
        avg_defects: parseFloat(avgDefects.toFixed(1)),
        total_lots: s.total_lots,
        rejected_lots: s.rejected_lots,
        rejection_rate: parseFloat(rejectionRate.toFixed(1)),
        risk
      };
    }).sort((a, b) => b.total_kg - a.total_kg);
  })();

  const topSuppliers = [...supplierStats].sort((a, b) => a.avg_defects - b.avg_defects).slice(0, 5);
  const worstSuppliers = [...supplierStats].sort((a, b) => b.avg_defects - a.avg_defects).slice(0, 5);
  const riskSuppliers = supplierStats.filter(s => s.risk === 'High');

  const riskColor: Record<string, string> = { Low: 'bg-green-100 text-green-800', Medium: 'bg-yellow-100 text-yellow-800', High: 'bg-red-100 text-red-800' };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const chartData = supplierStats.slice(0, 10).map(s => ({ name: s.supplier_name.slice(0, 15), moisture: s.avg_moisture, defects: s.avg_defects, outturn: s.avg_outturn }));

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-sm text-muted-foreground">Top Suppliers</p><p className="text-2xl font-bold">{topSuppliers.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><TrendingDown className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-sm text-muted-foreground">At-Risk Suppliers</p><p className="text-2xl font-bold">{riskSuppliers.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><BarChart3 className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-sm text-muted-foreground">Total Suppliers</p><p className="text-2xl font-bold">{supplierStats.length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top 10 Suppliers – Quality Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="moisture" fill="hsl(var(--primary))" name="Avg Moisture %" />
                  <Bar dataKey="defects" fill="hsl(0 84% 60%)" name="Avg Defects %" />
                  <Bar dataKey="outturn" fill="hsl(142 76% 36%)" name="Avg Outturn %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Suppliers */}
      {riskSuppliers.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" />High-Risk Suppliers</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Avg Moisture</TableHead>
                    <TableHead>Avg Defects</TableHead>
                    <TableHead>Rejection Rate</TableHead>
                    <TableHead>Total kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskSuppliers.map(s => (
                    <TableRow key={s.supplier_name}>
                      <TableCell className="font-medium">{s.supplier_name}</TableCell>
                      <TableCell><Badge className={s.avg_moisture > 14.5 ? 'bg-red-100 text-red-800' : ''}>{s.avg_moisture}%</Badge></TableCell>
                      <TableCell><Badge className={s.avg_defects > 7 ? 'bg-red-100 text-red-800' : ''}>{s.avg_defects}%</Badge></TableCell>
                      <TableCell>{s.rejection_rate}%</TableCell>
                      <TableCell>{s.total_kg.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Supplier Table */}
      <Card>
        <CardHeader><CardTitle>All Supplier Quality Rankings</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total kg</TableHead>
                  <TableHead>Lots</TableHead>
                  <TableHead>Avg Moisture</TableHead>
                  <TableHead>Avg Outturn</TableHead>
                  <TableHead>Avg Defects</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierStats.map(s => (
                  <TableRow key={s.supplier_name}>
                    <TableCell className="font-medium">{s.supplier_name}</TableCell>
                    <TableCell>{s.total_kg.toLocaleString()}</TableCell>
                    <TableCell>{s.total_lots}</TableCell>
                    <TableCell>{s.avg_moisture}%</TableCell>
                    <TableCell>{s.avg_outturn}%</TableCell>
                    <TableCell>{s.avg_defects}%</TableCell>
                    <TableCell>{s.rejected_lots} ({s.rejection_rate}%)</TableCell>
                    <TableCell><Badge className={riskColor[s.risk]}>{s.risk}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierAnalyticsTab;
