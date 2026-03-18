import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { SupplierContract } from "@/hooks/useSupplierContracts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: SupplierContract | null;
  onSubmit: (data: any) => Promise<void>;
}

const SupplierContractFormDialog = ({ open, onOpenChange, contract, onSubmit }: Props) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierName: "",
    supplierId: "",
    contractType: "Purchase",
    date: new Date().toISOString().split("T")[0],
    kilogramsExpected: "",
    pricePerKg: "",
    advanceGiven: "0",
    status: "Active",
  });

  useEffect(() => {
    if (contract) {
      setForm({
        supplierName: contract.supplierName || "",
        supplierId: contract.supplierId || "",
        contractType: contract.contractType || "Purchase",
        date: contract.date || "",
        kilogramsExpected: contract.kilogramsExpected?.toString() || "",
        pricePerKg: contract.pricePerKg?.toString() || "",
        advanceGiven: contract.advanceGiven?.toString() || "0",
        status: contract.status || "Active",
      });
    } else {
      setForm({
        supplierName: "", supplierId: "", contractType: "Purchase",
        date: new Date().toISOString().split("T")[0],
        kilogramsExpected: "", pricePerKg: "", advanceGiven: "0", status: "Active",
      });
    }
  }, [contract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        kilogramsExpected: parseFloat(form.kilogramsExpected) || 0,
        pricePerKg: parseFloat(form.pricePerKg) || 0,
        advanceGiven: parseFloat(form.advanceGiven) || 0,
      });
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{contract ? "Edit Supplier Contract" : "New Supplier Contract"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Supplier Name *</Label><Input required value={form.supplierName} onChange={e => update("supplierName", e.target.value)} /></div>
            <div><Label>Supplier ID</Label><Input value={form.supplierId} onChange={e => update("supplierId", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contract Type</Label>
              <Select value={form.contractType} onValueChange={v => update("contractType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Forward">Forward</SelectItem>
                  <SelectItem value="Spot">Spot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input required type="date" value={form.date} onChange={e => update("date", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><Label>Expected Kg *</Label><Input required type="number" value={form.kilogramsExpected} onChange={e => update("kilogramsExpected", e.target.value)} /></div>
            <div><Label>Price/Kg (UGX) *</Label><Input required type="number" value={form.pricePerKg} onChange={e => update("pricePerKg", e.target.value)} /></div>
            <div><Label>Advance (UGX)</Label><Input type="number" value={form.advanceGiven} onChange={e => update("advanceGiven", e.target.value)} /></div>
          </div>

          {contract && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Voided">Voided</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {contract ? "Update Contract" : "Create Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierContractFormDialog;
