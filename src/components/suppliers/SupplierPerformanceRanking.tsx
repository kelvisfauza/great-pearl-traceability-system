import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Printer, Filter, TrendingUp, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useReactToPrint } from 'react-to-print';
import { getStandardPrintStyles } from '@/utils/printStyles';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';

interface RankRow {
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  origin?: string;
  totalKg: number;
  totalBags: number;
  deliveries: number;
  totalPaid: number;
  pendingCount: number;
  lastDelivery?: string;
  avgKgPerDelivery: number;
  score: number;
}

const COFFEE_TYPES = ['all', 'arabica', 'robusta', 'drugar'];
const SORT_OPTIONS = [
  { value: 'totalKg', label: 'Total Kilograms' },
  { value: 'deliveries', label: 'Number of Deliveries' },
  { value: 'totalPaid', label: 'Total Payments (UGX)' },
  { value: 'avgKgPerDelivery', label: 'Avg Kg / Delivery' },
  { value: 'lastDelivery', label: 'Most Recent Delivery' },
];

const SupplierPerformanceRanking = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [coffeeType, setCoffeeType] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('totalKg');
  const [topN, setTopN] = useState('all');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: records }, { data: suppliersData }, { data: payments }] = await Promise.all([
        supabase.from('coffee_records').select('id, supplier_id, supplier_name, coffee_type, kilograms, bags, date, status').not('supplier_id', 'is', null),
        supabase.from('suppliers').select('id, code, name, origin'),
        supabase.from('supplier_payments').select('supplier_id, amount_paid_ugx, status'),
      ]);

      const supplierMap = new Map<string, any>();
      (suppliersData || []).forEach((s: any) => supplierMap.set(s.id, s));

      const paymentBySupplier = new Map<string, { paid: number; pending: number }>();
      (payments || []).forEach((p: any) => {
        if (!p.supplier_id) return;
        const cur = paymentBySupplier.get(p.supplier_id) || { paid: 0, pending: 0 };
        cur.paid += Number(p.amount_paid_ugx || 0);
        if (p.status === 'PENDING' || p.status === 'pending') cur.pending += 1;
        paymentBySupplier.set(p.supplier_id, cur);
      });

      const agg = new Map<string, RankRow>();
      (records || []).forEach((r: any) => {
        const sid = r.supplier_id;
        const s = supplierMap.get(sid);
        const cur = agg.get(sid) || {
          supplier_id: sid,
          supplier_name: s?.name || r.supplier_name || 'Unknown',
          supplier_code: s?.code,
          origin: s?.origin,
          totalKg: 0,
          totalBags: 0,
          deliveries: 0,
          totalPaid: 0,
          pendingCount: 0,
          lastDelivery: undefined,
          avgKgPerDelivery: 0,
          score: 0,
        };
        (cur as any)._records = ((cur as any)._records || []).concat([r]);
        agg.set(sid, cur);
      });

      const result: RankRow[] = [];
      agg.forEach((row) => {
        const recs: any[] = (row as any)._records || [];
        delete (row as any)._records;
        // apply filters
        const filtered = recs.filter((r) => {
          if (dateFrom && r.date < dateFrom) return false;
          if (dateTo && r.date > dateTo) return false;
          if (coffeeType !== 'all' && !(r.coffee_type || '').toLowerCase().includes(coffeeType)) return false;
          return true;
        });
        if (filtered.length === 0) return;
        row.totalKg = filtered.reduce((s, r) => s + Number(r.kilograms || 0), 0);
        row.totalBags = filtered.reduce((s, r) => s + Number(r.bags || 0), 0);
        row.deliveries = filtered.length;
        row.avgKgPerDelivery = row.deliveries ? Math.round(row.totalKg / row.deliveries) : 0;
        row.lastDelivery = filtered.map((r) => r.date).sort().slice(-1)[0];
        const pay = paymentBySupplier.get(row.supplier_id);
        row.totalPaid = pay?.paid || 0;
        row.pendingCount = pay?.pending || 0;
        result.push(row);
      });

      // Composite score: weighted normalized
      const maxKg = Math.max(1, ...result.map((r) => r.totalKg));
      const maxDel = Math.max(1, ...result.map((r) => r.deliveries));
      const maxPaid = Math.max(1, ...result.map((r) => r.totalPaid));
      result.forEach((r) => {
        r.score = Math.round(
          (r.totalKg / maxKg) * 50 + (r.deliveries / maxDel) * 30 + (r.totalPaid / maxPaid) * 20
        );
      });

      setRows(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, coffeeType]);

  const ranked = useMemo(() => {
    const filtered = rows.filter((r) =>
      !search ||
      r.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.supplier_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.origin || '').toLowerCase().includes(search.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'lastDelivery') {
        return (b.lastDelivery || '').localeCompare(a.lastDelivery || '');
      }
      return (b as any)[sortBy] - (a as any)[sortBy];
    });
    return topN === 'all' ? sorted : sorted.slice(0, parseInt(topN));
  }, [rows, search, sortBy, topN]);

  const totals = useMemo(() => ({
    suppliers: ranked.length,
    totalKg: ranked.reduce((s, r) => s + r.totalKg, 0),
    totalBags: ranked.reduce((s, r) => s + r.totalBags, 0),
    totalPaid: ranked.reduce((s, r) => s + r.totalPaid, 0),
    totalDeliveries: ranked.reduce((s, r) => s + r.deliveries, 0),
  }), [ranked]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Supplier_Ranking_${new Date().toISOString().split('T')[0]}`,
  });

  const medal = (rank: number) => {
    if (rank === 1) return <Medal className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />;
    return null;
  };

  const dateRangeText = dateFrom || dateTo ? `${dateFrom || 'Start'} → ${dateTo || 'Today'}` : 'All time';

  return (
    <div className="space-y-4">
      <style>{getStandardPrintStyles()}</style>

      {/* Hidden print area */}
      <div className="hidden print:block" ref={printRef}>
        <StandardPrintHeader
          title="SUPPLIER PERFORMANCE RANKING"
          subtitle={`${dateRangeText} • ${coffeeType === 'all' ? 'All coffee types' : coffeeType.toUpperCase()} • Ranked by ${SORT_OPTIONS.find(o => o.value === sortBy)?.label}`}
          includeDate
        />
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead className="text-right">Deliveries</TableHead>
                <TableHead className="text-right">Total Kg</TableHead>
                <TableHead className="text-right">Bags</TableHead>
                <TableHead className="text-right">Avg Kg/Del</TableHead>
                <TableHead className="text-right">Total Paid (UGX)</TableHead>
                <TableHead>Last Delivery</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((r, i) => (
                <TableRow key={r.supplier_id}>
                  <TableCell className="font-bold">#{i + 1}</TableCell>
                  <TableCell>{r.supplier_code || '—'}</TableCell>
                  <TableCell>{r.supplier_name}</TableCell>
                  <TableCell>{r.origin || '—'}</TableCell>
                  <TableCell className="text-right">{r.deliveries}</TableCell>
                  <TableCell className="text-right">{r.totalKg.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.totalBags.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.avgKgPerDelivery.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.totalPaid.toLocaleString()}</TableCell>
                  <TableCell>{r.lastDelivery || '—'}</TableCell>
                  <TableCell className="text-right font-semibold">{r.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-sm">
            <p><strong>Suppliers Ranked:</strong> {totals.suppliers} • <strong>Total Deliveries:</strong> {totals.totalDeliveries} • <strong>Total Kg:</strong> {totals.totalKg.toLocaleString()} • <strong>Total Paid:</strong> UGX {totals.totalPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Supplier Performance Ranking
              </CardTitle>
              <CardDescription>Rank suppliers by volume, deliveries, payments and a composite performance score</CardDescription>
            </div>
            <Button onClick={handlePrint} disabled={ranked.length === 0}>
              <Printer className="h-4 w-4 mr-2" /> Print Ranking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Coffee Type</Label>
              <Select value={coffeeType} onValueChange={setCoffeeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COFFEE_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rank By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Show Top</Label>
              <Select value={topN} onValueChange={setTopN}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="25">Top 25</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <Input placeholder="Name, code, origin..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {(dateFrom || dateTo || coffeeType !== 'all' || search || sortBy !== 'totalKg' || topN !== 'all') && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setDateFrom(''); setDateTo(''); setCoffeeType('all'); setSearch(''); setSortBy('totalKg'); setTopN('all'); }}>
              <Filter className="h-3 w-3 mr-1" /> Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">{totals.suppliers}</p><p className="text-xs text-muted-foreground">Suppliers</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">{totals.totalDeliveries}</p><p className="text-xs text-muted-foreground">Deliveries</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">{totals.totalKg.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Kg</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">{totals.totalBags.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Bags</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">UGX {(totals.totalPaid / 1_000_000).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Total Paid</p></CardContent></Card>
      </div>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" /> Ranked Suppliers ({ranked.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground mt-2">Loading rankings...</p>
            </div>
          ) : ranked.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No data for selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead className="text-right">Deliveries</TableHead>
                    <TableHead className="text-right">Total Kg</TableHead>
                    <TableHead className="text-right">Bags</TableHead>
                    <TableHead className="text-right">Avg Kg/Del</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead>Last Delivery</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((r, i) => (
                    <TableRow key={r.supplier_id}>
                      <TableCell className="font-bold flex items-center gap-1">{medal(i + 1)} #{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{r.supplier_code || '—'}</TableCell>
                      <TableCell className="font-medium">{r.supplier_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.origin || '—'}</TableCell>
                      <TableCell className="text-right">{r.deliveries}</TableCell>
                      <TableCell className="text-right font-semibold">{r.totalKg.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{r.totalBags.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{r.avgKgPerDelivery.toLocaleString()}</TableCell>
                      <TableCell className="text-right">UGX {r.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{r.lastDelivery || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={i < 3 ? 'default' : 'secondary'} className="font-bold">
                          <TrendingUp className="h-3 w-3 mr-1" />{r.score}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPerformanceRanking;