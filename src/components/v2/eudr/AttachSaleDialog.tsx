import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AttachSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttached?: () => void;
  batch: {
    id: string;
    batch_identifier: string;
    available_kilograms: number | string;
  };
}

const AttachSaleDialog = ({ open, onOpenChange, onAttached, batch }: AttachSaleDialogProps) => {
  const [saleId, setSaleId] = useState("");
  const [kg, setKg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const availableKg = Number(batch.available_kilograms) || 0;

  const { data: sales, isLoading, error: salesError } = useQuery({
    queryKey: ["completed-sales-for-eudr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("id, customer, coffee_type, weight, date, status")
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;

      const ids = (data || []).map((s: any) => s.id);
      let allocatedBySale: Record<string, number> = {};
      if (ids.length) {
        const { data: allocs, error: allocErr } = await supabase
          .from("eudr_batch_sales")
          .select("sale_transaction_id, kilograms_allocated")
          .in("sale_transaction_id", ids);
        if (allocErr) throw allocErr;
        allocatedBySale = (allocs || []).reduce((acc: Record<string, number>, a: any) => {
          acc[a.sale_transaction_id] = (acc[a.sale_transaction_id] || 0) + (Number(a.kilograms_allocated) || 0);
          return acc;
        }, {});
      }

      return (data || [])
        .map((s: any) => {
          const allocated = allocatedBySale[s.id] || 0;
          const remaining = Math.max(0, (Number(s.weight) || 0) - allocated);
          return { ...s, allocated, remaining };
        })
        // Fully allocated sales disappear from the list
        .filter((s: any) => s.remaining > 0.0001);
    },
    enabled: open,
  });

  const handleAttach = async () => {
    const amount = Number(kg);
    if (!saleId || !kg || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Error", description: "Select a sale and enter valid kg", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Re-check the sale's remaining unallocated weight — never exceed the sold weight
      const { data: saleRow, error: saleErr } = await supabase
        .from("sales_transactions")
        .select("weight")
        .eq("id", saleId)
        .maybeSingle();
      if (saleErr) throw saleErr;
      const { data: existingAllocs, error: allocErr } = await supabase
        .from("eudr_batch_sales")
        .select("kilograms_allocated")
        .eq("sale_transaction_id", saleId);
      if (allocErr) throw allocErr;
      const soldWeight = Number(saleRow?.weight) || 0;
      const alreadyAllocated = (existingAllocs || []).reduce(
        (sum: number, a: any) => sum + (Number(a.kilograms_allocated) || 0),
        0
      );
      const remainingOnSale = Math.max(0, soldWeight - alreadyAllocated);
      if (amount > remainingOnSale) {
        throw new Error(
          `This sale only has ${remainingOnSale.toLocaleString()}kg left to allocate (sold ${soldWeight.toLocaleString()}kg, already traced ${alreadyAllocated.toLocaleString()}kg)`
        );
      }

      // Re-check live availability (another user may have allocated in the meantime)
      const { data: liveBatch, error: batchErr } = await supabase
        .from("eudr_batches")
        .select("available_kilograms, status")
        .eq("id", batch.id)
        .maybeSingle();
      if (batchErr) throw batchErr;
      const liveAvailable = Number(liveBatch?.available_kilograms ?? availableKg) || 0;
      if (amount > liveAvailable) {
        throw new Error(`Only ${liveAvailable.toLocaleString()}kg available on this batch`);
      }

      const { data: userData } = await supabase.auth.getUser();
      const actor = userData?.user?.email || userData?.user?.id;
      if (!actor) throw new Error("Your session expired. Please sign in again.");

      const { error } = await supabase.from("eudr_batch_sales").insert({
        batch_id: batch.id,
        sale_transaction_id: saleId,
        kilograms_allocated: amount,
        attached_by: actor,
      });
      if (error) throw error;

      toast({ title: "Sale Attached", description: `${kg}kg linked to sale` });
      queryClient.invalidateQueries({ queryKey: ["eudr-batch-trace"] });
      queryClient.invalidateQueries({ queryKey: ["eudr"] });
      queryClient.invalidateQueries({ queryKey: ["eudr-v2-stats"] });
      onAttached?.();
      onOpenChange(false);
      setSaleId("");
      setKg("");
    } catch (err: any) {
      console.error("Attach sale failed:", err);
      const detail = [err?.message, err?.details, err?.hint, err?.code && `(${err.code})`]
        .filter(Boolean)
        .join(" — ");
      toast({
        title: "Attach failed",
        description: detail || "Could not attach this sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSale = sales?.find((s: any) => s.id === saleId);
  const maxAllocatable = selectedSale
    ? Math.min(availableKg, Number((selectedSale as any).remaining) || 0)
    : availableKg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Sale to {batch.batch_identifier}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Available: <strong>{availableKg.toLocaleString()}kg</strong></p>

        <div className="space-y-4">
          <div>
            <Label>Select Sale</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading sales...</div>
            ) : salesError ? (
              <p className="text-sm text-destructive py-2">Could not load sales: {(salesError as any)?.message}</p>
            ) : (
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger><SelectValue placeholder="Choose a sale..." /></SelectTrigger>
                <SelectContent>
                  {(!sales || sales.length === 0) && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No sales found</div>
                  )}
                  {sales?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date} — {s.customer} — {s.coffee_type} ({Number(s.remaining).toLocaleString()}kg left of {Number(s.weight).toLocaleString()}kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedSale && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Customer:</strong> {selectedSale.customer}</p>
              <p><strong>Type:</strong> {selectedSale.coffee_type}</p>
              <p><strong>Weight:</strong> {Number(selectedSale.weight).toLocaleString()}kg</p>
              <p><strong>Already traced:</strong> {Number((selectedSale as any).allocated).toLocaleString()}kg</p>
              <p><strong>Remaining to allocate:</strong> {Number((selectedSale as any).remaining).toLocaleString()}kg</p>
              <p><strong>Status:</strong> {selectedSale.status}</p>
            </div>
          )}

          <div>
            <Label>Kilograms to Allocate</Label>
            <Input
              type="number"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              max={maxAllocatable}
              placeholder={`Max ${maxAllocatable.toLocaleString()}kg`}
            />
            {selectedSale && Number(kg) > maxAllocatable && (
              <p className="text-xs text-destructive mt-1">
                Cannot exceed {maxAllocatable.toLocaleString()}kg (batch availability / remaining sold weight)
              </p>
            )}
          </div>

          <Button
            onClick={handleAttach}
            disabled={submitting || !saleId || !kg || Number(kg) <= 0 || Number(kg) > maxAllocatable}
            className="w-full"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Attaching...</> : "Attach Sale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttachSaleDialog;
