import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UtensilsCrossed, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';

const loadImageAsBase64 = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const fmt = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const startOfWeek = (d: Date) => {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const generateWeeklyMealSignSheet = async (weekStartISO?: string, blankOnly = false) => {
  let employees: Array<{ name: string; department?: string | null }> = [];

  if (!blankOnly) {
    const { data, error } = await (supabase as any)
      .from('employees')
      .select('name, department, status, disabled')
      .order('name', { ascending: true });
    if (error) throw error;
    employees = (data || []).filter(
      (e: any) => e?.name && (e.status ? String(e.status).toLowerCase() === 'active' : true) && !e.disabled,
    );
  }

  const weekStart = weekStartISO ? new Date(`${weekStartISO}T00:00:00`) : startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5);

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageW = 297;
  const pageH = 210;
  const margin = 10;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);

  const drawHeader = () => {
    if (logoData) {
      try { doc.addImage(logoData, 'PNG', margin, 6, 15, 15); } catch { /* ignore */ }
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('GREAT AGRO COFFEE', margin + 19, 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 19, 15.8);
    doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103', margin + 19, 19);
    doc.text('info@greatpearlcoffee.com', margin + 19, 22);

    doc.setLineWidth(0.5);
    doc.line(margin, 24.5, pageW - margin, 24.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('WEEKLY EMPLOYEE MEALS SIGN-OFF SHEET', pageW / 2, 30.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Week Commencing: ${fmt(weekStart)}   to   ${fmt(weekEnd)}`, margin, 36);
    doc.text('Provider / Caterer: ______________________', pageW / 2 - 25, 36);
    doc.text('Form No: ________________', pageW - margin, 36, { align: 'right' });
  };

  const nameW = contentW * 0.24;
  const deptW = contentW * 0.16;
  const noW = contentW * 0.05;
  const dayW = (contentW - nameW - deptW - noW) / DAYS.length;
  const headH = 8;
  const rowH = 8.4;

  const drawTableHead = (y: number) => {
    let x = margin;
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y, contentW, headH, 'F');
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);

    const head = (label: string, w: number) => {
      doc.rect(x, y, w, headH);
      doc.text(label, x + w / 2, y + headH / 2 + 1.4, { align: 'center' });
      x += w;
    };
    head('No.', noW);
    head('EMPLOYEE NAME', nameW);
    head('DEPARTMENT', deptW);
    DAYS.forEach((d, i) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      doc.rect(x, y, dayW, headH);
      doc.text(d, x + dayW / 2, y + 3.4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.text(
        dayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        x + dayW / 2,
        y + 6.6,
        { align: 'center' },
      );
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      x += dayW;
    });
    return y + headH;
  };

  const drawRow = (y: number, idx: number, name?: string, dept?: string) => {
    let x = margin;
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);

    doc.rect(x, y, noW, rowH);
    doc.text(String(idx), x + noW / 2, y + rowH / 2 + 1.3, { align: 'center' });
    x += noW;

    doc.rect(x, y, nameW, rowH);
    if (name) {
      const txt = doc.splitTextToSize(name.toUpperCase(), nameW - 3)[0];
      doc.text(txt, x + 2, y + rowH / 2 + 1.3);
    }
    x += nameW;

    doc.rect(x, y, deptW, rowH);
    if (dept) {
      const txt = doc.splitTextToSize(dept, deptW - 3)[0];
      doc.setFontSize(6.6);
      doc.text(txt, x + 2, y + rowH / 2 + 1.3);
      doc.setFontSize(7.4);
    }
    x += deptW;

    DAYS.forEach(() => {
      doc.rect(x, y, dayW, rowH);
      x += dayW;
    });
    return y + rowH;
  };

  drawHeader();
  let y = drawTableHead(40);

  const rows: Array<{ name?: string; dept?: string }> = [
    ...employees.map((e) => ({ name: e.name, dept: e.department || '' })),
    ...Array.from({ length: 5 }, () => ({})), // 5 manual-entry rows
  ];

  const bottomLimit = pageH - 34;
  let counter = 1;

  rows.forEach((r) => {
    if (y + rowH > bottomLimit) {
      doc.addPage('a4', 'l');
      drawHeader();
      y = drawTableHead(40);
    }
    y = drawRow(y, counter, r.name, r.dept);
    counter += 1;
  });

  // Footer notes + signatures on the last page
  y += 5;
  if (y + 24 > pageH - 16) {
    doc.addPage('a4', 'l');
    drawHeader();
    y = 42;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(70, 70, 70);
  doc.text(
    'Each employee must sign in the box for the day the meal was received. Blank rows at the end are for manual entry of additional staff / casual workers.',
    margin,
    y,
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  const sigW = (contentW - 30) / 3;
  ['Prepared By — Provider / Caterer', 'Verified By — HR / Operations', 'Approved By — Administrator'].forEach(
    (lbl, i) => {
      const sx = margin + i * (sigW + 15);
      doc.setLineWidth(0.35);
      doc.line(sx, y, sx + sigW, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.text(doc.splitTextToSize(`${lbl}\n(Name, Signature & Date)`, sigW), sx, y + 4.5);
    },
  );

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.4);
    doc.setTextColor(80, 80, 80);
    doc.text(
      'Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda',
      pageW / 2,
      pageH - 7.5,
      { align: 'center' },
    );
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 7.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  const stamp = weekStart.toISOString().slice(0, 10);
  doc.save(`Weekly-Meals-Sign-Sheet-${stamp}.pdf`);
  try {
    const blobUrl = doc.output('bloburl') as unknown as string;
    const printWin = window.open(blobUrl, '_blank');
    if (printWin) {
      printWin.addEventListener('load', () => {
        try { printWin.focus(); printWin.print(); } catch { /* ignore */ }
      });
    }
  } catch { /* ignore */ }
};

const WeeklyMealSignSheetTemplateDownload = () => {
  const [busy, setBusy] = useState<'list' | 'blank' | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()).toISOString().slice(0, 10));

  const handleGenerate = async (blankOnly: boolean) => {
    try {
      setBusy(blankOnly ? 'blank' : 'list');
      await generateWeeklyMealSignSheet(weekStart, blankOnly);
      toast({
        title: 'Weekly meals sheet ready',
        description: 'PDF downloaded and print preview opened.',
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate the sheet.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          Weekly Employee Meals Sign-Off Sheet
        </CardTitle>
        <CardDescription className="text-xs">
          Landscape A4 sheet listing all active employees with Mon–Sat sign boxes for the selected week, plus
          5 blank rows for staff added manually. Includes provider, verifier and administrator signatures.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="meal-week-start" className="text-xs">Week commencing (Monday)</Label>
          <Input
            id="meal-week-start"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </div>
        <Button onClick={() => handleGenerate(false)} disabled={busy !== null} className="w-full gap-2">
          {busy === 'list' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download With Employee List
        </Button>
        <Button
          onClick={() => handleGenerate(true)}
          disabled={busy !== null}
          variant="outline"
          className="w-full gap-2"
        >
          {busy === 'blank' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Blank Template
        </Button>
      </CardContent>
    </Card>
  );
};

export default WeeklyMealSignSheetTemplateDownload;
