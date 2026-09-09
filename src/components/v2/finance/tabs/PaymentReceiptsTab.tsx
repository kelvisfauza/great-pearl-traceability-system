import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Printer, Receipt, Search, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { printGrnPaymentReceipt, printGrnPaymentReceipts, GrnReceiptData } from "@/utils/grnPaymentReceipt";

interface ReleasedPayment {
  id: string;
  amount_paid_ugx: number;
  gross_payable_ugx: number;
  method: string;
  payment_date: string;
  created_at: string;
  notes: string | null;
  approved_by: string | null;
  requested_by: string | null;
  lot_id: string | null;
  batch_number: string;
  supplier_name: string;
  coffee_type: string;
  quantity_kg: number;
  unit_price_ugx: number;
  lot_value: number;
}

const MAX_BULK = 25;
const PAID_STATUSES = ["PAID", "POSTED", "COMPLETED", "SUCCESS", "paid", "posted", "completed", "success"];

const receiptNoFor = (p: ReleasedPayment) =>
  `RCP-${String(p.batch_number || p.id).replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}`;

const isSameLocalDay = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
  );
};

const PaymentReceiptsTab = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const qc = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["finance-released-payments"],
    queryFn: async () => {
      const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
      const { data: rows, error } = await supabase
        .from("supplier_payments")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const paid = (rows || []).filter((p: any) => PAID_STATUSES.includes(String(p.status)));
      const lotIds = [...new Set(paid.map((p: any) => p.lot_id).filter(Boolean))] as string[];

      const lotMap = new Map<string, any>();
      for (let i = 0; i < lotIds.length; i += 300) {
        const { data: lots } = await supabase
          .from("finance_coffee_lots")
          .select("id, batch_number, coffee_record_id, quantity_kg, unit_price_ugx, total_amount_ugx")
          .in("id", lotIds.slice(i, i + 300));
        lots?.forEach((l: any) => lotMap.set(l.id, l));
      }

      const recordIds = [...new Set([...lotMap.values()].map((l) => l.coffee_record_id).filter(Boolean))] as string[];
      const recMap = new Map<string, any>();
      for (let i = 0; i < recordIds.length; i += 300) {
        const { data: recs } = await supabase
          .from("coffee_records")
          .select("id, supplier_name, coffee_type, batch_number")
          .in("id", recordIds.slice(i, i + 300));
        recs?.forEach((r: any) => recMap.set(r.id, r));
      }

      return paid.map((p: any) => {
        const lot = p.lot_id ? lotMap.get(p.lot_id) : null;
        const rec = lot?.coffee_record_id ? recMap.get(lot.coffee_record_id) : null;
        return {
          id: p.id,
          amount_paid_ugx: Number(p.amount_paid_ugx) || 0,
          gross_payable_ugx: Number(p.gross_payable_ugx) || 0,
          method: String(p.method || "CASH"),
          payment_date: p.payment_date || p.created_at,
          created_at: p.created_at,
          notes: p.notes,
          approved_by: p.approved_by,
          requested_by: p.requested_by,
          lot_id: p.lot_id,
          batch_number: lot?.batch_number || rec?.batch_number || p.reference || "—",
          supplier_name: rec?.supplier_name || "Unknown Supplier",
          coffee_type: rec?.coffee_type || "N/A",
          quantity_kg: Number(lot?.quantity_kg) || 0,
          unit_price_ugx: Number(lot?.unit_price_ugx) || 0,
          lot_value: Number(lot?.total_amount_ugx) || Number(p.gross_payable_ugx) || 0,
        } as ReleasedPayment;
      });
    },
  });

  const { data: printRows } = useQuery({
    queryKey: ["payment-receipt-prints"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_receipt_prints")
        .select("payment_id, printed_by_email, print_count, last_printed_at");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const printMap = useMemo(() => {
    const m = new Map<string, any>();
    (printRows || []).forEach((r) => m.set(r.payment_id, r));
    return m;
  }, [printRows]);

  const toReceipt = (p: ReleasedPayment, printedBy: string | null): GrnReceiptData => ({
    grnNumber: p.batch_number,
    supplierName: p.supplier_name,
    coffeeType: p.coffee_type,
    quantityKg: p.quantity_kg,
    unitPrice: p.unit_price_ugx,
    amount: p.amount_paid_ugx,
    lotValue: p.lot_value,
    method: p.method,
    paidAt: p.payment_date,
    paidBy: p.approved_by || p.requested_by || "Finance",
    inputBy: p.requested_by,
    printedBy,
    notes: p.notes,
    receiptNo: receiptNoFor(p),
    approvedBy: p.approved_by,
    approvedByEmail: p.approved_by,
  });

  const recordPrints = async (items: ReleasedPayment[]) => {
    const { data: auth } = await supabase.auth.getUser();
    const email = auth?.user?.email?.toLowerCase() || null;
    const nowIso = new Date().toISOString();
    const { error } = await (supabase as any).from("payment_receipt_prints").upsert(
      items.map((p) => ({
        payment_id: p.id,
        receipt_no: receiptNoFor(p),
        batch_number: p.batch_number,
        printed_by_email: email,
        print_count: (printMap.get(p.id)?.print_count || 0) + 1,
        last_printed_at: nowIso,
      })),
      { onConflict: "payment_id" }
    );
    if (error) {
      console.error("Failed to record receipt print", error);
      toast.error("Printed, but could not mark these receipts as printed");
    }
    qc.invalidateQueries({ queryKey: ["payment-receipt-prints"] });
    return email;
  };

  const doPrint = async (items: ReleasedPayment[]) => {
    if (!items.length) return;
    const batch = items.slice(0, MAX_BULK);
    setPrinting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const email = auth?.user?.email?.toLowerCase() || null;
      if (batch.length === 1) printGrnPaymentReceipt(toReceipt(batch[0], email));
      else printGrnPaymentReceipts(batch.map((p) => toReceipt(p, email)));
      await recordPrints(batch);
      setSelected(new Set());
      toast.success(`${batch.length} receipt(s) sent to the printer`);
    } catch (e: any) {
      toast.error("Print failed: " + (e?.message || "Unknown error"));
    } finally {
      setPrinting(false);
    }
  };

  const all = payments || [];
  const filtered = all.filter(
    (p) =>
      !search ||
      p.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      p.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      receiptNoFor(p).toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date();
  const todayUnprinted = all.filter((p) => isSameLocalDay(p.payment_date, today) && !printMap.has(p.id));
  const unprintedCount = all.filter((p) => !printMap.has(p.id)).length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size >= MAX_BULK) {
        toast.warning(`You can print up to ${MAX_BULK} receipts at a time`);
        return prev;
      } else next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size > 0) return setSelected(new Set());
    const pick = filtered.filter((p) => !printMap.has(p.id)).slice(0, MAX_BULK);
    if (!pick.length) return toast.info("Every receipt here has already been printed");
    setSelected(new Set(pick.map((p) => p.id)));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Released Payments</p>
              <p className="text-2xl font-bold">{all.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Printer className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Receipts Not Yet Printed</p>
              <p className="text-2xl font-bold">{unprintedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Paid Today</p>
              <p className="text-2xl font-bold">
                UGX{" "}
                {all
                  .filter((p) => isSameLocalDay(p.payment_date, today))
                  .reduce((s, p) => s + p.amount_paid_ugx, 0)
                  .toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Receipts ({filtered.length})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="gap-1"
                disabled={printing || todayUnprinted.length === 0}
                onClick={() => doPrint(todayUnprinted)}
              >
                {printing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                Print today's receipts ({todayUnprinted.length})
              </Button>
              {selected.size > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  disabled={printing}
                  onClick={() => doPrint(filtered.filter((p) => selected.has(p.id)))}
                >
                  <Printer className="h-3 w-3" /> Print selected ({selected.size})
                </Button>
              )}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search supplier, batch, receipt..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="w-full text-xs [&_th]:px-2 [&_td]:px-2 [&_th]:py-2 [&_td]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox checked={selected.size > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Receipt / Batch</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Print status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const printed = printMap.get(p.id);
                  return (
                    <TableRow key={p.id} className={selected.has(p.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(p.id)}
                          disabled={!!printed}
                          onCheckedChange={() => toggle(p.id)}
                          title={printed ? "Already printed — use Reprint" : undefined}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-[11px] leading-tight">
                        <span className="block">{receiptNoFor(p)}</span>
                        <span className="block text-muted-foreground">{p.batch_number}</span>
                      </TableCell>
                      <TableCell className="font-medium max-w-[140px] truncate" title={p.supplier_name}>
                        {p.supplier_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {p.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {p.amount_paid_ugx.toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(p.payment_date).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-[11px] leading-tight">
                        {printed ? (
                          <span className="text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Printed {new Date(printed.last_printed_at).toLocaleDateString("en-GB")}
                            {printed.printed_by_email ? (
                              <span className="text-muted-foreground">
                                · {String(printed.printed_by_email).split("@")[0]}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Not printed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={printed ? "outline" : "default"} className="gap-1" onClick={() => doPrint([p])}>
                          <Printer className="h-3 w-3" />
                          {printed ? "Reprint" : "Print"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No released payments yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentReceiptsTab;
