import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Loader2, Users, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  department: string;
  salary: number;
  join_date: string | null;
  outstanding: number;
}

type TemplateKey = "direct" | "urgency" | "friendly" | "benefit" | "simple";

const TEMPLATES: Record<TemplateKey, { label: string; build: (name: string, limit: string) => string }> = {
  direct: {
    label: "Direct Offer",
    build: (name, limit) =>
      `GREAT PEARL COFFEE: ${name}, you qualify for UGX ${limit} loan. No paperwork, instant to wallet. Apply on your app now.`,
  },
  urgency: {
    label: "Urgency",
    build: (name, limit) =>
      `GREAT PEARL COFFEE: ${name}, need cash fast? Get up to UGX ${limit} instantly. Low interest, easy repay. Apply in-app today.`,
  },
  friendly: {
    label: "Friendly Reminder",
    build: (name, limit) =>
      `Hi ${name}, did you know you can borrow UGX ${limit} right now? Quick loans on your Great Pearl app. Easy weekly repayments.`,
  },
  benefit: {
    label: "Benefit Focused",
    build: (name, limit) =>
      `${name}, access UGX ${limit} loan anytime. No guarantor needed, funds go straight to your wallet. Great Pearl Coffee App.`,
  },
  simple: {
    label: "Short & Simple",
    build: (name, limit) =>
      `${name}, your loan limit is UGX ${limit}. Borrow now from your Great Pearl Coffee app. Fast, easy, low interest.`,
  },
};

const LoanAdvertDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [template, setTemplate] = useState<TemplateKey>("direct");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-for-loan-advert"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, phone, email, department, salary, join_date")
        .eq("status", "Active")
        .order("name");

      if (error) throw error;

      const { data: activeLoans } = await supabase
        .from("loans")
        .select("employee_email, remaining_balance, loan_amount, status")
        .in("status", ["active", "pending_guarantor", "pending_admin"]);

      const outstandingMap: Record<string, number> = {};
      (activeLoans || []).forEach((loan: any) => {
        const email = loan.employee_email;
        const balance = Number(loan.remaining_balance) || Number(loan.loan_amount) || 0;
        outstandingMap[email] = (outstandingMap[email] || 0) + balance;
      });

      return (data as Employee[]).map((emp) => ({
        ...emp,
        outstanding: outstandingMap[emp.email] || 0,
      }));
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

  const getLoanLimit = (salary: number, outstanding: number = 0) => Math.max(0, (salary || 0) * 2 - outstanding);

  const getTenureMonths = (joinDate: string | null) => {
    if (!joinDate) return 0;
    const now = new Date();
    const join = new Date(joinDate);
    return Math.max(0, Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  };

  const getMultiplier = (joinDate: string | null) => {
    const tenure = getTenureMonths(joinDate);
    return tenure >= 3 ? '2x' : '1x';
  };

  const getPreviewMessage = () => {
    return TEMPLATES[template].build("[Name]", "[Limit]");
  };

  const getCharCount = () => {
    // Use a sample realistic message to estimate length
    const sample = TEMPLATES[template].build("Tumwine Alex", "600,000");
    return sample.length;
  };

  const handleSend = async () => {
    if (selectedEmployees.size === 0) {
      toast({ title: "No employees selected", description: "Please select at least one employee", variant: "destructive" });
      return;
    }
    if (!sendSms && !sendEmail) {
      toast({ title: "No channel selected", description: "Please enable SMS or Email", variant: "destructive" });
      return;
    }

    setSending(true);
    const selectedList = employees?.filter((e) => selectedEmployees.has(e.id)) || [];
    setProgress({ sent: 0, failed: 0, total: selectedList.length });
    let successCount = 0;
    let failCount = 0;

    for (const emp of selectedList) {
      const limit = getLoanLimit(emp.salary, emp.outstanding);
      if (limit <= 0) { successCount++; setProgress({ sent: successCount, failed: failCount, total: selectedList.length }); continue; }

      let empSuccess = false;

      // Send SMS
      if (sendSms && emp.phone) {
        const message = TEMPLATES[template].build(emp.name.split(" ")[0], limit.toLocaleString());
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
          if (!error) empSuccess = true;
        } catch { /* ignore */ }
      }

      // Send Email
      if (sendEmail && emp.email) {
        const tenure = getTenureMonths(emp.join_date);
        const multiplier = getMultiplier(emp.join_date);
        try {
          const { error } = await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "loan-promotion",
              recipientEmail: emp.email,
              idempotencyKey: `loan-promo-${emp.id}-${Date.now()}`,
              templateData: {
                employeeName: emp.name,
                maxLoanAmount: limit,
                tenureMonths: tenure,
                salary: emp.salary,
                multiplier,
                interestRate: 15,
                maxRepaymentMonths: 6,
                loginUrl: "https://www.greatagrocoffeesystem.site",
              },
            },
          });
          if (!error) empSuccess = true;
        } catch { /* ignore */ }
      }

      if (empSuccess) successCount++;
      else failCount++;
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
          {/* Channel Toggles */}
          <div className="flex items-center gap-6 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Switch id="send-sms" checked={sendSms} onCheckedChange={setSendSms} />
              <Label htmlFor="send-sms" className="text-sm cursor-pointer">📱 SMS</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="send-email" checked={sendEmail} onCheckedChange={setSendEmail} />
              <Label htmlFor="send-email" className="text-sm cursor-pointer">📧 Email</Label>
            </div>
          </div>

          {/* SMS Template Selector (only when SMS enabled) */}
          {sendSms && (
            <div className="space-y-2">
              <label className="text-sm font-medium">SMS Message Style</label>
              <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATES).map(([key, t]) => (
                    <SelectItem key={key} value={key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">SMS Preview:</p>
                  <Badge variant={getCharCount() <= 160 ? "secondary" : "destructive"} className="text-xs">
                    {getCharCount()} / 160 chars
                  </Badge>
                </div>
                <p className="text-muted-foreground italic">{getPreviewMessage()}</p>
              </div>
            </div>
          )}

          {sendEmail && (
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-primary" />
                <p className="font-medium">Email Preview</p>
              </div>
              <p className="text-muted-foreground">Each employee will receive a branded email with their <strong>personalized loan limit</strong>, tenure details, terms & conditions, and a direct login link.</p>
            </div>
          )}

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

          <ScrollArea className="h-56 border rounded-lg p-2">
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
                  <Badge variant={getLoanLimit(emp.salary, emp.outstanding) > 0 ? "secondary" : "destructive"} className="text-xs whitespace-nowrap">
                    UGX {getLoanLimit(emp.salary, emp.outstanding).toLocaleString()}
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

          <Button onClick={handleSend} disabled={sending || selectedEmployees.size === 0 || (!sendSms && !sendEmail)} className="w-full">
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Megaphone className="mr-2 h-4 w-4" /> Send {sendSms && sendEmail ? 'SMS + Email' : sendEmail ? 'Email' : 'SMS'} to {selectedEmployees.size} Employees</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanAdvertDialog;
