import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Truck, CheckCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SupplierContract } from "@/hooks/useSupplierContracts";

interface Delivery {
  id: string;
  contract_id: string;
  coffee_record_id: string | null;
  delivered_kg: number;
  delivery_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: SupplierContract;
  onChanged: () => void;
}

const SupplierContractDetailDialog = ({ open, onOpenChange, contract, onChanged }: Props) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const { toast } = useToast();

  const [newDelivery, setNewDelivery] = useState({
    delivered_kg: "",
    delivery_date: new Date().toISOString().split("T")[0],
    coffee_record_id: "",
    notes: "",
  });

  const fetchDeliveries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("supplier_contract_deliveries")
      .select("*")
      .eq("contract_id", contract.id)
      .order("delivery_date", { ascending: false });
    if (!error) setDeliveries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchDeliveries();
  }, [open, contract.id]);

  const totalDelivered = deliveries.reduce((s, d) => s + Number(d.delivered_kg), 0);
  const remaining = Math.max(0, contract.kilogramsExpected - totalDelivered);
  const fulfillPct = contract.kilogramsExpected > 0 ? (totalDelivered / contract.kilogramsExpected) * 100 : 0;

  const handleAddDelivery = async () => {
    const kg = parseFloat(newDelivery.delivered_kg);
    if (!kg || kg <= 0) {
      toast({ title: "Error", description: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("supplier_contract_deliveries").insert({
        contract_id: contract.id,
        delivered_kg: kg,
        delivery_date: newDelivery.delivery_date,
        coffee_record_id: newDelivery.coffee_record_id || null,
        notes: newDelivery.notes || null,
        created_by: "admin",
      });
      if (error) throw error;
      toast({ title: "Success", description: `${kg.toLocaleString()} kg delivery recorded` });
      setNewDelivery({ delivered_kg: "", delivery_date: new Date().toISOString().split("T")[0], coffee_record_id: "", notes: "" });
      setAdding(false);
      await fetchDeliveries();
      onChanged();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    const { error } = await supabase.from("supplier_contract_deliveries").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Delivery record removed" });
      await fetchDeliveries();
      onChanged();
    }
  };

  const handleMarkCompleted = async () => {
    setMarkingComplete(true);
    try {
      const { error } = await supabase
        .from("supplier_contracts")
        .update({ status: "Completed" })
        .eq("id", contract.id);
      if (error) throw error;
      toast({ title: "Contract Completed", description: "Contract marked as completed" });
      onChanged();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setMarkingComplete(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Contract: {contract.supplierName}
          </DialogTitle>
        </DialogHeader>

        {/* Contract summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Expected</p>
            <p className="text-lg font-bold">{contract.kilogramsExpected.toLocaleString()} kg</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Delivered</p>
            <p className="text-lg font-bold text-green-600">{totalDelivered.toLocaleString()} kg</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-bold text-amber-600">{remaining.toLocaleString()} kg</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Price/Kg</p>
            <p className="text-lg font-bold">UGX {contract.pricePerKg.toLocaleString()}</p>
          </CardContent></Card>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Fulfillment</span>
            <span>{fulfillPct.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(fulfillPct, 100)} className="h-2" />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {contract.status === "Active" && (
            <>
              <Button size="sm" onClick={() => setAdding(!adding)}>
                <Plus className="h-4 w-4 mr-1" /> Record Delivery
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300"
                onClick={handleMarkCompleted}
                disabled={markingComplete}
              >
                {markingComplete ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Mark Completed
              </Button>
            </>
          )}
          {contract.status !== "Active" && (
            <Badge variant="secondary">{contract.status}</Badge>
          )}
        </div>

        {/* Add delivery form */}
        {adding && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Record Coffee Delivery</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity (kg) *</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={newDelivery.delivered_kg}
                    onChange={e => setNewDelivery(p => ({ ...p, delivered_kg: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Delivery Date</Label>
                  <Input
                    type="date"
                    value={newDelivery.delivery_date}
                    onChange={e => setNewDelivery(p => ({ ...p, delivery_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Batch/Record Reference (optional)</Label>
                <Input
                  placeholder="e.g. batch number or coffee record ID"
                  value={newDelivery.coffee_record_id}
                  onChange={e => setNewDelivery(p => ({ ...p, coffee_record_id: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="Any notes about this delivery..."
                  value={newDelivery.notes}
                  onChange={e => setNewDelivery(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddDelivery} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save Delivery
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deliveries list */}
        <div>
          <p className="text-sm font-medium mb-2">Delivery History ({deliveries.length})</p>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No deliveries recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs">{format(new Date(d.delivery_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{Number(d.delivered_kg).toLocaleString()} kg</TableCell>
                    <TableCell className="text-xs font-mono">{d.coffee_record_id || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{d.notes || "—"}</TableCell>
                    <TableCell>
                      {contract.status === "Active" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDelivery(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierContractDetailDialog;
