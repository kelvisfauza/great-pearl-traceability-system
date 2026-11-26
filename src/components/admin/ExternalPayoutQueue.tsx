import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCheck, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function ExternalPayoutQueue({ kind }: { kind: "meal" | "support" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const { data = [], error } = useQuery({ queryKey: ["external-payout-requests", kind], queryFn: async () => {
    const result = await supabase.from("external_payout_requests").select("*").eq("kind", kind).in("status", ["pending", "processing"]).order("created_at");
    if (result.error) throw result.error;
    return result.data;
  } });
  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data: outcome, error: failure } = await supabase.functions.invoke(kind === "meal" ? "meal-disbursement" : "support-staff-perdiem", { body: { action: "approve", requestId: selected.id } });
      if (failure || !outcome?.success) throw new Error(failure?.message || outcome?.error || outcome?.message || "Payment could not complete; check its status before retrying");
      toast({ title: "Payment reviewed", description: outcome.message });
      setSelected(null);
    } catch (failure) { toast({ title: "Payment not completed", description: failure instanceof Error ? failure.message : "Check payment status", variant: "destructive" }); }
    finally { setBusy(false); client.invalidateQueries({ queryKey: ["external-payout-requests"] }); client.invalidateQueries({ queryKey: [kind === "meal" ? "meal-disbursements" : "support-staff-per-diem"] }); }
  };
  return <>
    {error && <p className="text-destructive p-4">Pending payment requests could not be loaded.</p>}
    {data.length > 0 && <section className="border-b border-border p-4 space-y-3"><h3 className="font-semibold">Pending independent approval</h3>{data.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0"><p className="font-medium break-words">{row.recipient_name} · UGX {(Number(row.amount) + Number(row.charge)).toLocaleString()}</p><p className="text-sm text-muted-foreground break-words">{row.recipient_phone} · {row.description}</p><p className="text-xs text-muted-foreground">Requested by {row.requested_name} · {row.payment_method === "cash" ? "Cash" : row.provider}</p></div>
      {row.status === "processing" ? <span className="text-sm text-muted-foreground">Processing — check payment history before retrying</span> : row.requested_by === user?.id ? <span className="text-sm text-muted-foreground">Waiting for another administrator</span> : <Button size="sm" variant="outline" onClick={() => setSelected(row)}><CheckCheck className="h-4 w-4 mr-2" />Review payment</Button>}
    </div>)}</section>}
    <AlertDialog open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Approve this payment?</AlertDialogTitle><AlertDialogDescription>{selected && `${selected.recipient_name} — ${selected.recipient_phone}. Amount UGX ${Number(selected.amount).toLocaleString()}, charge UGX ${Number(selected.charge).toLocaleString()}, total UGX ${(Number(selected.amount)+Number(selected.charge)).toLocaleString()}. ${selected.description}`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button onClick={approve} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-2" />}Approve and process</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}