import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { perDiemAwardable, type PerDiemRequest } from '@/lib/perDiemRequests';
import { sendPaymentReceipt } from "@/utils/sendPaymentReceipt";

const AwardPerDiemDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [workType, setWorkType] = useState("");

  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [requestId, setRequestId] = useState("");
  const { data: requests, error: requestsError } = useQuery({
    queryKey: ["pending-per-diem-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("per_diem_requests").select("*").eq("status", "pending").order("submitted_at");
      if (error) throw error;
      return (data as unknown as PerDiemRequest[]).filter(perDiemAwardable);
    },
    refetchInterval: 15000,
  });

  const { data: employees } = useQuery({
    queryKey: ["active-employees-for-perdiem"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email, department, position, phone, auth_user_id")
        .eq("status", "Active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: perDiemHistory } = useQuery({
    queryKey: ["per-diem-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("per_diem_awards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const awardMutation = useMutation({
    mutationFn: async () => {
      const emp = employees?.find((e) => e.id === selectedEmployee);
      if (!emp) throw new Error("Employee not found");
      const request = requests?.find(r => r.id === requestId);
      if (!request || !perDiemAwardable(request)) throw new Error("Select a submitted printed request");
      const reference = request.document_number;
      const { error: awardError } = await supabase.rpc("award_per_diem_request", { p_id: request.id });
      if (awardError) throw awardError;

      // 3. Send SMS notification
      if (emp.phone) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              phone: emp.phone,
              message: `Dear ${emp.name}, per diem of UGX ${parseFloat(amount).toLocaleString()} awarded. Reason: ${reason}. Ref: ${reference}. Added to your wallet. Great Agro Coffee.`,
              userName: emp.name,
              recipientEmail: emp.email,
              messageType: "per_diem_award",
            },
          });
        } catch (smsErr) {
          console.error("Per diem SMS failed:", smsErr);
        }
      }

      // 4. Send official payment receipt (PDF) via email + SMS link
      try {
        await sendPaymentReceipt({
          paymentType: 'general',
          paidTo: { name: emp.name, phone: emp.phone || '', email: emp.email || undefined },
          description: `Per Diem Award — ${reason}`,
          invoiceNumber: reference,
          amount: parseFloat(amount),
          charges: 0,
          total: parseFloat(amount),
          paymentMethod: 'Wallet Credit',
          transactionId: reference,
          paidOn: new Date().toISOString(),
          processedBy: employee?.name || 'HR',
          notes: 'Per diem credited to employee wallet.',
          recipientEmail: emp.email || undefined,
          recipientPhone: emp.phone || undefined,
        });
      } catch (receiptErr) {
        console.error('Per diem receipt failed:', receiptErr);
      }

      return { emp, reference };
    },
    onSuccess: ({ emp, reference }) => {
      toast({
        title: "Per Diem Awarded!",
        description: `UGX ${parseInt(amount).toLocaleString()} awarded to ${emp.name}. Ref: ${reference}.`,
        duration: 8000,
      });
      setOpen(false);
      setSelectedEmployee("");
      setAmount("");
      setReason("");
      setRefNumber("");
      setWorkType("");
      setRequestId("");
      queryClient.invalidateQueries({ queryKey: ["pending-per-diem-requests"] });
      queryClient.invalidateQueries({ queryKey: ["per-diem-history"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Award Per Diem
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Award Employee Per Diem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Submitted per diem request *</Label>
              <Select value={requestId} onValueChange={v => {
                const request = requests?.find(r => r.id === v);
                if (!request) return;
                setRequestId(v);
                setSelectedEmployee(request.employee_id);
                setRefNumber(request.document_number);
                setAmount(String(request.amount));
                setReason(request.form_data.purpose || "");
                setWorkType(request.form_data.workType || "other");
              }}>
                <SelectTrigger><SelectValue placeholder="Select printed request" /></SelectTrigger>
                <SelectContent>{requests?.map(r => <SelectItem key={r.id} value={r.id}>{r.employee_name} — {r.document_number}</SelectItem>)}</SelectContent>
              </Select>
              {requestsError && <p className="text-sm text-destructive">Unable to load submitted requests.</p>}
              {!requestsError && requests?.length === 0 && <p className="text-sm text-muted-foreground mt-2">No per diem requests awaiting award.</p>}
            </div>
            <div><Label>Printed form number</Label><Input value={refNumber} readOnly className="font-mono" /></div>
            <div><Label>Amount (UGX)</Label><Input value={amount} readOnly /></div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={reason}
                readOnly
                placeholder="e.g. Field visit to Kasese district"
              />
            </div>
            <Button
              onClick={() => awardMutation.mutate()}
              disabled={!requestId || !selectedEmployee || !workType || !amount || !reason || awardMutation.isPending}
              className="w-full"
            >
              {awardMutation.isPending ? "Awarding..." : "Award Per Diem"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Per Diem History */}
      {perDiemHistory && perDiemHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Recent Per Diem Awards</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {perDiemHistory.map((pd: any) => (
              <div key={pd.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div>
                  <p className="font-medium">{pd.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{pd.reason}</p>
                  <p className="text-xs text-muted-foreground">By {pd.awarded_by} — {format(new Date(pd.created_at), "dd MMM yyyy")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">UGX {Number(pd.amount).toLocaleString()}</p>
                  <Badge variant="default" className="text-xs">Awarded</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AwardPerDiemDialog;
