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
  batch: {
    id: string;
    batch_identifier: string;
    available_kilograms: number;
  };
}

const AttachSaleDialog = ({ open, onOpenChange, batch }: AttachSaleDialogProps) => {
  const [saleId, setSaleId] = useState("");
  const [kg, setKg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sales, isLoading } = useQuery({
    queryKey: ["completed-sales-for-eudr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("id, customer, coffee_type, weight, date, status")
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleAttach = async () => {
    if (!saleId || !kg || Number(kg) <= 0) {
      toast({ title: "Error", description: "Select a sale and enter valid kg", variant: "destructive" });
      return;
    }
    if (Number(kg) > batch.available_kilograms) {
      toast({ title: "Error", description: `Only ${batch.available_kilograms}kg available`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("eudr_batch_sales").insert({
        batch_id: batch.id,
        sale_transaction_id: saleId,
        kilograms_allocated: Number(kg),
        attached_by: "system",
      });
      if (error) throw error;

      toast({ title: "Sale Attached", description: `${kg}kg linked to sale` });
      queryClient.invalidateQueries({ queryKey: ["eudr-batch-trace"] });
      queryClient.invalidateQueries({ queryKey: ["eudr"] });
      onOpenChange(false);
      setSaleId("");
      setKg("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSale = sales?.find((s: any) => s.id === saleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Sale to {batch.batch_identifier}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Available: <strong>{batch.available_kilograms.toLocaleString()}kg</strong></p>

        <div className="space-y-4">
          <div>
            <Label>Select Sale</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading sales...</div>
            ) : (
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger><SelectValue placeholder="Choose a sale..." /></SelectTrigger>
                <SelectContent>
                  {sales?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date} — {s.customer} — {s.coffee_type} ({Number(s.weight).toLocaleString()}kg)
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
              <p><strong>Status:</strong> {selectedSale.status}</p>
            </div>
          )}

          <div>
            <Label>Kilograms to Allocate</Label>
            <Input
              type="number"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              max={batch.available_kilograms}
              placeholder={`Max ${batch.available_kilograms}kg`}
            />
          </div>

          <Button onClick={handleAttach} disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Attaching...</> : "Attach Sale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttachSaleDialog;
