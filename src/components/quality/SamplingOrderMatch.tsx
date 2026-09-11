import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Beaker, Loader2 } from "lucide-react";
import { format } from "date-fns";

const SAMPLE_LABELS: Record<string, string> = {
  offer_sample: "Offer Sample",
  delivery: "Delivery",
  presample: "Presample",
  dispatch: "Dispatch",
};

export interface SamplingOrderLite {
  id: string;
  order_number: string;
  supplier_name: string;
  sample_type: string;
  delivery_time: string;
  sampled_by: string;
  notes: string | null;
  status: string;
  received_grams: number | null;
  received_at: string | null;
  received_by: string | null;
  received_observation: string | null;
  linked_batch_number: string | null;
}

interface Props {
  supplierName: string;
  value: string; // selected sampling order id ('' = none)
  onChange: (order: SamplingOrderLite | null) => void;
  disabled?: boolean;
}

const NONE = "__none__";

/**
 * Finds recent sampling orders for the selected supplier and auto-selects the
 * most recent unlinked one, so the assessor fills the readings from the sample.
 */
const SamplingOrderMatch = ({ supplierName, value, onChange, disabled }: Props) => {
  const name = (supplierName || "").trim();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["sampling-order-match", name.toLowerCase()],
    enabled: name.length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_sampling_orders" as any)
        .select("*")
        .ilike("supplier_name", `%${name}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as SamplingOrderLite[];
    },
  });

  const candidates = useMemo(
    () => (orders || []).filter((o) => !o.linked_batch_number),
    [orders],
  );

  // Auto-pick the most recent unlinked order when the supplier changes.
  useEffect(() => {
    if (isLoading) return;
    if (candidates.length > 0 && !value) {
      onChange(candidates[0]);
    } else if (candidates.length === 0 && value) {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, candidates.map((c) => c.id).join(",")]);

  if (name.length <= 1) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking for sampling orders…
      </div>
    );
  }
  if (candidates.length === 0) return null;

  const selected = candidates.find((c) => c.id === value) || null;

  return (
    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Beaker className="h-4 w-4" /> Sampling order found for this supplier
        </div>
        <div className="min-w-[240px]">
          <Label className="sr-only">Sampling order</Label>
          <Select
            value={value || NONE}
            disabled={disabled}
            onValueChange={(v) => onChange(v === NONE ? null : candidates.find((c) => c.id === v) || null)}
          >
            <SelectTrigger className="h-8"><SelectValue placeholder="Select sampling order" /></SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.order_number} · {SAMPLE_LABELS[c.sample_type] || c.sample_type}
                </SelectItem>
              ))}
              <SelectItem value={NONE}>Not from a sampling order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Order no.</span><div className="font-mono font-medium">{selected.order_number}</div></div>
            <div><span className="text-muted-foreground">Sample type</span><div><Badge variant="outline">{SAMPLE_LABELS[selected.sample_type] || selected.sample_type}</Badge></div></div>
            <div><span className="text-muted-foreground">Sampled by</span><div className="font-medium">{selected.sampled_by}</div></div>
            <div><span className="text-muted-foreground">To lab</span><div className="font-medium">{format(new Date(selected.delivery_time), "dd MMM yyyy, HH:mm")}</div></div>
            <div><span className="text-muted-foreground">Lab status</span><div>
              {selected.received_at
                ? <Badge className="bg-green-600 hover:bg-green-600">Received</Badge>
                : <Badge variant="secondary">Not yet received</Badge>}
            </div></div>
            <div><span className="text-muted-foreground">Grams received</span><div className="font-medium">{selected.received_grams ? `${selected.received_grams} g` : "—"}</div></div>
            <div><span className="text-muted-foreground">Received by</span><div className="font-medium">{selected.received_by || "—"}</div></div>
            <div><span className="text-muted-foreground">Received at</span><div className="font-medium">{selected.received_at ? format(new Date(selected.received_at), "dd MMM, HH:mm") : "—"}</div></div>
            {selected.received_observation && (
              <div className="col-span-2 md:col-span-4"><span className="text-muted-foreground">Lab observation</span><div className="font-medium">{selected.received_observation}</div></div>
            )}
            {selected.notes && (
              <div className="col-span-2 md:col-span-4"><span className="text-muted-foreground">Sampler notes</span><div className="font-medium">{selected.notes}</div></div>
            )}
          </div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            This coffee was sampled and assessed in the lab. Enter every reading from the sample results:
            moisture, Group 1, Group 2, below 12, pods, husks and stones are all required.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sampling orders exist for this supplier but none is linked. Pick one above if this delivery was sampled.
        </p>
      )}
    </div>
  );
};

export default SamplingOrderMatch;
