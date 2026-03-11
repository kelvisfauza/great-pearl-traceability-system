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

const AwardPerDiemDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      // 1. Insert per diem award record
      const { error: awardError } = await supabase.from("per_diem_awards").insert({
        employee_id: emp.id,
        employee_email: emp.email,
        employee_name: emp.name,
        amount: parseFloat(amount),
        reason,
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
          reference: `PERDIEM-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          metadata: {
            type: "per_diem",
            reason,
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
              message: `Dear ${emp.name}, you have been awarded a per diem of UGX ${parseFloat(amount).toLocaleString()}. Reason: ${reason}. The amount has been added to your wallet balance. Great Agro Coffee.`,
              userName: emp.name,
              messageType: "per_diem_award",
            },
          });
        } catch (smsErr) {
          console.error("Per diem SMS failed:", smsErr);
        }
      }

      return emp;
    },
    onSuccess: (emp) => {
      toast({
        title: "Per Diem Awarded!",
        description: `UGX ${parseInt(amount).toLocaleString()} per diem awarded to ${emp.name}. Amount added to wallet and SMS sent.`,
        duration: 8000,
      });
      setOpen(false);
      setSelectedEmployee("");
      setAmount("");
      setReason("");
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
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
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
