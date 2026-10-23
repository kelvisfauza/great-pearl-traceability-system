import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Printer, Download, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

const ugx = (n: number) => `UGX ${Math.round(n || 0).toLocaleString()}`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const OPEN = ["active", "disbursed", "defaulted"];

const LoanPortfolioReport = () => {
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["loan-portfolio-report"],
    queryFn: async () => {
      const db = supabase as any;
      const [loans, reps, ledger] = await Promise.all([
        db.from("loans").select("*").order("created_at", { ascending: false }).limit(2000),
        db.from("loan_repayments").select("loan_id,installment_number,due_date,amount_due,amount_paid,status,paid_date,deducted_from").order("due_date").limit(10000),
        db.from("ledger_entries").select("amount,created_at,reference,metadata").eq("entry_type", "LOAN_REPAYMENT").limit(10000),
      ]);
      if (loans.error) throw loans.error;
      return { loans: loans.data || [], reps: reps.data || [], ledger: ledger.data || [] };
    },
    refetchInterval: 120000,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const today = new Date().toISOString().slice(0, 10);
    const repsBy: Record<string, any[]> = {};
    data.reps.forEach((r: any) => (repsBy[r.loan_id] ||= []).push(r));
    const ledBy: Record<string, number> = {};
    data.ledger.forEach((l: any) => {
      const id = l.metadata?.loan_id;
      if (id) ledBy[id] = (ledBy[id] || 0) + Math.abs(Number(l.amount) || 0);
    });
    return data.loans.map((l: any) => {
      const inst = repsBy[l.id] || [];
      const schedPaid = inst.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
      const overdue = inst.filter((r) => r.status !== "paid" && r.due_date < today);
      const overdueAmt = overdue.reduce((s, r) => s + Number(r.amount_due) - (Number(r.amount_paid) || 0), 0);
      const next = inst.find((r) => r.status !== "paid");
      const paid = Number(l.paid_amount) || 0;
      const wallet = ledBy[l.id] || 0;
      const isOpen = OPEN.includes(l.status);
      const issues: string[] = [];
      if (isOpen && Math.abs(schedPaid - paid) > 1) issues.push(`Schedule shows ${ugx(schedPaid)} paid, loan shows ${ugx(paid)}`);
      if (wallet > 0 && Math.abs(wallet - paid) > 1) issues.push(`Wallet repayments ${ugx(wallet)} vs loan paid ${ugx(paid)}`);
      if (!isOpen && inst.some((r) => r.status !== "paid") && ["completed", "paid_off"].includes(l.status)) issues.push("Closed loan has unpaid installments");
      return { ...l, inst, schedPaid, overdue: overdue.length, overdueAmt, next, paid, wallet, isOpen, issues };
    });
  }, [data]);

  const filtered = rows.filter((r: any) => {
    if (status === "open" && !r.isOpen) return false;
    if (status === "issues" && r.issues.length === 0) return false;
    if (status === "overdue" && r.overdue === 0) return false;
    if (!["open", "issues", "overdue", "all"].includes(status) && r.status !== status) return false;
    const q = search.trim().toLowerCase();
    return !q || `${r.employee_name} ${r.employee_email}`.toLowerCase().includes(q);
  });

  const open = rows.filter((r: any) => r.isOpen);
  const totals = {
    count: open.length,
    principal: open.reduce((s: number, r: any) => s + Number(r.loan_amount || 0), 0),
    repayable: open.reduce((s: number, r: any) => s + Number(r.total_repayable || 0), 0),
    collected: open.reduce((s: number, r: any) => s + r.paid, 0),
    outstanding: open.reduce((s: number, r: any) => s + Number(r.remaining_balance || 0), 0),
    overdue: open.reduce((s: number, r: any) => s + r.overdueAmt, 0),
    issues: rows.filter((r: any) => r.issues.length).length,
  };

  const exportCsv = () => {
    const head = ["Borrower", "Email", "Type", "Status", "Applied", "Principal", "Total repayable", "Paid", "Outstanding", "Overdue installments", "Overdue amount", "Next due", "Issues"];
    const lines = filtered.map((r: any) => [r.employee_name, r.employee_email, r.loan_type, r.status, day(r.created_at), r.loan_amount, r.total_repayable, r.paid, r.remaining_balance, r.overdue, r.overdueAmt, r.next ? `${r.next.due_date} (${Number(r.next.amount_due) - (Number(r.next.amount_paid) || 0)})` : "", r.issues.join("; ")]);
    const csv = [head, ...lines].map((l) => l.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `loan-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <Layout title="Loan Portfolio Report" subtitle="Every loan, its repayments, overdue amounts and records that don't match">
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              ["Open loans", String(totals.count)],
              ["Principal lent", ugx(totals.principal)],
              ["Total repayable", ugx(totals.repayable)],
              ["Collected", ugx(totals.collected)],
              ["Outstanding", ugx(totals.outstanding)],
              ["Overdue", ugx(totals.overdue)],
              ["Records to check", String(totals.issues)],
            ].map(([k, v]) => (
              <Card key={k}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-lg font-bold">{v}</p></CardContent></Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Input placeholder="Search borrower" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open loans</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="issues">Records to check</SelectItem>
                <SelectItem value="pending">Pending approval</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paid_off">Paid off</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All loans</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Download</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{filtered.length} loans</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead /><TableHead>Borrower</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Applied</TableHead>
                  <TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Repayable</TableHead><TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead><TableHead>Overdue</TableHead><TableHead>Next due</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <>
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        <TableCell>{expanded === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell><div className="font-medium flex items-center gap-1">{r.employee_name}{r.issues.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}</div><div className="text-xs text-muted-foreground">{r.employee_email}</div></TableCell>
                        <TableCell className="capitalize">{String(r.loan_type || "").replace(/_/g, " ")}</TableCell>
                        <TableCell><Badge variant={r.status === "defaulted" ? "destructive" : r.isOpen ? "default" : "secondary"}>{String(r.status).replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell>{day(r.created_at)}</TableCell>
                        <TableCell className="text-right">{ugx(r.loan_amount)}</TableCell>
                        <TableCell className="text-right">{ugx(r.total_repayable)}</TableCell>
                        <TableCell className="text-right">{ugx(r.paid)}</TableCell>
                        <TableCell className="text-right font-medium">{ugx(r.remaining_balance)}</TableCell>
                        <TableCell>{r.overdue ? <span className="text-destructive">{r.overdue} · {ugx(r.overdueAmt)}</span> : "—"}</TableCell>
                        <TableCell>{r.next ? `${day(r.next.due_date)} · ${ugx(Number(r.next.amount_due) - (Number(r.next.amount_paid) || 0))}` : "—"}</TableCell>
                      </TableRow>
                      {expanded === r.id && (
                        <TableRow key={r.id + "-d"}>
                          <TableCell colSpan={11} className="bg-muted/40">
                            {r.issues.length > 0 && (
                              <div className="mb-2 text-sm text-destructive">{r.issues.map((i: string) => <div key={i}>• {i}</div>)}</div>
                            )}
                            <div className="text-xs text-muted-foreground mb-2">
                              {r.duration_months} months · {r.repayment_frequency} · approved by {r.admin_approved_by || "—"} · guarantor {r.guarantor_name || "—"}{r.guarantor2_name ? `, ${r.guarantor2_name}` : ""} · wallet repayments recorded {ugx(r.wallet)}
                            </div>
                            <Table>
                              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Due amount</TableHead><TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead><TableHead>Paid on</TableHead><TableHead>Paid from</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {r.inst.map((i: any) => (
                                  <TableRow key={i.installment_number}>
                                    <TableCell>{i.installment_number}</TableCell><TableCell>{day(i.due_date)}</TableCell>
                                    <TableCell className="text-right">{ugx(i.amount_due)}</TableCell><TableCell className="text-right">{ugx(i.amount_paid)}</TableCell>
                                    <TableCell>{i.status}</TableCell><TableCell>{day(i.paid_date)}</TableCell><TableCell>{i.deducted_from || "—"}</TableCell>
                                  </TableRow>
                                ))}
                                {r.inst.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No schedule</TableCell></TableRow>}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default LoanPortfolioReport;
