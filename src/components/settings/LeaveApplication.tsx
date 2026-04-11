import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const leaveTypes = ["Annual Leave", "Sick Leave", "Maternity Leave", "Paternity Leave", "Compassionate Leave", "Study Leave", "Unpaid Leave"];

const LeaveApplication = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Fetch my leave requests
  const { data: myLeaves, isLoading } = useQuery({
    queryKey: ["my-leave-requests", employee?.email],
    queryFn: async () => {
      if (!employee?.email) return [];
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("type", "leave")
        .eq("requestedby", employee.email)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employee?.email,
  });

  // Apply for leave
  const applyLeave = useMutation({
    mutationFn: async () => {
      if (!employee) throw new Error("Not authenticated");

      const days = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const { error } = await supabase.from("approval_requests").insert({
        type: "leave",
        title: `${leaveType} - ${employee.name}`,
        description: reason || `${leaveType} request`,
        department: employee.department,
        requestedby: employee.email,
        requestedby_name: employee.name,
        requestedby_position: employee.position,
        daterequested: new Date().toISOString(),
        amount: days,
        priority: "medium",
        status: "Pending Admin",
        details: {
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          days,
          reason,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Leave Applied", description: "Your leave request has been submitted for approval." });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      setDialogOpen(false);
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Management
            </CardTitle>
            <CardDescription>Apply for leave and track your requests</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Apply for Leave</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for leave..." className="mt-1" />
                </div>
                <Button
                  onClick={() => applyLeave.mutate()}
                  disabled={!leaveType || !startDate || !endDate || applyLeave.isPending}
                  className="w-full"
                >
                  {applyLeave.isPending ? "Submitting..." : "Submit Leave Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        ) : myLeaves && myLeaves.length > 0 ? (
          <div className="space-y-3">
            {myLeaves.map((req) => {
              const details = req.details as any;
              return (
                <div key={req.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{details?.leave_type || req.title}</span>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {details?.start_date ? format(new Date(details.start_date), "dd MMM yyyy") : ""} → {details?.end_date ? format(new Date(details.end_date), "dd MMM yyyy") : ""} ({req.amount} day{req.amount !== 1 ? "s" : ""})
                    </p>
                    {details?.reason && <p className="text-xs text-muted-foreground">{details.reason}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4 text-sm">No leave requests yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveApplication;
