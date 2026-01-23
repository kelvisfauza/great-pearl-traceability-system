import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Loader2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  department: string;
  salary: number;
}

const SalaryAnnouncementDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [percentage, setPercentage] = useState<number>(100);
  const [sending, setSending] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-for-salary-sms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, phone, email, department, salary")
        .eq("status", "Active")
        .not("phone", "is", null)
        .order("name");

      if (error) throw error;
      return data as Employee[];
    },
    enabled: open,
  });

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (employees) {
      setSelectedEmployees(new Set(employees.map((e) => e.id)));
    }
  };

  const deselectAll = () => {
    setSelectedEmployees(new Set());
  };

  const handleSend = async () => {
    if (selectedEmployees.size === 0) {
      toast({
        title: "No employees selected",
        description: "Please select at least one employee",
        variant: "destructive",
      });
      return;
    }

    if (percentage <= 0 || percentage > 100) {
      toast({
        title: "Invalid percentage",
        description: "Please enter a percentage between 1 and 100",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    const currentMonth = format(new Date(), "MMMM yyyy");
    let successCount = 0;
    let failCount = 0;

    const selectedList = employees?.filter((e) => selectedEmployees.has(e.id)) || [];

    for (const emp of selectedList) {
      if (!emp.phone) continue;

      const amount = Math.round((emp.salary || 0) * (percentage / 100));
      const formattedAmount = amount.toLocaleString();

      const message =
        percentage === 100
          ? `Dear ${emp.name}, your salary for ${currentMonth} is UGX ${formattedAmount}. Thank you for your dedication. - Management`
          : `Dear ${emp.name}, due to performance adjustments this month (${currentMonth}), you will receive UGX ${formattedAmount} (${percentage}% of your salary). We appreciate your understanding. - Management`;

      try {
        const { error: smsError } = await supabase.functions.invoke("send-sms", {
          body: {
            phone: emp.phone,
            message,
            userName: emp.name,
            messageType: "salary_notice",
            department: emp.department,
            recipientEmail: emp.email,
          },
        });

        if (smsError) {
          failCount++;
        } else {
          successCount++;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch {
        failCount++;
      }
    }

    toast({
      title: "Salary Notice Sent",
      description: `Successfully sent to ${successCount} employees${failCount > 0 ? `, ${failCount} failed` : ""}`,
    });

    setSending(false);
    setOpen(false);
    setSelectedEmployees(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Salary Notice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-600" />
            Salary Announcement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="percentage">Salary Percentage</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="percentage"
                  type="number"
                  min={1}
                  max={100}
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex gap-2 pt-6">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Selected: {selectedEmployees.size} of {employees?.length || 0} employees
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {employees?.map((emp) => {
                  const amount = Math.round((emp.salary || 0) * (percentage / 100));
                  return (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleEmployee(emp.id)}
                    >
                      <Checkbox
                        checked={selectedEmployees.has(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {emp.department} • {emp.phone}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Salary: UGX {(emp.salary || 0).toLocaleString()}
                        </div>
                        <div className="font-medium text-orange-600">
                          {percentage}%: UGX {amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <Button
            onClick={handleSend}
            disabled={sending || selectedEmployees.size === 0}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending to {selectedEmployees.size} employees...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Send to {selectedEmployees.size} Selected Employees
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryAnnouncementDialog;
