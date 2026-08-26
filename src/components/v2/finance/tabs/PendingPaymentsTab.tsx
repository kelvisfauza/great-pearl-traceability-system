import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, CreditCard, CheckCircle2, DollarSign, Coffee, Trash2, QrCode, Receipt, Printer } from "lucide-react";
import { openBulkGRNPrintWindow, GRNData } from "@/utils/bulkGRNPrint";
import { toast } from "sonner";
import GRNScannerDialog from "@/components/finance/GRNScannerDialog";
import { useNavigate } from "react-router-dom";
import { getGrnPayCode } from "@/utils/grnPayCode";

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
  bags?: number;
}

const MAX_BULK_PRINT = 20;
const PRINTED_KEY = "finance-grn-printed-ids";

const loadPrintedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PRINTED_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
};

const PendingPaymentsTab = () => {
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printedIds, setPrintedIds] = useState<Set<string>>(() => loadPrintedIds());
  const [scanOpen, setScanOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const markPrinted = (ids: string[]) => {
    setPrintedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      try { localStorage.setItem(PRINTED_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };


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
      let supplierMap = new Map<string, { supplier_name: string; coffee_type: string; batch_number: string; bags: number }>();

      // Fetch in chunks of 500
      for (let i = 0; i < coffeeRecordIds.length; i += 500) {
        const chunk = coffeeRecordIds.slice(i, i + 500);
        const { data: records } = await supabase
          .from("coffee_records")
          .select("id, supplier_name, coffee_type, batch_number, bags")
          .in("id", chunk);
        records?.forEach((r: any) => {
          supplierMap.set(r.id, {
            supplier_name: r.supplier_name,
            coffee_type: r.coffee_type,
            batch_number: r.batch_number,
            bags: Number(r.bags) || 0,
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
          bags: record?.bags || 0,
          batch_number: lot.batch_number || record?.batch_number || lot.coffee_record_id,
        };
      }) as FinanceLot[];
    },
  });

  // Re-print a misplaced GRN with the real coffee details + secure pay QR so
  // finance can simply scan the printout to pay.
  const toGrnData = (lot: FinanceLot): GRNData => {
    const q = lot.quality_json || {};
    return {
      grnNumber: `GRN-${lot.batch_number || lot.coffee_record_id}`,
      batchNumber: lot.batch_number || undefined,
      supplierName: lot.supplier_name || "Unknown Supplier",
      supplierId: lot.supplier_id || undefined,
      coffeeType: lot.coffee_type || "",
      numberOfBags: lot.bags || 0,
      totalKgs: lot.quantity_kg || 0,
      unitPrice: lot.unit_price_ugx || 0,
      totalAmount: lot.total_amount_ugx || 0,
      assessedBy: lot.assessed_by || "",
      createdAt: lot.created_at,
      moisture: q.moisture_content ?? q.moisture,
      group1_defects: q.group1_percentage ?? q.group1_defects,
      group2_defects: q.group2_percentage ?? q.group2_defects,
      below12: q.below12,
      pods: q.pods,
      husks: q.husks,
      stones: q.stones,
      outturn: q.outturn_percentage ?? q.outturn,
      calculatorComments: q.comments,
    };
  };

  const printGrns = async (items: FinanceLot[]) => {
    if (!items.length) return;
    const batch = items.slice(0, MAX_BULK_PRINT);
    setPrinting(true);
    try {
      await openBulkGRNPrintWindow(batch.map(toGrnData));
      markPrinted(batch.map((l) => l.id));
      setSelectedIds(new Set());
      toast.success(`${batch.length} GRN document(s) prepared for printing`);
    } catch (err: any) {
      toast.error("Print failed: " + (err?.message || "Unknown error"));
    } finally {
      setPrinting(false);
    }
  };



  // Payment is always made against the physical GRN document: open the same
  // secure GRN pay screen used by the scanner (issues the payment receipt).
  const handleProcessPayment = async (lot: FinanceLot) => {
    const ref = lot.batch_number || lot.coffee_record_id;
    if (!ref) {
      toast.error("This lot has no GRN reference");
      return;
    }
    setOpeningId(lot.id);
    try {
      const payCode = await getGrnPayCode(ref).catch(() => null);
      navigate(`/grn/${encodeURIComponent(payCode || ref)}`);
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const { error } = await supabase
          .from("finance_coffee_lots")
          .delete()
          .in("id", chunk);
        if (error) throw error;
      }
      toast.success(`Deleted ${ids.length} duplicate entries`);
      setSelectedIds(new Set());
      setDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["finance-pending-payments"] });
    } catch (err: any) {
      toast.error("Delete failed: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size >= MAX_BULK_PRINT) {
        toast.warning(`You can select up to ${MAX_BULK_PRINT} GRNs at a time`);
        return prev;
      } else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = filtered.filter((l) => !printedIds.has(l.id)).slice(0, MAX_BULK_PRINT);
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      if (!selectable.length) {
        toast.info("All visible GRNs have already been printed");
        return;
      }
      setSelectedIds(new Set(selectable.map((l) => l.id)));
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

      <GRNScannerDialog open={scanOpen} onOpenChange={setScanOpen} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ready for Payment ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setScanOpen(true)}>
                <QrCode className="h-3.5 w-3.5" /> Scan GRN
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  disabled={printing}
                  onClick={() => printGrns(filtered.filter((l) => selectedIds.has(l.id)))}
                >
                  {printing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                  Print GRNs ({selectedIds.size})
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDialog(true)}
                  className="gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete ({selectedIds.size})
                </Button>
              )}
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size > 0}
                      onCheckedChange={toggleSelectAll}
                      title={`Select up to ${MAX_BULK_PRINT} unprinted GRNs`}
                    />
                  </TableHead>
                  <TableHead>Batch / Record</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Coffee Type</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead className="text-right">Price/kg</TableHead>
                  <TableHead className="text-right">Total (UGX)</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lot) => (
                  <TableRow key={lot.id} className={selectedIds.has(lot.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lot.id)}
                        disabled={printedIds.has(lot.id)}
                        onCheckedChange={() => toggleSelect(lot.id)}
                        title={printedIds.has(lot.id) ? "Already printed — use Reprint" : undefined}
                      />
                    </TableCell>

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
                    <TableCell className="text-xs">
                      {lot.quality_json ? (
                        <div className="space-y-0.5">
                          {lot.quality_json.moisture_content != null && (
                            <span className="block">M: {lot.quality_json.moisture_content}%</span>
                          )}
                          {lot.quality_json.outturn_percentage != null && (
                            <span className="block">OT: {lot.quality_json.outturn_percentage}%</span>
                          )}
                          {(lot.quality_json.group1_percentage != null || lot.quality_json.group2_percentage != null) && (
                            <span className="block text-muted-foreground">
                              G1: {lot.quality_json.group1_percentage ?? '-'}% G2: {lot.quality_json.group2_percentage ?? '-'}%
                            </span>
                          )}
                          {lot.quality_json.comments && (
                            <span className="block text-muted-foreground truncate max-w-[120px]" title={lot.quality_json.comments}>
                              {lot.quality_json.comments}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lot.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessPayment(lot)}
                          disabled={openingId === lot.id}
                          className="gap-1"
                        >
                          {openingId === lot.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Receipt className="h-3 w-3" />
                          )}
                          Process Payment
                        </Button>
                        <Button
                          size="sm"
                          variant={printedIds.has(lot.id) ? "outline" : "secondary"}
                          onClick={() => printGrns([lot])}
                          disabled={printing}
                          className="gap-1"
                          title="Print this GRN with the coffee details and pay QR"
                        >
                          <Printer className="h-3 w-3" />
                          {printedIds.has(lot.id) ? "Reprint" : "Print GRN"}
                        </Button>
                        {printedIds.has(lot.id) && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> Printed
                          </Badge>
                        )}

                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {search ? "No matching lots found" : "All lots have been paid ✓"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Duplicate Entries</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected entries? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete {selectedIds.size} Entries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingPaymentsTab;
