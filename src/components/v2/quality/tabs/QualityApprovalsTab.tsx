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
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Inbox } from "lucide-react";
import { format } from "date-fns";

const money = (v: any) => `UGX ${Number(v || 0).toLocaleString()}`;

const QualityApprovalsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canApproveQualityPricing, reviewerName, reviewerEmail } = useQualityRole();

  const [selected, setSelected] = useState<any>(null);
  const [price, setPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["quality-manager-pending"],
    enabled: canApproveQualityPricing,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_assessments")
        .select("*")
        .eq("status", "pending_quality_manager")
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
      } else {
        update.status = "pending_admin_pricing";
        update.suggested_price = approvedPrice;
      }

      const { error } = await supabase.from("quality_assessments").update(update).eq("id", row.id);
      if (error) throw error;

      if (action === "rejected" && row.store_record_id) {
        await supabase.from("coffee_records").update({ status: "pending" }).eq("id", row.store_record_id);
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
            ? "Sent back to the quality team for re-assessment."
            : "Forwarded to admin for final pricing — the usual process continues.",
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Assessment — {selected?.batch_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Assessed by: <span className="font-medium">{selected.system_assessment_by || selected.assessed_by}</span></div>
                <div>Physical: <span className="font-medium">{selected.physical_assessment_by || "—"}</span></div>
                <div>Form No: <span className="font-medium">{selected.form_number || "—"}</span></div>
                <div>Moisture: <span className="font-medium">{selected.moisture}%</span></div>
                <div>G1/G2: <span className="font-medium">{selected.group1_defects}% / {selected.group2_defects}%</span></div>
                <div>Outturn: <span className="font-medium">{selected.outturn}%</span></div>
              </div>
              {selected.comments && (
                <p className="text-sm text-muted-foreground">Officer comments: {selected.comments}</p>
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
                   Approve & Send to Admin
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QualityApprovalsTab;
