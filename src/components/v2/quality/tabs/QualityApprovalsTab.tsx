import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQualityRole } from "@/hooks/useQualityRole";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Inbox, FileText, ExternalLink, Printer } from "lucide-react";
import { format } from "date-fns";
import GRNPrintModal from "@/components/quality/GRNPrintModal";

const money = (v: any) => `UGX ${Number(v || 0).toLocaleString()}`;
const BUCKET = "quality-analysis-files";

const Field = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-md border bg-muted/30 px-2 py-1.5">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium break-words">{value === null || value === undefined || value === "" ? "—" : String(value)}</p>
  </div>
);

const QualityApprovalsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canApproveQualityPricing, reviewerName, reviewerEmail } = useQualityRole();

  const [selected, setSelected] = useState<any>(null);
  const [price, setPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [grnData, setGrnData] = useState<any>(null);
  const [grnLoadingId, setGrnLoadingId] = useState<string | null>(null);

  /** Build & open the GRN for an approved assessment (QM or admin). */
  const printGRN = async (batchNumber: string, logId: string) => {
    setGrnLoadingId(logId);
    try {
      const { data: assessment } = await supabase
        .from("quality_assessments")
        .select("*")
        .eq("batch_number", batchNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!assessment) throw new Error("Assessment not found for this batch");
      if (["pending_quality_manager", "rejected", "PERMANENTLY_REJECTED"].includes(String((assessment as any).status || ""))) {
        throw new Error("GRN is only printable after approval");
      }

      const { data: record } = (assessment as any).store_record_id
        ? await supabase
            .from("coffee_records")
            .select("*")
            .eq("id", (assessment as any).store_record_id)
            .maybeSingle()
        : ({ data: null } as any);

      const a: any = assessment;
      const cr: any = record || {};
      setGrnData({
        grnNumber: `GRN-${a.batch_number}`,
        batchNumber: a.batch_number,
        inventoryBatchId: a.batch_number,
        supplierName: cr.supplier_name || "—",
        coffeeType: cr.coffee_type || "—",
        qualityAssessment: "APPROVED",
        numberOfBags: cr.bags || 0,
        totalKgs: cr.kilograms || 0,
        unitPrice: a.final_price ?? a.suggested_price ?? 0,
        assessedBy: a.assessed_by,
        physicalAssessmentBy: a.physical_assessment_by || undefined,
        inputBy: cr.created_by || undefined,
        deliveryDate: cr.date || cr.created_at || undefined,
        assessmentDate: a.date_assessed || a.created_at || undefined,
        createdAt: new Date().toISOString(),
        moisture: a.moisture,
        group1_defects: a.group1_defects,
        group2_defects: a.group2_defects,
        pods: a.pods,
        husks: a.husks,
        outturn: a.outturn,
        calculatorComments: a.qm_notes || a.comments || undefined,
      });
    } catch (e: any) {
      toast({ title: "Cannot print GRN", description: e.message, variant: "destructive" });
    } finally {
      setGrnLoadingId(null);
    }
  };

  const { data: reviewDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["qm-review-detail", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const row = selected;
      const [recordRes, fileRes, formRes] = await Promise.all([
        row.store_record_id
          ? supabase.from("coffee_records").select("*").eq("id", row.store_record_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        row.analysis_file_id
          ? (supabase as any).from("quality_analysis_files").select("*").eq("id", row.analysis_file_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        row.form_number
          ? (supabase as any)
              .from("quality_analysis_forms")
              .select("*")
              .eq("form_number", row.form_number)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      return {
        record: (recordRes as any)?.data || null,
        file: (fileRes as any)?.data || null,
        form: (formRes as any)?.data || null,
      };
    },
  });

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: "Cannot open file", description: error?.message || "No signed URL", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["quality-manager-pending"],
    enabled: canApproveQualityPricing,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_assessments")
        .select("*")
        .in("status", ["pending_quality_manager", "assessed"])
        .is("qm_action", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: log = [] } = useQuery({
    queryKey: ["quality-manager-approval-log"],
    enabled: canApproveQualityPricing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_manager_approvals" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ row, action }: { row: any; action: "approved" | "adjusted" | "rejected" }) => {
      const approvedPrice = action === "rejected" ? null : Number(price || row.suggested_price || 0);

      const update: any = {
        qm_reviewed_by: reviewerName || reviewerEmail,
        qm_reviewed_at: new Date().toISOString(),
        qm_action: action,
        qm_notes: notes || null,
        qm_original_price: row.qm_original_price ?? row.suggested_price,
      };

      if (action === "rejected") {
        update.status = "rejected";
        update.reject_final = true;
        update.final_price = 0;
      } else {
        // Quality Manager approval is final — lot is ready for finance and downstream processes
        update.status = "approved";
        update.suggested_price = approvedPrice;
        update.final_price = approvedPrice;
        update.quality_note = notes || row.quality_note || null;
      }

      const { error } = await supabase.from("quality_assessments").update(update).eq("id", row.id);
      if (error) throw error;

      if (row.store_record_id) {
        if (action === "rejected") {
          // Rejected lots go to the Admin rejected-lots (discretion buy) queue
          await supabase.from("coffee_records").update({ status: "QUALITY_REJECTED" }).eq("id", row.store_record_id);
        } else {
          const { data: record } = await supabase
            .from("coffee_records")
            .select("id, supplier_name, coffee_type, kilograms, bags, supplier_id")
            .eq("id", row.store_record_id)
            .maybeSingle();

          await supabase.from("coffee_records").update({ status: "inventory" }).eq("id", row.store_record_id);

          if (record) {
            await supabase.from("finance_coffee_lots").insert({
              quality_assessment_id: row.id,
              coffee_record_id: row.store_record_id,
              supplier_id: record.supplier_id,
              assessed_by: row.assessed_by,
              assessed_at: new Date().toISOString(),
              quality_json: {
                moisture_content: row.moisture,
                group1_percentage: row.group1_defects,
                group2_percentage: row.group2_defects,
                pods_percentage: row.pods,
                husks_percentage: row.husks,
                fm_percentage: row.fm,
                outturn_percentage: row.outturn,
                comments: row.comments,
              },
              unit_price_ugx: approvedPrice,
              quantity_kg: record.kilograms,
              finance_status: "READY_FOR_FINANCE",
            } as any);
          }
        }
      }

      const { error: logError } = await supabase.from("quality_manager_approvals" as any).insert({
        assessment_id: row.id,
        batch_number: row.batch_number,
        action,
        reviewer_email: reviewerEmail,
        reviewer_name: reviewerName,
        original_price: row.qm_original_price ?? row.suggested_price,
        approved_price: approvedPrice,
        notes: notes || null,
      } as any);
      if (logError) throw logError;
    },
    onSuccess: (_d, vars) => {
      toast({
        title:
          vars.action === "rejected"
            ? "Assessment rejected"
            : vars.action === "adjusted"
            ? "Price adjusted by Quality Manager"
            : "Quality Manager approval complete",
        description:
          vars.action === "rejected"
            ? "Sent to Admin as a rejected lot for discretion review."
            : "Lot approved and released to Finance, inventory and downstream processes.",
      });
      setSelected(null);
      setPrice("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["quality-manager-pending"] });
      queryClient.invalidateQueries({ queryKey: ["quality-manager-approval-log"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-history"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!canApproveQualityPricing) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Only the Head of Quality can review submitted assessments.
        </CardContent>
      </Card>
    );
  }

  const openReview = (row: any) => {
    setSelected(row);
    setPrice(String(row.suggested_price ?? ""));
    setNotes("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Pending Quality Approvals
            <Badge variant="secondary">{pending.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : pending.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Inbox className="h-6 w-6" />
              No assessments awaiting your approval.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Assessed By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Moisture</TableHead>
                    <TableHead>G1 / G2</TableHead>
                    <TableHead>Outturn</TableHead>
                    <TableHead>Suggested Price</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.batch_number}
                        {row.reject_final && <Badge variant="destructive" className="ml-2">Rejected lot</Badge>}
                      </TableCell>
                      <TableCell>{row.system_assessment_by || row.assessed_by}</TableCell>
                      <TableCell>{row.date_assessed}</TableCell>
                      <TableCell>{row.moisture}%</TableCell>
                      <TableCell>{row.group1_defects}% / {row.group2_defects}%</TableCell>
                      <TableCell>{row.outturn}%</TableCell>
                      <TableCell>{money(row.suggested_price)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openReview(row)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval Records</CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">GRN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell>{r.batch_number}</TableCell>
                      <TableCell>
                        <Badge variant={r.action === "rejected" ? "destructive" : "secondary"}>{r.action}</Badge>
                      </TableCell>
                      <TableCell>{r.reviewer_name || r.reviewer_email}</TableCell>
                      <TableCell>{money(r.original_price)}</TableCell>
                      <TableCell>{r.approved_price != null ? money(r.approved_price) : "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{r.notes || "—"}</TableCell>
                      <TableCell className="text-right">
                        {r.action === "rejected" ? (
                          "—"
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={grnLoadingId === r.id}
                            onClick={() => printGRN(r.batch_number, r.id)}
                          >
                            {grnLoadingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><Printer className="h-4 w-4 mr-1" /> Print GRN</>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Assessment — {selected?.batch_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {detailLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading full report…
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Lot & delivery</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Field label="Batch" value={selected.batch_number} />
                  <Field label="Supplier" value={reviewDetail?.record?.supplier_name || selected.supplier_name} />
                  <Field label="Coffee type" value={reviewDetail?.record?.coffee_type || selected.coffee_type} />
                  <Field label="Kilograms" value={reviewDetail?.record?.kilograms ?? selected.kilograms} />
                  <Field label="Bags" value={reviewDetail?.record?.bags} />
                  <Field label="Date assessed" value={selected.date_assessed} />
                  <Field label="Store status" value={reviewDetail?.record?.status} />
                  <Field label="Form No" value={selected.form_number} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Quality parameters</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Field label="Moisture" value={`${selected.moisture ?? "—"}%`} />
                  <Field label="Group 1 defects" value={`${selected.group1_defects ?? "—"}%`} />
                  <Field label="Group 2 defects" value={`${selected.group2_defects ?? "—"}%`} />
                  <Field label="Outturn" value={`${selected.outturn ?? "—"}%`} />
                  <Field label="Pods" value={selected.pods} />
                  <Field label="Husks" value={selected.husks} />
                  <Field label="Foreign matter" value={selected.fm} />
                  <Field label="Below screen 12" value={selected.below12 ?? selected.below_screen_12} />
                  <Field label="Stones" value={selected.stones} />
                  <Field label="Discretion" value={selected.discretion} />
                  <Field label="Cup taste" value={selected.cup_taste ?? selected.cupping_score} />
                  <Field label="Clean %" value={selected.clean_percentage} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Pricing & personnel</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Field label="Reference price" value={money(selected.reference_price)} />
                  <Field label="Suggested price" value={money(selected.suggested_price)} />
                  <Field label="Assessed by (system)" value={selected.system_assessment_by || selected.assessed_by} />
                  <Field label="Physical assessment by" value={selected.physical_assessment_by} />
                </div>
              </div>

              {(selected.comments || selected.quality_note) && (
                <div className="rounded-md border p-3 text-sm space-y-1">
                  {selected.comments && <p><span className="text-muted-foreground">Officer comments: </span>{selected.comments}</p>}
                  {selected.quality_note && <p><span className="text-muted-foreground">Quality note: </span>{selected.quality_note}</p>}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Attached analysis file</p>
                {reviewDetail?.file ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium truncate flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0" /> {reviewDetail.file.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reviewDetail.file.supplier_name} • {reviewDetail.file.analysis_date}
                        {reviewDetail.file.verification_code ? ` • Code ${reviewDetail.file.verification_code}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openFile(reviewDetail.file.file_path)}>
                      <ExternalLink className="h-4 w-4 mr-1" /> View
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No stamped analysis file attached to this lot.</p>
                )}
              </div>

              {reviewDetail?.form && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Saved analysis form {reviewDetail.form.form_number}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Field label="Moisture" value={reviewDetail.form.moisture} />
                    <Field label="Group 1" value={reviewDetail.form.group1_defects} />
                    <Field label="Group 2" value={reviewDetail.form.group2_defects} />
                    <Field label="Outturn" value={reviewDetail.form.outturn} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Approved Unit Price (UGX/kg)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Submitted price: {money(selected.qm_original_price ?? selected.suggested_price)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Review notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for adjustment or rejection" />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="destructive"
                  disabled={review.isPending}
                  onClick={() => {
                    if (!notes.trim()) {
                      toast({ title: "Notes required", description: "Give a reason for rejection.", variant: "destructive" });
                      return;
                    }
                    review.mutate({ row: selected, action: "rejected" });
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button
                  disabled={review.isPending}
                  onClick={() => {
                    const original = Number(selected.qm_original_price ?? selected.suggested_price ?? 0);
                    const action = Number(price || 0) !== original ? "adjusted" : "approved";
                    review.mutate({ row: selected, action });
                  }}
                >
                  {review.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                   Approve & Release to Finance
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GRNPrintModal open={!!grnData} onClose={() => setGrnData(null)} grnData={grnData} />
    </div>
  );
};

export default QualityApprovalsTab;
