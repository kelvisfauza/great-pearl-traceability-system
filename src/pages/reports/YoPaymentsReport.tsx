import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Filter, Download, RefreshCw, Smartphone } from "lucide-react";
import { format } from "date-fns";

interface YoRow {
  id: string;
  source: string;
  occurred_at: string;
  amount: number;
  phone: string | null;
  recipient_name: string | null;
  description: string | null;
  yo_reference: string | null;
  status: string;
  initiated_by: string | null;
  approved_by: string | null;
  metadata: Record<string, any> | null;
}

const SOURCES = [
  "Instant Withdrawal",
  "Withdrawal Request",
  "Admin Withdrawal",
  "Meal Disbursement",
  "Service Provider",
  "Milling MoMo",
  "USSD Advance",
  "Airtime Allowance",
  "Data Allowance",
];

const statusColor = (s: string) => {
  const v = s.toLowerCase();
  if (v.includes("success") || v.includes("complete") || v === "ok") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (v.includes("pending") || v.includes("approval") || v.includes("processing")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (v.includes("fail") || v.includes("error") || v.includes("rejected")) return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const sourceColor = (s: string) => {
  switch (s) {
    case "Instant Withdrawal": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Withdrawal Request": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Admin Withdrawal": return "bg-purple-50 text-purple-700 border-purple-200";
    case "Meal Disbursement": return "bg-orange-50 text-orange-700 border-orange-200";
    case "Service Provider": return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "Milling MoMo": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "USSD Advance": return "bg-pink-50 text-pink-700 border-pink-200";
    case "Airtime Allowance": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Data Allowance": return "bg-teal-50 text-teal-700 border-teal-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export default function YoPaymentsReport() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(format(firstOfMonth, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["yo-payments-audit", startDate, endDate, source, status],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_yo_payments_audit", {
        p_start_date: startDate ? new Date(startDate + "T00:00:00").toISOString() : null,
        p_end_date: endDate ? new Date(endDate + "T23:59:59").toISOString() : null,
        p_source: source === "all" ? null : source,
        p_status: status === "all" ? null : status,
      });
      if (error) throw error;
      return (data || []) as YoRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [] as YoRow[];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) =>
      [r.recipient_name, r.phone, r.yo_reference, r.description, r.initiated_by, r.approved_by]
        .some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const stats = useMemo(() => {
    const totalAmount = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
    const successCount = filtered.filter((r) => /success|complete|ok/i.test(r.status)).length;
    const failedCount = filtered.filter((r) => /fail|error|rejected/i.test(r.status)).length;
    const pendingCount = filtered.filter((r) => /pending|approval|processing/i.test(r.status)).length;
    return { totalAmount, successCount, failedCount, pendingCount, count: filtered.length };
  }, [filtered]);

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ["Date", "Source", "Recipient", "Phone", "Amount", "Description", "Status", "Yo Reference", "Initiated By", "Approved By"];
    const rows = filtered.map((r) => [
      format(new Date(r.occurred_at), "yyyy-MM-dd HH:mm"),
      r.source,
      r.recipient_name || "",
      r.phone || "",
      r.amount,
      (r.description || "").replace(/"/g, '""'),
      r.status,
      r.yo_reference || "",
      r.initiated_by || "",
      r.approved_by || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yo-payments-audit-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Yo Payments Audit Report" subtitle="Complete audit trail of all Yo Payments transactions">
      <div className="space-y-6">
        {/* Filters */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <Label>From</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">
                <Label>Search (name, phone, ref, description)</Label>
                <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold">Great Agro Coffee — Yo Payments Audit Report</h1>
          <p className="text-sm">Period: {startDate} to {endDate} • Generated: {format(new Date(), "yyyy-MM-dd HH:mm")}</p>
          <p className="text-sm">Source: {source === "all" ? "All" : source} • Status: {status === "all" ? "All" : status}</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold">{stats.count}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Amount (UGX)</p>
            <p className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.successCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pendingCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.failedCount}</p>
          </CardContent></Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Transactions ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Amount (UGX)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Yo Ref</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead>Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={`${r.source}-${r.id}`}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.occurred_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell><Badge variant="outline" className={sourceColor(r.source)}>{r.source}</Badge></TableCell>
                    <TableCell className="text-sm">{r.recipient_name || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.phone || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{Number(r.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs max-w-[240px] truncate" title={r.description || ""}>{r.description || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{r.yo_reference || "—"}</TableCell>
                    <TableCell className="text-xs">{r.initiated_by || "—"}</TableCell>
                    <TableCell className="text-xs">{r.approved_by || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}