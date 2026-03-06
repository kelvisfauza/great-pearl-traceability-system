import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, ArrowLeft, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const leaveTypes = ["Annual Leave", "Sick Leave", "Maternity Leave", "Paternity Leave", "Compassionate Leave", "Study Leave", "Unpaid Leave"];

const LeaveManagement = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Fetch all employees
  const { data: employees } = useQuery({
    queryKey: ["hr-employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email, department, position")
        .eq("status", "Active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch leave requests from approval_requests
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("type", "leave")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Create leave request
  const createLeave = useMutation({
    mutationFn: async () => {
      const emp = employees?.find((e) => e.id === selectedEmployee);
      if (!emp) throw new Error("Employee not found");

      const days = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const { error } = await supabase.from("approval_requests").insert({
        type: "leave",
        title: `${leaveType} - ${emp.name}`,
        description: reason || `${leaveType} request`,
        department: emp.department,
        requestedby: emp.email,
        requestedby_name: emp.name,
        requestedby_position: emp.position,
        daterequested: new Date().toISOString(),
        amount: days,
        priority: "medium",
        status: "Pending Finance",
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
      toast({ title: "Leave request created", description: "The leave request has been submitted." });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hr-v2-stats"] });
      setDialogOpen(false);
      setSelectedEmployee("");
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Approve/Reject
  const updateLeave = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("approval_requests")
        .update({
          status,
          admin_approved: status === "approved",
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: employee?.email || "admin",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.status === "approved" ? "Leave Approved" : "Leave Rejected" });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hr-v2-stats"] });
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/v2/hr">
                <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
              </Link>
              <Calendar className="h-8 w-8 text-indigo-600" />
              <h1 className="text-4xl font-bold text-foreground">Leave Management</h1>
            </div>
            <p className="text-muted-foreground text-lg ml-14">Create and manage employee leave requests</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* New Leave Request */}
            <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> New Leave Request</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Leave Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Employee</Label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>
                          {employees?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.name} — {e.department}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                      <Label>Reason (optional)</Label>
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for leave..." className="mt-1" />
                    </div>
                    <Button
                      onClick={() => createLeave.mutate()}
                      disabled={!selectedEmployee || !leaveType || !startDate || !endDate || createLeave.isPending}
                      className="w-full"
                    >
                      {createLeave.isPending ? "Submitting..." : "Submit Leave Request"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Leave Requests List */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Leave Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : leaveRequests && leaveRequests.length > 0 ? (
                  <div className="space-y-3">
                    {leaveRequests.map((req) => {
                      const details = req.details as any;
                      return (
                        <div key={req.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{req.requestedby_name || req.requestedby}</span>
                              {getStatusBadge(req.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {details?.leave_type || req.title} • {details?.start_date ? format(new Date(details.start_date), "dd MMM yyyy") : ""} → {details?.end_date ? format(new Date(details.end_date), "dd MMM yyyy") : ""} ({req.amount} day{req.amount !== 1 ? "s" : ""})
                            </p>
                            {details?.reason && <p className="text-xs text-muted-foreground mt-1">{details.reason}</p>}
                            <p className="text-xs text-muted-foreground">{req.department} • {format(new Date(req.created_at), "dd MMM yyyy HH:mm")}</p>
                          </div>
                          {req.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => updateLeave.mutate({ id: req.id, status: "approved" })}
                                disabled={updateLeave.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => updateLeave.mutate({ id: req.id, status: "rejected" })}
                                disabled={updateLeave.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No leave requests found. Create one using the button above.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
