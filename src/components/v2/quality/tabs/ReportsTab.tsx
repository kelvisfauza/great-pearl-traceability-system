import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Printer, Search } from "lucide-react";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";

const ReportsTab = () => {
  const [reportType, setReportType] = useState("daily");
  const printRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const runHistoricalSearch = async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setSearching(true);
    setSearchQuery(term);
    try {
      // Search assessments directly by batch_number (no date/row cap)
      const { data: byBatch } = await supabase
        .from('quality_assessments')
        .select('*')
        .ilike('batch_number', `%${term}%`)
        .order('created_at', { ascending: false })
        .limit(500);

      // Also find matching coffee records by supplier_name or batch
      const { data: matchingRecords } = await supabase
        .from('coffee_records')
        .select('id, batch_number, supplier_name, supplier_id, coffee_type, kilograms')
        .or(`batch_number.ilike.%${term}%,supplier_name.ilike.%${term}%`)
        .limit(500);

      const recordIds = (matchingRecords || []).map(r => r.id);
      let bySupplier: any[] = [];
      if (recordIds.length > 0) {
        const { data } = await supabase
          .from('quality_assessments')
          .select('*')
          .in('store_record_id', recordIds)
          .order('created_at', { ascending: false })
          .limit(500);
        bySupplier = data || [];
      }

      // Merge + dedupe by id, enrich with supplier info
      const recMap = new Map((matchingRecords || []).map(r => [r.id, r]));
      const merged = new Map<string, any>();
      [...(byBatch || []), ...bySupplier].forEach(a => {
        const rec = recMap.get(a.store_record_id);
        merged.set(a.id, {
          ...a,
          supplier_name: rec?.supplier_name || '—',
          coffee_type: rec?.coffee_type || '—',
          kilograms: rec?.kilograms || 0,
        });
      });
      setSearchResults(Array.from(merged.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (e) {
      console.error('Historical search failed:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['reports-assessments'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('quality_assessments')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    }
  });

  const { data: records } = useQuery({
    queryKey: ['reports-records'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_records')
        .select('id, batch_number, supplier_name, kilograms, status, created_at, date, coffee_type')
        .order('created_at', { ascending: false })
        .limit(1000);
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> Search Historical Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Find any quality assessment regardless of age. Search by batch number or supplier name.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. BATCH-2023-045 or supplier name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runHistoricalSearch(); }}
            />
            <Button onClick={runHistoricalSearch} disabled={searching || !searchTerm.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Search</span>
            </Button>
          </div>

          {searchResults !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  <span className="font-medium">{searchResults.length}</span> result{searchResults.length === 1 ? '' : 's'} for "{searchQuery}"
                </p>
                {searchResults.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => { setSearchResults(null); setSearchTerm(''); }}>
                    Clear
                  </Button>
                )}
              </div>
              {searchResults.length > 0 ? (
                <div className="rounded-md border overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Moisture</TableHead>
                        <TableHead>Outturn</TableHead>
                        <TableHead>Final Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">{a.date_assessed || format(new Date(a.created_at), 'PP')}</TableCell>
                          <TableCell className="font-mono text-xs">{a.batch_number}</TableCell>
                          <TableCell className="text-sm">{a.supplier_name}</TableCell>
                          <TableCell>{a.moisture}%</TableCell>
                          <TableCell>{a.outturn}%</TableCell>
                          <TableCell>{a.final_price?.toLocaleString() || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No historical assessments matched.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
