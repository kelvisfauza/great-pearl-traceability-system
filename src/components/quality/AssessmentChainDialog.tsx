import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Package, FlaskConical, Warehouse, Banknote, Boxes, Truck, Printer, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { getStandardPrintStyles } from "@/utils/printStyles";
import {
  LOGO_URL,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  COMPANY_ADDRESS,
  COMPANY_PHONES,
  COMPANY_EMAIL,
  COMPANY_REG,
} from "@/utils/companyBrand";
import { format } from "date-fns";

interface Props {
  assessment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmtKg = (v: any) => `${Number(v || 0).toLocaleString()} kg`;
const fmtUgx = (v: any) => `UGX ${Number(v || 0).toLocaleString()}`;
const fmtDate = (v: any) => {
  if (!v) return "—";
  try { return format(new Date(v), "dd MMM yyyy, HH:mm"); } catch { return String(v); }
};

const Row = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between gap-4 py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value ?? "—"}</span>
  </div>
);

const Step = ({
  icon: Icon,
  title,
  status,
  children,
}: { icon: any; title: string; status?: string; children: React.ReactNode }) => (
  <div className="relative pl-8 pb-5 border-l last:border-l-transparent">
    <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </span>
    <div className="flex items-center gap-2 mb-1">
      <h4 className="font-semibold text-sm">{title}</h4>
      {status && <Badge variant="outline" className="text-[10px]">{status}</Badge>}
    </div>
    <div className="rounded-md border bg-muted/30 p-3 divide-y">{children}</div>
  </div>
);

const AssessmentChainDialog = ({ assessment, open, onOpenChange }: Props) => {
  const assessmentId = assessment?.id;
  const recordId = assessment?.store_record_id;
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["assessment-chain", assessmentId, recordId],
    enabled: open && !!assessmentId,
    queryFn: async () => {
      const [recordRes, lotRes, sourcesRes] = await Promise.all([
        recordId
          ? supabase.from("coffee_records").select("*").eq("id", recordId).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from("finance_coffee_lots")
          .select("*")
          .eq("quality_assessment_id", assessmentId)
          .maybeSingle(),
        recordId
          ? supabase.from("inventory_batch_sources").select("*").eq("coffee_record_id", recordId)
          : Promise.resolve({ data: [] } as any),
      ]);

      const lot: any = lotRes.data;
      let payments: any[] = [];
      if (lot?.id) {
        const { data: pays } = await supabase
          .from("supplier_payments")
          .select("*")
          .eq("lot_id", lot.id)
          .order("created_at", { ascending: false });
        payments = pays || [];
      }

      const sources: any[] = (sourcesRes as any).data || [];
      let batches: any[] = [];
      const batchIds = sources.map((s) => s.batch_id).filter(Boolean);
      if (batchIds.length) {
        const { data: b } = await supabase.from("inventory_batches").select("*").in("id", batchIds);
        batches = b || [];
      }

      // Sales that consumed the inventory batches this delivery fed into
      let batchSales: any[] = [];
      let sales: any[] = [];
      if (batchIds.length) {
        const { data: bs } = await supabase
          .from("inventory_batch_sales")
          .select("*")
          .in("batch_id", batchIds)
          .order("sale_date", { ascending: false });
        batchSales = bs || [];
        const saleIds = [...new Set(batchSales.map((s: any) => s.sale_transaction_id).filter(Boolean))];
        if (saleIds.length) {
          const { data: st } = await supabase
            .from("sales_transactions")
            .select("*")
            .in("id", saleIds);
          sales = st || [];
        }
      }

      return { record: (recordRes as any).data, lot, payments, sources, batches, batchSales, sales };
    },
  });

  if (!assessment) return null;

  const record = data?.record;
  const lot = data?.lot;
  const assessedKg = lot?.quantity_kg ?? record?.kilograms;
  const unitPrice = assessment.final_price || assessment.suggested_price;
  const grossValue = Number(assessedKg || 0) * Number(unitPrice || 0);

  const handlePrint = () => {
    const body = printRef.current?.innerHTML || "";
    const w = window.open("", "", "width=1000,height=1200");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Traceability Chain - ${assessment.batch_number}</title>
      <style>${getStandardPrintStyles()}
        .chain-body { font-size: 12px; }
        .chain-body .rounded-md, .chain-body .rounded-lg, .chain-body .rounded { border: 1px solid #ddd; padding: 6px; }
        .chain-body h4 { margin: 10px 0 4px; font-size: 13px; }
        .letterhead { display:flex; align-items:center; gap:12px; border-bottom:2px solid #0d3d1f; padding-bottom:8px; margin-bottom:12px; }
        .letterhead img { height:56px !important; max-width:none !important; margin:0 !important; }
      </style></head><body>
      <div class="letterhead">
        <img src="${window.location.origin}${LOGO_URL}" alt="${COMPANY_NAME}" />
        <div>
          <div class="company-name">${COMPANY_NAME}</div>
          <div class="company-subtitle">${COMPANY_TAGLINE}</div>
          <div class="company-details">${COMPANY_ADDRESS} · ${COMPANY_PHONES}<br/>${COMPANY_EMAIL} · ${COMPANY_REG}</div>
        </div>
      </div>
      <div class="document-title" style="text-align:center;">Coffee Traceability Chain Report</div>
      <div class="document-info" style="text-align:center;">Batch ${assessment.batch_number || "—"} · Printed ${new Date().toLocaleString("en-GB")}</div>
      <div class="chain-body">${body}</div>
      <div class="signatures">
        <div><div class="signature-line"></div>Quality Manager</div>
        <div><div class="signature-line"></div>Store Manager</div>
        <div><div class="signature-line"></div>Administrator</div>
      </div>
      <div class="footer">${COMPANY_NAME} — internal traceability document. Assessment ID: ${assessment.id}</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Batch {assessment.batch_number} — Full Chain</DialogTitle>
          <DialogDescription>
            Delivery, quality, weights, inventory and payment trail for this assessment.
          </DialogDescription>
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={handlePrint} disabled={isLoading}>
              <Printer className="h-4 w-4 mr-1" />
              Print report
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[72vh] px-6 pb-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="pt-2" ref={printRef}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Delivered weight</p>
                  <p className="text-lg font-bold">{fmtKg(record?.kilograms)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Bags</p>
                  <p className="text-lg font-bold">{record?.bags ?? "—"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Unit price</p>
                  <p className="text-lg font-bold text-green-600">{fmtUgx(unitPrice)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Gross value</p>
                  <p className="text-lg font-bold">{fmtUgx(lot?.total_amount_ugx ?? grossValue)}</p>
                </div>
              </div>

              <Step icon={Package} title="1. Store delivery" status={record?.status}>
                <Row label="Supplier" value={record?.supplier_name || assessment.supplier_name} />
                <Row label="Coffee type" value={record?.coffee_type} />
                <Row label="Batch number" value={record?.batch_number || assessment.batch_number} />
                <Row label="Delivery date" value={record?.date || "—"} />
                <Row label="Weight received" value={fmtKg(record?.kilograms)} />
                <Row label="Bags" value={record?.bags ?? "—"} />
                <Row label="Recorded by" value={record?.created_by} />
                <Row label="Recorded at" value={fmtDate(record?.created_at)} />
              </Step>

              <Step icon={FlaskConical} title="2. Quality assessment" status={assessment.status}>
                <Row label="Moisture" value={`${assessment.moisture ?? "—"}%`} />
                <Row label="Group 1 defects" value={`${assessment.group1_defects ?? 0}%`} />
                <Row label="Group 2 defects" value={`${assessment.group2_defects ?? 0}%`} />
                <Row label="Below 12 / Pods" value={`${assessment.below12 ?? 0}% / ${assessment.pods ?? 0}%`} />
                <Row label="Husks / Stones" value={`${assessment.husks ?? 0}% / ${assessment.stones ?? 0}%`} />
                <Row label="Outturn" value={assessment.outturn ? `${assessment.outturn}%` : "—"} />
                <Row label="Suggested price" value={fmtUgx(assessment.suggested_price)} />
                <Row label="Final price" value={fmtUgx(assessment.final_price || assessment.suggested_price)} />
                <Row label="Physical assessment by" value={assessment.physical_assessment_by} />
                <Row label="System entry by" value={assessment.system_assessment_by || assessment.assessed_by} />
                <Row label="Date assessed" value={assessment.date_assessed} />
                <Row label="Comments" value={assessment.comments} />
              </Step>

              <Step
                icon={Truck}
                title="3. GRN"
                status={assessment.grn_printed ? "Printed" : "Not printed"}
              >
                <Row label="GRN number" value={lot?.grn_number} />
                <Row label="Printed by" value={assessment.grn_printed_by} />
                <Row label="Printed at" value={fmtDate(assessment.grn_printed_at)} />
              </Step>

              <Step icon={Banknote} title="4. Finance & payment" status={lot?.finance_status || "Not sent to finance"}>
                <Row label="Lot quantity" value={fmtKg(lot?.quantity_kg)} />
                <Row label="Unit price (finance)" value={fmtUgx(lot?.unit_price_ugx)} />
                <Row label="Total amount" value={fmtUgx(lot?.total_amount_ugx)} />
                <Row label="Amount paid" value={fmtUgx(lot?.amount_paid_ugx)} />
                <Row label="Advance recovered" value={fmtUgx(lot?.advance_recovered_ugx)} />
                <Row label="Balance" value={fmtUgx(lot?.balance_ugx)} />
                <Row label="Payment status" value={lot?.payment_status || "—"} />
                {(data?.payments || []).length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Payments</p>
                    {data!.payments.map((p: any) => (
                      <div key={p.id} className="rounded border bg-background p-2 text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <span className="font-medium">{fmtUgx(p.amount_paid_ugx)}</span>
                          <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                        </div>
                        <div className="text-muted-foreground">
                          {p.method} · {fmtDate(p.payment_date || p.created_at)}
                        </div>
                        {p.reference && <div className="text-muted-foreground">Ref: {p.reference}</div>}
                        {p.approved_by && <div className="text-muted-foreground">Approved by: {p.approved_by}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </Step>

              <Step icon={Boxes} title="5. Inventory allocation" status={`${data?.sources?.length || 0} batch link(s)`}>
                {(data?.sources || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">Not yet allocated to an inventory batch.</p>
                ) : (
                  data!.sources.map((s: any) => {
                    const batch = data!.batches.find((b: any) => b.id === s.batch_id);
                    return (
                      <div key={s.id} className="py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">{batch?.batch_code || s.batch_id}</span>
                          {batch?.status && <Badge variant="outline" className="text-[10px]">{batch.status}</Badge>}
                        </div>
                        <Row label="Contributed weight" value={fmtKg(s.kilograms)} />
                        <Row label="Batch total" value={fmtKg(batch?.total_kilograms)} />
                        <Row label="Batch remaining" value={fmtKg(batch?.remaining_kilograms)} />
                        <Row label="EUDR traced" value={s.eudr_traced ? "Yes" : "No"} />
                      </div>
                    );
                  })
                )}
              </Step>

              <Step
                icon={ShoppingCart}
                title="6. Sales"
                status={`${data?.batchSales?.length || 0} sale link(s)`}
              >
                {(data?.batchSales || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">
                    Not yet sold — this coffee is still in stock.
                  </p>
                ) : (
                  data!.batchSales.map((bs: any) => {
                    const sale = data!.sales.find((s: any) => s.id === bs.sale_transaction_id);
                    const batch = data!.batches.find((b: any) => b.id === bs.batch_id);
                    return (
                      <div key={bs.id} className="py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {bs.customer_name || sale?.customer || "Unknown customer"}
                          </span>
                          {sale?.status && (
                            <Badge variant="outline" className="text-[10px]">{sale.status}</Badge>
                          )}
                        </div>
                        <Row label="Sale date" value={bs.sale_date || sale?.date || "—"} />
                        <Row label="From batch" value={batch?.batch_code || bs.batch_id} />
                        <Row label="Weight from this batch" value={fmtKg(bs.kilograms_deducted)} />
                        <Row label="Sale coffee type" value={sale?.coffee_type} />
                        <Row label="Total sale weight" value={fmtKg(sale?.weight)} />
                        <Row label="Unit price" value={fmtUgx(sale?.unit_price)} />
                        <Row label="Sale value" value={fmtUgx(sale?.total_amount)} />
                        <Row label="Truck / driver" value={[sale?.truck_details, sale?.driver_details].filter(Boolean).join(" · ") || "—"} />
                        <Row label="Sale ID" value={bs.sale_transaction_id} />
                      </div>
                    );
                  })
                )}
              </Step>

              <Separator className="my-2" />
              <p className="text-[11px] text-muted-foreground">
                Assessment ID: {assessment.id}
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentChainDialog;