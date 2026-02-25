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
import { Gift, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AllocateBonusDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ["active-employees-for-bonus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email, department, position")
        .eq("status", "Active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: bonusHistory } = useQuery({
    queryKey: ["bonus-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bonuses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const emp = employees?.find((e) => e.id === selectedEmployee);
      if (!emp) throw new Error("Employee not found");

      const { error } = await supabase.from("bonuses").insert({
        employee_id: emp.id,
        employee_email: emp.email,
        employee_name: emp.name,
        amount: parseFloat(amount),
        reason,
        allocated_by: employee?.name || "HR",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ 
        title: "Bonus Allocated!", 
        description: `UGX ${parseInt(amount).toLocaleString()} bonus allocated successfully. The employee will see a bonus notification when they refresh their browser.`,
        duration: 8000,
      });
      setOpen(false);
      setSelectedEmployee("");
      setAmount("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["bonus-history"] });
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
            Allocate Bonus
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Allocate Employee Bonus
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
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Excellent sales performance in January"
              />
            </div>
            <Button
              onClick={() => allocateMutation.mutate()}
              disabled={!selectedEmployee || !amount || !reason || allocateMutation.isPending}
              className="w-full"
            >
              {allocateMutation.isPending ? "Allocating..." : "Allocate Bonus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus History */}
      {bonusHistory && bonusHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Recent Allocations</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bonusHistory.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div>
                  <p className="font-medium">{b.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{b.reason}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">UGX {Number(b.amount).toLocaleString()}</p>
                  <Badge variant={b.status === "claimed" ? "default" : "secondary"} className="text-xs">
                    {b.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocateBonusDialog;
