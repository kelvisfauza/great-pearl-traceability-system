import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, CreditCard, CheckCircle2, DollarSign, Coffee, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FinanceLot {
  id: string;
  batch_number: string | null;
  coffee_record_id: string | null;
  supplier_id: string | null;
  unit_price_ugx: number;
  quantity_kg: number;
  total_amount_ugx: number;
  finance_status: string;
  created_at: string;
  assessed_by: string | null;
  quality_json: any;
  supplier_name?: string;
  coffee_type?: string;
}

const PendingPaymentsTab = () => {
  const [search, setSearch] = useState("");
  const [payDialog, setPayDialog] = useState<FinanceLot | null>(null);
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: lots, isLoading } = useQuery({
    queryKey: ["finance-pending-payments"],
    queryFn: async () => {
      // Fetch all READY_FOR_FINANCE lots (handle >1000 rows)
      let allLots: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page, error } = await supabase
          .from("finance_coffee_lots")
          .select("*")
          .eq("finance_status", "READY_FOR_FINANCE")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allLots = allLots.concat(page || []);
        if (!page || page.length < pageSize) break;
        from += pageSize;
      }

      // Get coffee record details for supplier/type info
      const coffeeRecordIds = [...new Set(allLots.map((l: any) => l.coffee_record_id).filter(Boolean))];
      let supplierMap = new Map<string, { supplier_name: string; coffee_type: string; batch_number: string }>();

      // Fetch in chunks of 500
      for (let i = 0; i < coffeeRecordIds.length; i += 500) {
        const chunk = coffeeRecordIds.slice(i, i + 500);
        const { data: records } = await supabase
          .from("coffee_records")
          .select("id, supplier_name, coffee_type, batch_number")
          .in("id", chunk);
        records?.forEach((r: any) => {
          supplierMap.set(r.id, {
            supplier_name: r.supplier_name,
            coffee_type: r.coffee_type,
            batch_number: r.batch_number,
          });
        });
      }

      // Get supplier names
      const supplierIds = [...new Set(allLots.map((l: any) => l.supplier_id).filter(Boolean))];
      let supplierNameMap = new Map<string, string>();
      for (let i = 0; i < supplierIds.length; i += 500) {
        const chunk = supplierIds.slice(i, i + 500);
        const { data: suppliers } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", chunk);
        suppliers?.forEach((s: any) => supplierNameMap.set(s.id, s.name));
      }

      return allLots.map((lot: any) => {
        const record = supplierMap.get(lot.coffee_record_id);
        return {
          ...lot,
          supplier_name:
            supplierNameMap.get(lot.supplier_id) ||
            record?.supplier_name ||
            "Unknown Supplier",
          coffee_type: record?.coffee_type || "N/A",
          batch_number: lot.batch_number || record?.batch_number || lot.coffee_record_id,
        };
      }) as FinanceLot[];
    },
  });

  const handlePay = async () => {
    if (!payDialog) return;
    setProcessing(true);

    try {
      // 1. Update finance_coffee_lots status to PAID
      const { error: updateError } = await supabase
        .from("finance_coffee_lots")
        .update({
          finance_status: "PAID" as any,
          finance_notes: payNotes || `Paid via ${payMethod}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payDialog.id);

      if (updateError) throw updateError;

      // 2. Create supplier_payments record
      const { error: paymentError } = await supabase
        .from("supplier_payments")
        .insert({
          supplier_id: payDialog.supplier_id,
          lot_id: payDialog.id,
          amount_paid_ugx: payDialog.total_amount_ugx,
          gross_payable_ugx: payDialog.total_amount_ugx,
          method: payMethod as any,
          notes: payNotes || undefined,
          requested_by: "Finance Department",
        });

      if (paymentError) throw paymentError;

      // 3. Deduct from finance cash balance
      const { data: currentBalance } = await supabase
        .from("finance_cash_balance")
        .select("current_balance")
        .single();

      if (currentBalance) {
        await supabase
          .from("finance_cash_balance")
          .update({
            current_balance: (currentBalance.current_balance || 0) - payDialog.total_amount_ugx,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (currentBalance as any).id);
      }

      // 4. Log the transaction
      await (supabase as any).from("finance_cash_transactions").insert({
        transaction_type: "outbound",
        amount: payDialog.total_amount_ugx,
        description: `Supplier payment: ${payDialog.supplier_name} - ${payDialog.batch_number}`,
        reference_number: payDialog.batch_number,
        performed_by: "Finance Department",
        balance_before: currentBalance?.current_balance || 0,
        balance_after: (currentBalance?.current_balance || 0) - payDialog.total_amount_ugx,
      });

      // 5. Insert audit log
      await supabase.from("audit_logs").insert({
        action: "SUPPLIER_PAYMENT",
        table_name: "finance_coffee_lots",
        record_id: payDialog.id,
        performed_by: "finance",
        department: "Finance",
        reason: `Paid ${payDialog.supplier_name} UGX ${payDialog.total_amount_ugx.toLocaleString()} via ${payMethod}`,
        record_data: {
          batch: payDialog.batch_number,
          amount: payDialog.total_amount_ugx,
          method: payMethod,
        },
      });

      toast.success(`Payment of UGX ${payDialog.total_amount_ugx.toLocaleString()} processed for ${payDialog.supplier_name}`);
      setPayDialog(null);
      setPayNotes("");
      queryClient.invalidateQueries({ queryKey: ["finance-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview-stats"] });
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error("Payment failed: " + (err.message || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const filtered = (lots || []).filter(
    (l) =>
      !search ||
      l.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.coffee_type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = filtered.reduce((s, l) => s + (l.total_amount_ugx || 0), 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Coffee className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Lots Awaiting Payment</p>
              <p className="text-2xl font-bold">{lots?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Pending Amount</p>
              <p className="text-2xl font-bold">UGX {totalPending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Weight</p>
              <p className="text-2xl font-bold">
                {filtered.reduce((s, l) => s + (l.quantity_kg || 0), 0).toLocaleString()} kg
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ready for Payment ({filtered.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search supplier, batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch / Record</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Coffee Type</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead className="text-right">Price/kg</TableHead>
                  <TableHead className="text-right">Total (UGX)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono text-xs">
                      {lot.batch_number || lot.coffee_record_id}
                    </TableCell>
                    <TableCell className="font-medium">{lot.supplier_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lot.coffee_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(lot.quantity_kg || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(lot.unit_price_ugx || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {(lot.total_amount_ugx || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lot.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => setPayDialog(lot)}
                        className="gap-1"
                      >
                        <CreditCard className="h-3 w-3" />
                        Pay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {search ? "No matching lots found" : "All lots have been paid ✓"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(open) => !open && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">{payDialog.supplier_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Batch</p>
                  <p className="font-mono">{payDialog.batch_number || payDialog.coffee_record_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{(payDialog.quantity_kg || 0).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg">UGX {(payDialog.total_amount_ugx || 0).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Cash</SelectItem>
                    <SelectItem value="MOBILE_MONEY">📱 Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Payment notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingPaymentsTab;
