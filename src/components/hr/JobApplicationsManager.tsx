import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Search, FileText, Phone, Send, Eye, Pencil, Trash2, Upload, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const STATUSES = ["Pending", "Reviewed", "Interview Scheduled", "Interviewed", "Shortlisted", "Accepted", "Rejected"] as const;

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Reviewed: "bg-blue-100 text-blue-800",
  "Interview Scheduled": "bg-purple-100 text-purple-800",
  Interviewed: "bg-indigo-100 text-indigo-800",
  Shortlisted: "bg-cyan-100 text-cyan-800",
  Accepted: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

const STATUS_SMS_MESSAGES: Record<string, (name: string, ref: string, extra?: string) => string> = {
  Pending: (name, ref) =>
    `Dear ${name}, your job application has been received under Ref: ${ref} and is currently PENDING review. Thank you for your interest in Great Pearl Coffee.`,
  Reviewed: (name, ref) =>
    `Dear ${name}, your job application (Ref: ${ref}) has been REVIEWED. We will contact you with further updates. Great Pearl Coffee.`,
  "Interview Scheduled": (name, ref, extra) =>
    `Dear ${name}, you have been scheduled for an INTERVIEW for your application (Ref: ${ref}).${extra ? " " + extra : ""} Please confirm your availability. Great Pearl Coffee.`,
  Interviewed: (name, ref) =>
    `Dear ${name}, thank you for attending the interview for your application (Ref: ${ref}). We will communicate the outcome shortly. Great Pearl Coffee.`,
  Shortlisted: (name, ref) =>
    `Dear ${name}, congratulations! You have been SHORTLISTED for the position you applied for (Ref: ${ref}). Further details will follow. Great Pearl Coffee.`,
  Accepted: (name, ref) =>
    `Dear ${name}, we are pleased to inform you that your application (Ref: ${ref}) has been ACCEPTED. Welcome to Great Pearl Coffee! We will contact you with onboarding details.`,
  Rejected: (name, ref) =>
    `Dear ${name}, we regret to inform you that your application (Ref: ${ref}) was not successful at this time. We appreciate your interest in Great Pearl Coffee.`,
};

const JobApplicationsManager = () => {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [uploading, setUploading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    applicant_name: "",
    phone: "",
    job_applied_for: "",
    notes: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["job-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateRefCode = async () => {
    const { count } = await supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true });
    const num = (count || 0) + 1;
    return `GPCJA${String(num).padStart(3, "0")}`;
  };

  const sendSms = async (phone: string, message: string, name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone, message, userName: name, messageType: "job_application" },
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("SMS send failed:", e);
      throw e;
    }
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const refCode = await generateRefCode();
      let cvUrl = null;
      let cvFilename = null;

      if (cvFile) {
        setUploading(true);
        const ext = cvFile.name.split(".").pop();
        const path = `${refCode}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("job-applications")
          .upload(path, cvFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("job-applications").getPublicUrl(path);
        cvUrl = urlData.publicUrl;
        cvFilename = cvFile.name;
        setUploading(false);
      }

      const { data, error } = await supabase.from("job_applications").insert({
        ref_code: refCode,
        applicant_name: form.applicant_name.trim(),
        phone: form.phone.trim(),
        job_applied_for: form.job_applied_for.trim(),
        notes: form.notes.trim() || null,
        cv_url: cvUrl,
        cv_filename: cvFilename,
        status: "Pending",
        created_by: employee?.email || "system",
      }).select().single();

      if (error) throw error;

      // Send SMS notification
      const smsMessage = STATUS_SMS_MESSAGES.Pending(form.applicant_name.trim(), refCode);
      try {
        await sendSms(form.phone.trim(), smsMessage, form.applicant_name.trim());
        toast.success("SMS notification sent to applicant");
      } catch {
        toast.warning("Application saved but SMS notification failed");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      setShowAddDialog(false);
      setForm({ applicant_name: "", phone: "", job_applied_for: "", notes: "" });
      setCvFile(null);
      toast.success("Job application added successfully");
    },
    onError: (e: any) => {
      setUploading(false);
      toast.error("Failed to add application: " + e.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedApp || !newStatus) return;

      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus, notes: statusNote || selectedApp.notes })
        .eq("id", selectedApp.id);
      if (error) throw error;

      // Send SMS for status update
      const msgFn = STATUS_SMS_MESSAGES[newStatus];
      if (msgFn) {
        const smsMessage = msgFn(selectedApp.applicant_name, selectedApp.ref_code, statusNote || undefined);
        try {
          await sendSms(selectedApp.phone, smsMessage, selectedApp.applicant_name);
          toast.success("Status SMS sent to applicant");
        } catch {
          toast.warning("Status updated but SMS failed");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      setShowUpdateDialog(false);
      setSelectedApp(null);
      setNewStatus("");
      setStatusNote("");
      toast.success("Application status updated");
    },
    onError: (e: any) => toast.error("Failed to update: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast.success("Application deleted");
    },
    onError: (e: any) => toast.error("Failed to delete: " + e.message),
  });

  const filtered = applications.filter((app: any) => {
    const matchesSearch =
      app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.ref_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_applied_for.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Applications
              </CardTitle>
              <CardDescription>Manage job applications, track statuses, and notify applicants via SMS</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Add Application</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>New Job Application</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Applicant Name *</Label>
                    <Input value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} placeholder="Full name" />
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0781234567" />
                  </div>
                  <div>
                    <Label>Job Applied For *</Label>
                    <Input value={form.job_applied_for} onChange={(e) => setForm({ ...form, job_applied_for: e.target.value })} placeholder="e.g. Store Manager" />
                  </div>
                  <div>
                    <Label>CV / Application (optional)</Label>
                    <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." rows={3} />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => addMutation.mutate()}
                    disabled={!form.applicant_name || !form.phone || !form.job_applied_for || addMutation.isPending}
                  >
                    {addMutation.isPending ? (uploading ? "Uploading CV..." : "Saving...") : "Save & Notify Applicant"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, ref, or position..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground mt-2">Loading applications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No job applications found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((app: any) => (
                <div key={app.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{app.applicant_name}</span>
                        <Badge variant="outline" className="font-mono text-xs">{app.ref_code}</Badge>
                        <Badge className={statusColors[app.status] || "bg-gray-100 text-gray-800"}>{app.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Position: <span className="font-medium text-foreground">{app.job_applied_for}</span>
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.phone}</span>
                        <span>{format(new Date(app.created_at), "MMM dd, yyyy")}</span>
                        {app.cv_url && (
                          <a href={app.cv_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />CV: {app.cv_filename || "View"}
                          </a>
                        )}
                      </div>
                      {app.notes && <p className="text-xs text-muted-foreground mt-1">Notes: {app.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedApp(app);
                          setNewStatus(app.status);
                          setStatusNote(app.notes || "");
                          setShowUpdateDialog(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />Update
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm("Delete this application?")) deleteMutation.mutate(app.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Applicant</p>
                <p className="font-semibold">{selectedApp.applicant_name} ({selectedApp.ref_code})</p>
              </div>
              <div>
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes / Interview Details</Label>
                <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="e.g. Interview on Monday 10am at office..." rows={3} />
                <p className="text-xs text-muted-foreground mt-1">
                  For interview scheduling, include date/time here - it will be included in the SMS.
                </p>
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-xs">
                <p className="font-medium mb-1 flex items-center gap-1"><Send className="h-3 w-3" />SMS Preview:</p>
                <p>{STATUS_SMS_MESSAGES[newStatus]?.(selectedApp.applicant_name, selectedApp.ref_code, statusNote || undefined)}</p>
              </div>
              <Button
                className="w-full"
                onClick={() => updateStatusMutation.mutate()}
                disabled={updateStatusMutation.isPending || newStatus === selectedApp.status}
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update & Send SMS"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobApplicationsManager;
