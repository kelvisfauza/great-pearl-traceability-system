import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, History, Search, Eye, Pencil, Save } from "lucide-react";
import { format, subDays } from "date-fns";

const PAGE_SIZE = 50;

const AssessmentHistoryTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];
  const monthAgo = subDays(new Date(), 60).toISOString().split("T")[0];

  // Filter inputs (do NOT trigger query until applied)
  const [fromInput, setFromInput] = useState(monthAgo);
  const [toInput, setToInput] = useState(today);
  const [batchInput, setBatchInput] = useState("");
  const [statusInput, setStatusInput] = useState<string>("all");

  // Active filters (applied)
  const [filters, setFilters] = useState<{ from: string; to: string; batch: string; status: string } | null>(null);
  const [page, setPage] = useState(0);

  const [viewing, setViewing] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const isAdmin = (employee?.role || "").toLowerCase() === "administrator" ||
    (employee?.role || "").toLowerCase() === "admin" ||
    (employee?.role || "").toLowerCase().includes("quality");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["assessment-history", filters, page],
    enabled: !!filters,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (!filters) return { rows: [], count: 0 };
      let q = supabase
        .from("quality_assessments")
        .select("*", { count: "exact" })
        .gte("date_assessed", filters.from)
        .lte("date_assessed", filters.to)
        .order("date_assessed", { ascending: false })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (filters.batch.trim()) q = q.ilike("batch_number", `%${filters.batch.trim()}%`);
      if (filters.status !== "all") q = q.eq("status", filters.status);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data || [], count: count || 0 };
    },
  });

  const applyFilters = () => {
    setPage(0);
    setFilters({ from: fromInput, to: toInput, batch: batchInput, status: statusInput });
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setEditForm({
      moisture: a.moisture ?? 0,
      outturn: a.outturn ?? 0,
      group1_defects: a.group1_defects ?? 0,
      group2_defects: a.group2_defects ?? 0,
      pods: a.pods ?? 0,
      husks: a.husks ?? 0,
      fm: a.fm ?? 0,
      stones: a.stones ?? 0,
      below12: a.below12 ?? 0,
      final_price: a.final_price ?? 0,
      suggested_price: a.suggested_price ?? 0,
      comments: a.comments ?? "",
      quality_note: a.quality_note ?? "",
    });
  };

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const payload: any = {
        ...editForm,
        updated_at: new Date().toISOString(),
        comments: `${editForm.comments || ""}\n[Edited by ${employee?.email} on ${new Date().toISOString()}]`.trim(),
      };
      const { error } = await supabase.from("quality_assessments").update(payload).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Assessment updated." });
      queryClient.invalidateQueries({ queryKey: ["assessment-history"] });
      setEditing(null);
      refetch();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Assessment History & Archive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} />
            </div>
            <div>
              <Label>Batch #</Label>
              <Input placeholder="e.g. B340" value={batchInput} onChange={(e) => setBatchInput(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={statusInput} onChange={(e) => setStatusInput(e.target.value)}>
                <option value="all">All</option>
                <option value="assessed">Assessed</option>
                <option value="approved">Approved</option>
                <option value="submitted_to_finance">Submitted to Finance</option>
                <option value="pending_admin_pricing">Pending Admin Pricing</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={applyFilters} disabled={isFetching} className="w-full">
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search
              </Button>
            </div>
          </div>

          {!filters && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pick a date range and click <strong>Search</strong>. Records are loaded only on demand to keep the system fast.
            </p>
          )}

          {filters && (
            <>
              <div className="text-sm text-muted-foreground">
                {isFetching ? "Loading…" : `${data?.count ?? 0} record(s) found`}
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Moisture</TableHead>
                      <TableHead>Outturn</TableHead>
                      <TableHead>Final Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assessed By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.rows.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{a.date_assessed ? format(new Date(a.date_assessed), "PP") : "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{a.batch_number}</TableCell>
                        <TableCell>{a.moisture}%</TableCell>
                        <TableCell>{a.outturn}%</TableCell>
                        <TableCell>{a.final_price ? `UGX ${Number(a.final_price).toLocaleString()}` : "—"}</TableCell>
                        <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                        <TableCell className="text-xs">{a.assessed_by}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => setViewing(a)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data && data.rows.length === 0 && !isFetching && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No records in this range</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assessment: {viewing?.batch_number}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(viewing).map(([k, v]) => (
                <div key={k} className="border rounded p-2">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-medium break-words">{v === null || v === undefined || v === "" ? "—" : String(v)}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Assessment: {editing?.batch_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {["moisture", "outturn", "group1_defects", "group2_defects", "pods", "husks", "fm", "stones", "below12", "final_price", "suggested_price"].map((k) => (
                <div key={k}>
                  <Label className="text-xs">{k}</Label>
                  <Input type="number" step="0.01" value={editForm[k] ?? 0}
                    onChange={(e) => setEditForm((p: any) => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
            <div>
              <Label>Quality Note</Label>
              <Textarea value={editForm.quality_note || ""} onChange={(e) => setEditForm((p: any) => ({ ...p, quality_note: e.target.value }))} />
            </div>
            <div>
              <Label>Comments (edit reason will be appended)</Label>
              <Textarea value={editForm.comments || ""} onChange={(e) => setEditForm((p: any) => ({ ...p, comments: e.target.value }))} placeholder="Reason for edit…" />
            </div>
            <Button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} className="w-full">
              {saveEdit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentHistoryTab;