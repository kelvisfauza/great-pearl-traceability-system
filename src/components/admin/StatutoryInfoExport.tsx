import { useEffect, useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileDown, FileText, Search, ShieldCheck } from 'lucide-react';
import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  COMPANY_ADDRESS,
  COMPANY_PHONE,
  COMPANY_EMAIL,
  COMPANY_REG,
} from '@/utils/companyBrand';

interface Row {
  id: string;
  employee_id: string | null;
  name: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  tin_number: string | null;
  nssf_number: string | null;
  status: string | null;
}

const StatutoryInfoExport = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_id, name, department, position, email, phone, tin_number, nssf_number, status')
        .order('name', { ascending: true });
      if (error) {
        toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
      } else {
        setRows((data || []) as any);
      }
      setLoading(false);
    })();
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyMissing) {
        const hasTin = !!r.tin_number?.toString().trim();
        const hasNssf = !!r.nssf_number?.toString().trim();
        if (hasTin && hasNssf) return false;
      }
      if (!q) return true;
      return [r.name, r.employee_id, r.email, r.tin_number, r.nssf_number, r.department]
        .some((v) => (v || '').toString().toLowerCase().includes(q));
    });
  }, [rows, query, onlyMissing]);

  const stats = useMemo(() => {
    const total = rows.length;
    const withTin = rows.filter((r) => !!r.tin_number?.toString().trim()).length;
    const withNssf = rows.filter((r) => !!r.nssf_number?.toString().trim()).length;
    const complete = rows.filter((r) => !!r.tin_number?.toString().trim() && !!r.nssf_number?.toString().trim()).length;
    return { total, withTin, withNssf, complete, missing: total - complete };
  }, [rows]);

  const exportPdf = (single?: Row) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    let y = margin;

    const header = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(COMPANY_NAME, pageW / 2, y, { align: 'center' });
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(COMPANY_TAGLINE, pageW / 2, y, { align: 'center' });
      y += 11;
      doc.text(`${COMPANY_ADDRESS} · Tel: ${COMPANY_PHONE} · ${COMPANY_EMAIL}`, pageW / 2, y, { align: 'center' });
      y += 10;
      doc.text(COMPANY_REG, pageW / 2, y, { align: 'center' });
      y += 14;
      doc.setDrawColor(0);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageW - margin, y);
      y += 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(single ? 'STATUTORY INFORMATION CERTIFICATE' : 'STATUTORY INFORMATION REGISTER (URA TIN & NSSF)', pageW / 2, y, { align: 'center' });
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y + 8, { align: 'center' });
      y += 22;
    };

    header();

    if (single) {
      const lines: [string, string][] = [
        ['Employee Name', single.name || '-'],
        ['Employee ID', single.employee_id || '-'],
        ['Department', single.department || '-'],
        ['Position', single.position || '-'],
        ['Email', single.email || '-'],
        ['Phone', single.phone || '-'],
        ['URA TIN Number', single.tin_number || 'NOT PROVIDED'],
        ['NSSF Account Number', single.nssf_number || 'NOT PROVIDED'],
        ['Status', single.status || '-'],
      ];
      doc.setFontSize(11);
      lines.forEach(([k, v]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${k}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v), margin + 160, y);
        y += 20;
      });
      y += 20;
      doc.setFontSize(9);
      doc.text('This is an official record of the employee\'s statutory identifiers held by the company', margin, y);
      y += 12;
      doc.text('for the purposes of PAYE (URA) and NSSF contributions.', margin, y);
      y += 50;
      doc.line(margin, y, margin + 220, y);
      doc.line(pageW - margin - 220, y, pageW - margin, y);
      y += 12;
      doc.text('HR / Payroll Officer', margin, y);
      doc.text('Employee Signature', pageW - margin - 220, y);
    } else {
      // Summary
      doc.setFontSize(10);
      doc.text(
        `Total: ${stats.total}   Complete: ${stats.complete}   Missing: ${stats.missing}   With TIN: ${stats.withTin}   With NSSF: ${stats.withNssf}`,
        margin,
        y,
      );
      y += 16;

      // Table
      const cols = [
        { k: '#', w: 22 },
        { k: 'Employee', w: 130 },
        { k: 'Emp ID', w: 60 },
        { k: 'Department', w: 80 },
        { k: 'URA TIN', w: 90 },
        { k: 'NSSF No.', w: 90 },
        { k: 'Status', w: 50 },
      ];
      const rowH = 16;

      const drawHeader = () => {
        doc.setFillColor(0, 0, 0);
        doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        let x = margin + 4;
        cols.forEach((c) => {
          doc.text(c.k, x, y + 11);
          x += c.w;
        });
        y += rowH;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      };

      drawHeader();

      filtered.forEach((r, idx) => {
        if (y + rowH > pageH - margin - 20) {
          doc.addPage();
          y = margin;
          header();
          drawHeader();
        }
        // alt row shading
        if (idx % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
        }
        const cells = [
          String(idx + 1),
          r.name || '-',
          r.employee_id || '-',
          r.department || '-',
          r.tin_number || 'MISSING',
          r.nssf_number || 'MISSING',
          r.status || '-',
        ];
        let x = margin + 4;
        cells.forEach((c, i) => {
          const text = doc.splitTextToSize(String(c), cols[i].w - 4)[0] || '';
          doc.text(text, x, y + 11);
          x += cols[i].w;
        });
        y += rowH;
      });

      // Footer
      y = pageH - margin;
      doc.setFontSize(8);
      doc.text(`Confidential · ${COMPANY_NAME} HR / Payroll`, pageW / 2, y, { align: 'center' });
    }

    const filename = single
      ? `Statutory_${(single.name || single.employee_id || 'employee').replace(/\s+/g, '_')}.pdf`
      : `Statutory_Register_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Statutory Information (URA TIN & NSSF)
        </CardTitle>
        <CardDescription>
          View all employees' submitted TIN and NSSF numbers, and export a PDF register or a single-employee certificate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
          <div className="rounded border p-2"><div className="text-xs text-muted-foreground">Total</div><div className="font-bold">{stats.total}</div></div>
          <div className="rounded border p-2"><div className="text-xs text-muted-foreground">Complete</div><div className="font-bold text-green-600">{stats.complete}</div></div>
          <div className="rounded border p-2"><div className="text-xs text-muted-foreground">Missing</div><div className="font-bold text-destructive">{stats.missing}</div></div>
          <div className="rounded border p-2"><div className="text-xs text-muted-foreground">With TIN</div><div className="font-bold">{stats.withTin}</div></div>
          <div className="rounded border p-2"><div className="text-xs text-muted-foreground">With NSSF</div><div className="font-bold">{stats.withNssf}</div></div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search by name, ID, email, TIN, NSSF..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant={onlyMissing ? 'default' : 'outline'} onClick={() => setOnlyMissing((v) => !v)}>
            {onlyMissing ? 'Showing missing only' : 'Show missing only'}
          </Button>
          <Button onClick={() => exportPdf()} className="gap-2">
            <FileDown className="h-4 w-4" /> Export Register PDF
          </Button>
        </div>

        <div className="rounded border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Employee</th>
                <th className="text-left p-2">Department</th>
                <th className="text-left p-2">URA TIN</th>
                <th className="text-left p-2">NSSF No.</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No employees match.</td></tr>
              )}
              {filtered.map((r) => {
                const hasTin = !!r.tin_number?.toString().trim();
                const hasNssf = !!r.nssf_number?.toString().trim();
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{r.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{r.employee_id || '—'}</div>
                    </td>
                    <td className="p-2">{r.department || '-'}</td>
                    <td className="p-2">
                      {hasTin ? r.tin_number : <Badge variant="destructive">Missing</Badge>}
                    </td>
                    <td className="p-2">
                      {hasNssf ? r.nssf_number : <Badge variant="destructive">Missing</Badge>}
                    </td>
                    <td className="p-2">{r.status || '-'}</td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => exportPdf(r)}>
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatutoryInfoExport;