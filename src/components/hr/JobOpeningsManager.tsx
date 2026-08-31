import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const emptyForm = {
  title: "", department: "", location: "Kasese, Uganda", employment_type: "Full-time",
  summary: "", responsibilities: "", requirements: "", salary_range: "", closing_date: "",
};

const JobOpeningsManager = () => {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: openings = [], isLoading } = useQuery({
    queryKey: ["job-openings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_openings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("job_openings").insert({
        title: form.title.trim(),
        department: form.department.trim() || null,
        location: form.location.trim() || null,
        employment_type: form.employment_type.trim() || null,
        summary: form.summary.trim() || null,
        responsibilities: form.responsibilities.trim() || null,
        requirements: form.requirements.trim() || null,
        salary_range: form.salary_range.trim() || null,
        closing_date: form.closing_date || null,
        created_by: employee?.email || "system",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job opening published to the website");
      setForm({ ...emptyForm });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["job-openings-admin"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to publish opening"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_open }: { id: string; is_open: boolean }) => {
      const { error } = await supabase
        .from("job_openings")
        .update({ is_open, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-openings-admin"] }),
    onError: (e: any) => toast.error(e.message || "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_openings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opening removed");
      queryClient.invalidateQueries({ queryKey: ["job-openings-admin"] });
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Job Openings</CardTitle>
          <CardDescription>Vacancies published on the public website careers page.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />New opening</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : openings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No openings yet. Publish one to show it on the website.</p>
        ) : (
          <div className="space-y-3">
            {openings.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{o.title}</span>
                    <Badge variant={o.is_open ? "default" : "secondary"}>{o.is_open ? "Open" : "Closed"}</Badge>
                    {o.employment_type && <Badge variant="outline">{o.employment_type}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[o.department, o.location, o.closing_date ? `Closes ${o.closing_date}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={o.is_open} onCheckedChange={(v) => toggleMutation.mutate({ id: o.id, is_open: v })} />
                    <span className="text-xs text-muted-foreground">Visible</span>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Delete this opening?")) deleteMutation.mutate(o.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Publish a job opening</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job title *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Quality Analyst" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Employment type</Label>
                <Input value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)} placeholder="Full-time / Contract" />
              </div>
              <div className="space-y-2">
                <Label>Closing date</Label>
                <Input type="date" value={form.closing_date} onChange={(e) => set("closing_date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Responsibilities</Label>
              <Textarea rows={4} value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea rows={4} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Salary range (optional)</Label>
              <Input value={form.salary_range} onChange={(e) => set("salary_range", e.target.value)} placeholder="UGX 600,000 – 900,000" />
            </div>
            <Button className="w-full" disabled={!form.title.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Publishing…" : "Publish opening"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default JobOpeningsManager;
