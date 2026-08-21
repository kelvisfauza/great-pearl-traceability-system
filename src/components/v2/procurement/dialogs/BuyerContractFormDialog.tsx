import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContractPdfViewer from "@/components/contracts/ContractPdfViewer";
import type { BuyerContract } from "@/hooks/useBuyerContracts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: BuyerContract | null;
  onSubmit: (data: any) => Promise<void>;
}

const BuyerContractFormDialog = ({ open, onOpenChange, contract, onSubmit }: Props) => {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doc, setDoc] = useState<{ path: string | null; name: string | null }>({ path: null, name: null });
  const [form, setForm] = useState({
    buyer_name: "",
    buyer_ref: "",
    buyer_address: "",
    buyer_phone: "",
    quality: "",
    quality_terms: "",
    total_quantity: "",
    packaging: "",
    price_per_kg: "",
    delivery_period_start: "",
    delivery_period_end: "",
    delivery_terms: "",
    seller_name: "Great Pearl Coffee Ltd",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    if (contract) {
      setForm({
        buyer_name: contract.buyer_name || "",
        buyer_ref: contract.buyer_ref || "",
        buyer_address: contract.buyer_address || "",
        buyer_phone: contract.buyer_phone || "",
        quality: contract.quality || "",
        quality_terms: contract.quality_terms || "",
        total_quantity: contract.total_quantity?.toString() || "",
        packaging: contract.packaging || "",
        price_per_kg: contract.price_per_kg?.toString() || "",
        delivery_period_start: contract.delivery_period_start || "",
        delivery_period_end: contract.delivery_period_end || "",
        delivery_terms: contract.delivery_terms || "",
        seller_name: contract.seller_name || "Great Pearl Coffee Ltd",
        status: contract.status || "active",
        notes: contract.notes || "",
      });
      setDoc({ path: contract.document_path || null, name: contract.document_name || null });
    } else {
      setForm({
        buyer_name: "", buyer_ref: "", buyer_address: "", buyer_phone: "",
        quality: "", quality_terms: "", total_quantity: "", packaging: "",
        price_per_kg: "", delivery_period_start: "", delivery_period_end: "",
        delivery_terms: "", seller_name: "Great Pearl Coffee Ltd", status: "active", notes: "",
      });
      setDoc({ path: null, name: null });
    }
  }, [contract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        total_quantity: parseFloat(form.total_quantity) || 0,
        price_per_kg: parseFloat(form.price_per_kg) || 0,
        buyer_ref: form.buyer_ref || null,
        buyer_address: form.buyer_address || null,
        buyer_phone: form.buyer_phone || null,
        quality_terms: form.quality_terms || null,
        packaging: form.packaging || null,
        delivery_period_start: form.delivery_period_start || null,
        delivery_period_end: form.delivery_period_end || null,
        delivery_terms: form.delivery_terms || null,
        notes: form.notes || null,
        document_path: doc.path,
        document_name: doc.name,
      });
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please attach a PDF file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be less than 15MB");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || "anon";
      const path = `${uid}/buyer-contracts/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("contracts")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw error;
      setDoc({ path, name: file.name });
      toast.success("Contract PDF attached");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? "Edit Sales Contract" : "New Sales Contract"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Buyer Name *</Label><Input required value={form.buyer_name} onChange={e => update("buyer_name", e.target.value)} /></div>
            <div><Label>Buyer Ref</Label><Input value={form.buyer_ref} onChange={e => update("buyer_ref", e.target.value)} placeholder="Buyer's contract reference" /></div>
            <div><Label>Buyer Phone</Label><Input value={form.buyer_phone} onChange={e => update("buyer_phone", e.target.value)} /></div>
            <div><Label>Buyer Address</Label><Input value={form.buyer_address} onChange={e => update("buyer_address", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Quality *</Label><Input required value={form.quality} onChange={e => update("quality", e.target.value)} placeholder="e.g. Drugar Screen 15+" /></div>
            <div><Label>Packaging</Label><Input value={form.packaging} onChange={e => update("packaging", e.target.value)} placeholder="e.g. 60kg jute bags" /></div>
          </div>

          <div><Label>Quality Terms</Label><Textarea value={form.quality_terms} onChange={e => update("quality_terms", e.target.value)} placeholder="Outturn, moisture %, defect limits..." /></div>

          <div className="grid grid-cols-3 gap-4">
            <div><Label>Total Quantity (kg) *</Label><Input required type="number" value={form.total_quantity} onChange={e => update("total_quantity", e.target.value)} /></div>
            <div><Label>Price Per Kg (UGX) *</Label><Input required type="number" value={form.price_per_kg} onChange={e => update("price_per_kg", e.target.value)} /></div>
            <div><Label>Seller Name</Label><Input value={form.seller_name} onChange={e => update("seller_name", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Delivery Start</Label><Input type="date" value={form.delivery_period_start} onChange={e => update("delivery_period_start", e.target.value)} /></div>
            <div><Label>Delivery End</Label><Input type="date" value={form.delivery_period_end} onChange={e => update("delivery_period_end", e.target.value)} /></div>
          </div>

          <div><Label>Delivery Terms</Label><Textarea value={form.delivery_terms} onChange={e => update("delivery_terms", e.target.value)} /></div>

          {contract && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Contract Document (PDF)</Label>
            {doc.path ? (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{doc.name}</span>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setDoc({ path: null, name: null })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ContractPdfViewer path={doc.path} name={doc.name} height={320} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="file" accept="application/pdf" disabled={uploading} onChange={e => handleFile(e.target.files?.[0])} />
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
              </div>
            )}
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => update("notes", e.target.value)} /></div>

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

export default BuyerContractFormDialog;
