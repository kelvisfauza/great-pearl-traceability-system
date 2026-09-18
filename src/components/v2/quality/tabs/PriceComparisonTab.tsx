import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, TrendingDown, TrendingUp, Scale } from "lucide-react";
import { format, subDays } from "date-fns";

interface Row {
  id: string;
  batch_number: string;
  date_assessed: string;
  coffee_type: string;
  supplier_name: string;
  kilograms: number;
  calculator_price: number | null;
  paid_price: number | null;
  variance: number | null;
  variancePct: number | null;
  valueImpact: number | null;
  status: string;
}

const ugx = (n: number | null | undefined) =>
  n == null ? "—" : `UGX ${Math.round(n).toLocaleString("en-UG")}`;

const PriceComparisonTab = () => {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery({
    queryKey: ["quality-price-comparison", from, to],
    queryFn: async () => {
      const { data: assessments, error } = await supabase
        .from("quality_assessments")
        .select("*")
        .gte("date_assessed", from)
        .lte("date_assessed", to)
        .order("date_assessed", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const recordIds = (assessments || [])
        .map((a: any) => a.store_record_id)
        .filter(Boolean);
      const recordMap = new Map<string, any>();
      if (recordIds.length) {
        for (let i = 0; i < recordIds.length; i += 200) {
          const { data: records } = await supabase
            .from("coffee_records")
            .select("id, supplier_name, coffee_type, kilograms")
            .in("id", recordIds.slice(i, i + 200));
          (records || []).forEach((r: any) => recordMap.set(r.id, r));
        }
      }

      const rows: Row[] = (assessments || []).map((a: any) => {
        const rec = a.store_record_id ? recordMap.get(a.store_record_id) : null;
        const calc = a.calculator_price != null ? Number(a.calculator_price) : null;
        const paid = a.final_price != null ? Number(a.final_price) : null;
        const variance = calc != null && paid != null ? paid - calc : null;
        return {
          id: a.id,
          batch_number: a.batch_number,
          date_assessed: a.date_assessed,
          coffee_type: rec?.coffee_type || "—",
          supplier_name: rec?.supplier_name || "—",
          kilograms: Number(rec?.kilograms || 0),
          calculator_price: calc,
          paid_price: paid,
          variance,
          variancePct: variance != null && calc ? (variance / calc) * 100 : null,
          valueImpact: variance != null ? variance * Number(rec?.kilograms || 0) : null,
          status: a.status,
        };
      });
      return rows;
    },
  });

  const rows = data || [];
  const compared = useMemo(() => rows.filter((r) => r.variance != null), [rows]);

  const summary = useMemo(() => {
    const overpaid = compared.filter((r) => (r.variance || 0) > 0);
    const underpaid = compared.filter((r) => (r.variance || 0) < 0);
    const totalImpact = compared.reduce((s, r) => s + (r.valueImpact || 0), 0);
    const avgVariance = compared.length
      ? compared.reduce((s, r) => s + (r.variance || 0), 0) / compared.length
      : 0;
    return {
      compared: compared.length,
      missing: rows.length - compared.length,
      overpaid: overpaid.length,
      underpaid: underpaid.length,
      avgVariance,
      totalImpact,
    };
  }, [compared, rows.length]);

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" /> Calculator Price vs Paid Price
            </CardTitle>
            <CardDescription>
              Every assessment records the price the system calculated and the price finally paid.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="pc_from" className="text-xs">From</Label>
              <Input id="pc_from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pc_to" className="text-xs">To</Label>
              <Input id="pc_to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Lots compared</p>
            <p className="text-2xl font-bold">{summary.compared}</p>
            <p className="text-xs text-muted-foreground">{summary.missing} without both prices</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid above calculator</p>
            <p className="text-2xl font-bold text-destructive">{summary.overpaid}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid below calculator</p>
            <p className="text-2xl font-bold text-primary">{summary.underpaid}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Average difference /kg</p>
            <p className="text-2xl font-bold">{ugx(summary.avgVariance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total value impact</p>
            <p className={`text-2xl font-bold ${summary.totalImpact > 0 ? "text-destructive" : "text-primary"}`}>
              {ugx(summary.totalImpact)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lot by lot</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Calculator /kg</TableHead>
                <TableHead className="text-right">Paid /kg</TableHead>
                <TableHead className="text-right">Difference /kg</TableHead>
                <TableHead className="text-right">Value impact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No assessments in this period.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date_assessed ? format(new Date(r.date_assessed), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{r.batch_number}</TableCell>
                  <TableCell>{r.supplier_name}</TableCell>
                  <TableCell>{r.coffee_type}</TableCell>
                  <TableCell className="text-right">{r.kilograms ? r.kilograms.toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">{ugx(r.calculator_price)}</TableCell>
                  <TableCell className="text-right">{ugx(r.paid_price)}</TableCell>
                  <TableCell className="text-right">
                    {r.variance == null ? (
                      "—"
                    ) : (
                      <span className={`inline-flex items-center gap-1 ${r.variance > 0 ? "text-destructive" : r.variance < 0 ? "text-primary" : ""}`}>
                        {r.variance > 0 ? <TrendingUp className="h-3 w-3" /> : r.variance < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                        {ugx(r.variance)}
                        {r.variancePct != null && ` (${r.variancePct.toFixed(1)}%)`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{ugx(r.valueImpact)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceComparisonTab;
