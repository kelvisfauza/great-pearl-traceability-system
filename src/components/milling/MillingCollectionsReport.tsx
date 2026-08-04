import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Receipt } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  COMPANY_ADDRESS,
  COMPANY_PHONES,
  COMPANY_EMAIL,
} from "@/utils/companyBrand";

interface PaymentRow {
  id: string;
  date: string;
  customer_name: string;
  amount: number;
  method: string;
  remitted: boolean;
  notes?: string | null;
}

const MillingCollectionsReport = () => {
  const today = new Date();
  const [start, setStart] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [end, setEnd] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery({
    queryKey: ["milling-collections-report", start, end],
    queryFn: async () => {
      const [cash, jobs] = await Promise.all([
        supabase
          .from("milling_cash_transactions")
          .select("id, date, customer_name, amount_paid, payment_method, notes, remittance_id")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true }),
        supabase
          .from("milling_transactions")
          .select("id, date, customer_name, amount_paid, notes")
          .gt("amount_paid", 0)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true }),
      ]);
      if (cash.error) throw cash.error;
      if (jobs.error) throw jobs.error;

      const rows: PaymentRow[] = [
        ...(cash.data || []).map((c: any) => ({
          id: c.id,
          date: c.date,
          customer_name: c.customer_name,
          amount: Number(c.amount_paid || 0),
          method: c.payment_method || "Cash",
          remitted: !!c.remittance_id,
          notes: c.notes,
        })),
        ...(jobs.data || []).map((j: any) => ({
          id: j.id,
          date: j.date,
          customer_name: j.customer_name,
          amount: Number(j.amount_paid || 0),
          method: "Paid at milling",
          remitted: false,
          notes: j.notes,
        })),
      ].sort((a, b) => a.date.localeCompare(b.date));

      return rows;
    },
  });

  const rows = data || [];
  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const remitted = rows.filter((r) => r.remitted).reduce((s, r) => s + r.amount, 0);
    return { total, remitted, outstanding: total - remitted };
  }, [rows]);

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 48;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(COMPANY_NAME, pageW / 2, y, { align: "center" });
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(COMPANY_TAGLINE, pageW / 2, y, { align: "center" });
    y += 12;
    doc.text(`${COMPANY_ADDRESS} · ${COMPANY_PHONES}`, pageW / 2, y, { align: "center" });
    y += 12;
    doc.text(COMPANY_EMAIL, pageW / 2, y, { align: "center" });
    y += 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("MILLING FEES COLLECTION REPORT", pageW / 2, y, { align: "center" });
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Period: ${format(new Date(start), "dd/MM/yyyy")} - ${format(new Date(end), "dd/MM/yyyy")}`,
      pageW / 2,
      y,
      { align: "center" },
    );
    y += 12;
    doc.text("Prepared by: Kabugho Joan (Milling Manager)", pageW / 2, y, { align: "center" });
    y += 20;

    const cols = [40, 110, 300, 400, 500];
    const header = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Date", cols[0], y);
      doc.text("Customer", cols[1], y);
      doc.text("Method", cols[2], y);
      doc.text("Amount (UGX)", cols[3], y);
      doc.text("Remitted", cols[4], y);
      y += 6;
      doc.line(40, y, pageW - 40, y);
      y += 12;
      doc.setFont("helvetica", "normal");
    };
    header();

    rows.forEach((r) => {
      if (y > pageH - 90) {
        doc.addPage();
        y = 48;
        header();
      }
      doc.text(format(new Date(r.date), "dd/MM/yy"), cols[0], y);
      doc.text(String(r.customer_name || "-").slice(0, 30), cols[1], y);
      doc.text(String(r.method).slice(0, 20), cols[2], y);
      doc.text(r.amount.toLocaleString(), cols[3], y);
      doc.text(r.remitted ? "Yes" : "No", cols[4], y);
      y += 14;
    });

    y += 6;
    doc.line(40, y, pageW - 40, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text(`Payments recorded: ${rows.length}`, 40, y);
    y += 14;
    doc.text(`Total collected: UGX ${totals.total.toLocaleString()}`, 40, y);
    y += 14;
    doc.text(`Already remitted: UGX ${totals.remitted.toLocaleString()}`, 40, y);
    y += 14;
    doc.text(`Pending remittance: UGX ${totals.outstanding.toLocaleString()}`, 40, y);
    y += 32;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Prepared by (Milling Manager): ..............................", 40, y);
    doc.text("Received by (Finance): ..............................", 320, y);
    y += 24;
    doc.text(`Generated ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 40, y);

    doc.save(`milling-collections-${start}-to-${end}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" /> Milling Fees Collection Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Start date</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>End date</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={downloadPdf} disabled={isLoading || rows.length === 0} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Total collected</p>
            <p className="font-bold">UGX {totals.total.toLocaleString()}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Remitted</p>
            <p className="font-bold text-green-600">UGX {totals.remitted.toLocaleString()}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Pending remittance</p>
            <p className="font-bold text-orange-600">UGX {totals.outstanding.toLocaleString()}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Remitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.method}-${r.id}`}>
                    <TableCell>{format(new Date(r.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
                    <TableCell>{r.method}</TableCell>
                    <TableCell className="text-right">UGX {r.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={r.remitted ? "secondary" : "destructive"}>{r.remitted ? "Yes" : "No"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No payments recorded in this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MillingCollectionsReport;
