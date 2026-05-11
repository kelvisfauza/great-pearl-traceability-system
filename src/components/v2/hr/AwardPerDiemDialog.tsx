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
import { Wallet, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AwardPerDiemDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateRef = (empName?: string) => {
    const initials = (empName || "EMP")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PD-${format(new Date(), "yyyyMMdd")}-${initials}-${rand}`;
  };

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
      const reference = refNumber.trim() || generateRef(emp.name);

      // 1. Insert per diem award record
      const { error: awardError } = await supabase.from("per_diem_awards").insert({
        employee_id: emp.id,
        employee_email: emp.email,
        employee_name: emp.name,
        amount: parseFloat(amount),
        reason: `${reason} (Ref: ${reference})`,
        awarded_by: employee?.name || "HR",
      });
      if (awardError) throw awardError;

      // 2. Add to ledger so it reflects in wallet balance
      const userId = emp.auth_user_id;
      if (userId) {
        const { error: ledgerError } = await supabase.from("ledger_entries").insert({
          user_id: userId,
          entry_type: "DEPOSIT",
          amount: parseFloat(amount),
          reference,
          metadata: {
            type: "per_diem",
            reason,
            ref_number: reference,
            awarded_by: employee?.name || "HR",
            employee_name: emp.name,
          },
        });
        if (ledgerError) throw ledgerError;
      }

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
              <Label>Employee</Label>
              <Select
                value={selectedEmployee}
                onValueChange={(v) => {
                  setSelectedEmployee(v);
                  const emp = employees?.find((e) => e.id === v);
                  if (!refNumber.trim()) setRefNumber(generateRef(emp?.name));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} — {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Reference Number (Requisition Ref)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => {
                    const emp = employees?.find((e) => e.id === selectedEmployee);
                    setRefNumber(generateRef(emp?.name));
                  }}
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
              <Input
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="Auto-generated, or paste from printed requisition"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used on wallet ledger, SMS and history. Edit to match a printed requisition form.
              </p>
            </div>
            <div>
              <Label>Amount (UGX)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 30000"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Field visit to Kasese district"
              />
            </div>
            <Button
              onClick={() => awardMutation.mutate()}
              disabled={!selectedEmployee || !amount || !reason || awardMutation.isPending}
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
