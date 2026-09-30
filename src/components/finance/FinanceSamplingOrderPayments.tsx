import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Paperclip, CreditCard, QrCode, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import GRNScannerDialog from "@/components/finance/GRNScannerDialog";

const money = (n?: number | null) => `UGX ${Number(n || 0).toLocaleString()}`;

/**
 * Sampling orders whose lot has been assessed and priced arrive here as pending
 * orders. Finance must attach the Quality GRN (scan or type) before paying.
 */
export default function FinanceSamplingOrderPayments() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [scanFor, setScanFor] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["finance-sampling-orders"],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data: orders } = await (supabase as any)
        .from("quality_sampling_orders")
        .select("*")
        .not("linked_batch_number", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);
      const list: any[] = orders || [];
      const batches = [...new Set(list.map((o) => o.linked_batch_number))];
      if (!batches.length) return [];
      const { data: lots } = await supabase
        .from("finance_coffee_lots")
        .select("id, batch_number, total_amount_ugx, quantity_kg, unit_price_ugx, finance_status")
        .in("batch_number", batches);
      const out: any[] = [];
      for (const o of list) {
        const lot = (lots || []).find(
          (l: any) => l.batch_number === o.linked_batch_number && String(l.finance_status).toUpperCase() !== "PAID" && Number(l.total_amount_ugx) > 0,
        );
        if (lot) out.push({ order: o, lot });
      }
      return out;
    },
  });

  const attach = async (orderId: string, code: string) => {
    if (!code.trim()) return toast.error("Scan or type the GRN number first");
    setBusy(orderId);
    const { data, error } = await (supabase as any).rpc("attach_sampling_order_grn", { p_order_id: orderId, p_code: code });
    setBusy(null);
    if (error || !data?.ok) return toast.error(data?.error || error?.message || "Could not attach GRN");
    toast.success("GRN attached — you can now pay");
    qc.invalidateQueries({ queryKey: ["finance-sampling-orders"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" /> Sampling orders — pending payment ({rows.length})
        </CardTitle>
        <CardDescription>
          Priced lots from Quality. Attach the GRN from Quality, then pay. After paying, print the Payment Order and receipt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sampling orders waiting for payment.</p>
        ) : (
          rows.map(({ order, lot }: any) => (
            <div key={order.id} className="rounded-md border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{order.supplier_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.order_number} · Batch {order.linked_batch_number} · {Number(lot.quantity_kg).toLocaleString()} kg @ {money(lot.unit_price_ugx)}
                  </div>
                </div>
                <div className="font-semibold">{money(lot.total_amount_ugx)}</div>
              </div>
              {order.finance_grn_number ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary">
                    <Paperclip className="mr-1 h-3 w-3" /> {order.finance_grn_number} attached by {order.finance_grn_attached_by}
                  </Badge>
                  <Button size="sm" onClick={() => navigate(`/grn/${order.linked_batch_number}?po=1`)}>
                    <CreditCard className="mr-1 h-4 w-4" /> Pay
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder="GRN number or pay code"
                    value={codes[order.id] || ""}
                    onChange={(e) => setCodes({ ...codes, [order.id]: e.target.value })}
                  />
                  <Button size="sm" variant="outline" onClick={() => setScanFor(order.id)}>
                    <QrCode className="mr-1 h-4 w-4" /> Scan
                  </Button>
                  <Button size="sm" disabled={busy === order.id} onClick={() => attach(order.id, codes[order.id] || "")}>
                    {busy === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="mr-1 h-4 w-4" />} Attach GRN
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
      {scanFor && (
        <GRNScannerDialog
          {...({
            open: !!scanFor,
            onOpenChange: (o: boolean) => !o && setScanFor(null),
            onClose: () => setScanFor(null),
            onScan: (code: string) => { const id = scanFor; setScanFor(null); attach(id!, code); },
            onDetected: (code: string) => { const id = scanFor; setScanFor(null); attach(id!, code); },
          } as any)}
        />
      )}
    </Card>
  );
}
