import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Printer } from "lucide-react";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";

const ReportsTab = () => {
  const [reportType, setReportType] = useState("daily");
  const printRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['reports-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_assessments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: records } = useQuery({
    queryKey: ['reports-records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coffee_records').select('*');
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const todayAssessments = assessments?.filter(a => a.date_assessed === today) || [];
  const weekAssessments = assessments?.filter(a => a.date_assessed && a.date_assessed >= weekStart && a.date_assessed <= weekEnd) || [];
  const rejectedRecords = records?.filter(r => r.status === 'QUALITY_REJECTED') || [];

  const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '0';

  const dailyStats = {
    totalKg: todayAssessments.reduce((sum, a) => sum + (records?.find(r => r.batch_number === a.batch_number)?.kilograms || 0), 0),
    avgMoisture: avg(todayAssessments.map(a => a.moisture || 0)),
    avgDefects: avg(todayAssessments.map(a => (a.group1_defects || 0) + (a.group2_defects || 0) + (a.pods || 0) + (a.husks || 0) + (a.fm || 0))),
    rejections: todayAssessments.filter(a => a.status === 'rejected').length,
    count: todayAssessments.length,
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>Quality Report</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body>${printRef.current.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Quality Reports</h3>
        <Button variant="outline" onClick={handlePrint}><Printer className="mr-1 h-4 w-4" />Print Report</Button>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
          <TabsTrigger value="rejected">Rejected Coffee</TabsTrigger>
        </TabsList>

        <div ref={printRef}>
          <TabsContent value="daily">
            <Card>
              <CardHeader><CardTitle>Daily Quality Report — {format(new Date(), 'PPP')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Batches Assessed</p><p className="text-2xl font-bold">{dailyStats.count}</p></div>
                  <div className="p-3 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Total kg</p><p className="text-2xl font-bold">{dailyStats.totalKg.toLocaleString()}</p></div>
                  <div className="p-3 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Avg Moisture</p><p className="text-2xl font-bold">{dailyStats.avgMoisture}%</p></div>
                  <div className="p-3 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Rejections</p><p className="text-2xl font-bold">{dailyStats.rejections}</p></div>
                </div>
                {todayAssessments.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Batch #</TableHead><TableHead>Moisture</TableHead><TableHead>Outturn</TableHead><TableHead>Defects</TableHead><TableHead>Status</TableHead><TableHead>Assessed By</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {todayAssessments.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono">{a.batch_number}</TableCell>
                            <TableCell>{a.moisture}%</TableCell>
                            <TableCell>{a.outturn}%</TableCell>
                            <TableCell>{((a.group1_defects || 0) + (a.group2_defects || 0)).toFixed(1)}%</TableCell>
                            <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                            <TableCell className="text-sm">{a.assessed_by}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : <p className="text-center text-muted-foreground py-4">No assessments today</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            <Card>
              <CardHeader><CardTitle>Weekly Report — {format(new Date(weekStart), 'PP')} to {format(new Date(weekEnd), 'PP')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Total Assessments</p><p className="text-2xl font-bold">{weekAssessments.length}</p></div>
                  <div className="p-3 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Avg Moisture</p><p className="text-2xl font-bold">{avg(weekAssessments.map(a => a.moisture || 0))}%</p></div>
                  <div className="p-3 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Avg Outturn</p><p className="text-2xl font-bold">{avg(weekAssessments.map(a => a.outturn || 0))}%</p></div>
                </div>
                {weekAssessments.length > 0 && (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Batch #</TableHead><TableHead>Moisture</TableHead><TableHead>Outturn</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {weekAssessments.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="text-sm">{a.date_assessed}</TableCell>
                            <TableCell className="font-mono">{a.batch_number}</TableCell>
                            <TableCell>{a.moisture}%</TableCell>
                            <TableCell>{a.outturn}%</TableCell>
                            <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card>
              <CardHeader><CardTitle>Rejected Coffee Report</CardTitle></CardHeader>
              <CardContent>
                {rejectedRecords.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Batch #</TableHead><TableHead>Supplier</TableHead><TableHead>Type</TableHead><TableHead>Weight</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {rejectedRecords.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">{format(new Date(r.date), 'PP')}</TableCell>
                            <TableCell className="font-mono">{r.batch_number}</TableCell>
                            <TableCell>{r.supplier_name}</TableCell>
                            <TableCell>{r.coffee_type}</TableCell>
                            <TableCell>{r.kilograms?.toLocaleString()} kg</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : <p className="text-center text-muted-foreground py-4">No rejected coffee</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ReportsTab;
