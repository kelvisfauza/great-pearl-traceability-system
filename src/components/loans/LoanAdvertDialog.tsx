import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Loader2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  department: string;
  salary: number;
}

const LoanAdvertDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-for-loan-advert"],
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (employees) setSelectedEmployees(new Set(employees.map((e) => e.id)));
  };

  const deselectAll = () => setSelectedEmployees(new Set());

  const getLoanLimit = (salary: number) => (salary || 0) * 3;

  const handleSend = async () => {
    if (selectedEmployees.size === 0) {
      toast({ title: "No employees selected", description: "Please select at least one employee", variant: "destructive" });
      return;
    }

    setSending(true);
    const selectedList = employees?.filter((e) => selectedEmployees.has(e.id)) || [];
    setProgress({ sent: 0, failed: 0, total: selectedList.length });
    let successCount = 0;
    let failCount = 0;

    for (const emp of selectedList) {
      if (!emp.phone) { failCount++; continue; }

      const limit = getLoanLimit(emp.salary);
      const message = `Hi ${emp.name}, your loan limit is UGX ${limit.toLocaleString()}. Borrow now, no paperwork, instant to wallet. Rates from 15%. Log in to Great Pearl Coffee App and grab your cash today!`;

      try {
        const { error } = await supabase.functions.invoke("send-sms", {
          body: {
            phone: emp.phone,
            message,
            userName: emp.name,
            messageType: "loan_advert",
            department: emp.department,
            recipientEmail: emp.email,
          },
        });

        if (error) failCount++;
        else successCount++;
      } catch {
        failCount++;
      }
      setProgress({ sent: successCount, failed: failCount, total: selectedList.length });
    }

    setSending(false);
    toast({
      title: "Loan Advert Sent",
      description: `${successCount} sent, ${failCount} failed out of ${selectedList.length} employees`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Megaphone className="mr-2 h-4 w-4" /> Send Loan Advert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Quick Loan Advert via SMS</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p className="font-medium mb-1">Message Preview:</p>
             <p className="text-muted-foreground italic">
               "Hi [Name], your loan limit is UGX [3x salary]. Borrow now, no paperwork, instant to wallet. Rates from 15%. Log in to Great Pearl Coffee App and grab your cash today!"
              </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Employees ({selectedEmployees.size} selected)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>All</Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>None</Button>
            </div>
          </div>

          <ScrollArea className="h-64 border rounded-lg p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              employees?.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                  onClick={() => toggleEmployee(emp.id)}
                >
                  <Checkbox checked={selectedEmployees.has(emp.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.department} · {emp.phone}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    UGX {getLoanLimit(emp.salary).toLocaleString()}
                  </Badge>
                </div>
              ))
            )}
          </ScrollArea>

          {sending && (
            <div className="text-sm text-muted-foreground text-center">
              Sending... {progress.sent + progress.failed} / {progress.total}
              {progress.failed > 0 && <span className="text-destructive"> ({progress.failed} failed)</span>}
            </div>
          )}

          <Button onClick={handleSend} disabled={sending || selectedEmployees.size === 0} className="w-full">
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Megaphone className="mr-2 h-4 w-4" /> Send to {selectedEmployees.size} Employees</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanAdvertDialog;
