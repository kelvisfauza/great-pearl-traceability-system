import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";

const generateDailyReference = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const key = `dpr_ref_${y}${m}${day}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const ref = `DPR-${y}${m}${day}-${rand}`;
    localStorage.setItem(key, ref);
    return ref;
  } catch {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `DPR-${y}${m}${day}-${rand}`;
  }
};

interface DailyPurchaseTemplateProps {
  rows?: number;
}

const DailyPurchaseTemplate = ({ rows = 22 }: DailyPurchaseTemplateProps) => {
  const templateNo = useMemo(() => generateDailyReference(), []);
  const todayStr = format(new Date(), "dd / MM / yyyy");

  const handlePrint = () => {
    const html = buildHtml(templateNo, todayStr, rows);
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const handleDownload = () => {
    const html = buildHtml(templateNo, todayStr, rows);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateNo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handlePrint} variant="default" size="sm">
        <Printer className="h-4 w-4 mr-2" />
        Print Daily Purchase Template
      </Button>
      <Button onClick={handleDownload} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Download Template
      </Button>
      <span className="text-xs text-muted-foreground self-center">
        Today's Ref: <strong>{templateNo}</strong> (use Page 2, 3… for extra sheets)
      </span>
    </div>
  );
};

const buildHtml = (templateNo: string, dateStr: string, rows: number) => {
  const origin = window.location.origin;
  const logoUrl = `${origin}/lovable-uploads/great-agro-coffee-logo.png`;
  const rowsHtml = Array.from({ length: rows })
    .map(
      (_, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${templateNo} - Daily Purchase Template</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  html, body { height: 100%; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 0; }
  .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 4px; margin-bottom: 6px; }
  .logo-wrap { display: none; }
  .company { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; margin: 2px 0; }
  .contact { font-size: 9px; color: #444; line-height: 1.3; }
  .doc-title { font-size: 12px; font-weight: bold; margin-top: 4px; text-transform: uppercase; }
  .meta { display: flex; justify-content: space-between; font-size: 9.5px; margin: 4px 0; flex-wrap: wrap; gap: 4px; }
  .meta .box { border: 1px solid #333; padding: 2px 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
  th, td { border: 1px solid #333; padding: 2px 4px; text-align: left; vertical-align: middle; height: 26px; }
  th { background: #f0f0f0; text-align: center; font-size: 9.5px; padding: 4px 3px; height: auto; }
  td.num { text-align: center; width: 22px; color: #555; }
  .signoff { display: flex; justify-content: space-between; margin-top: 14px; font-size: 10px; }
  .signoff .sig { width: 30%; }
  .signoff .sig p { border-top: 1px solid #333; margin-top: 24px; padding-top: 2px; text-align: center; }
  .note { font-size: 8.5px; color: #666; margin-top: 6px; font-style: italic; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-wrap"><img src="${logoUrl}" alt="Great Agro Coffee" /></div>
    <div class="company">GREAT AGRO COFFEE</div>
    <div class="contact">
      Kasese, Uganda &nbsp;|&nbsp; +256 393 001 626<br/>
      www.greatagrocoffee.com &nbsp;|&nbsp; info@greatpearlcoffee.com<br/>
      Uganda Coffee Development Authority Licensed
    </div>
    <div class="doc-title">Daily Purchase Record — Store Manager</div>
  </div>

  <div class="meta">
    <div class="box"><strong>Daily Ref:</strong> ${templateNo}</div>
    <div class="box"><strong>Date:</strong> ${dateStr}</div>
    <div class="box"><strong>Page:</strong> _____ of _____</div>
    <div class="box"><strong>Store Manager:</strong> ____________________</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Supplier Name</th>
        <th>Coffee Type</th>
        <th>Bags</th>
        <th>Kilograms (Kg)</th>
        <th>Unit Price (UGX)</th>
        <th>Total (UGX)</th>
        <th>Remarks / GRN No.</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <th colspan="3" style="text-align:right;">TOTALS</th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
      </tr>
    </tfoot>
  </table>

  <div class="signoff">
    <div class="sig"><p>Store Manager (Sign &amp; Date)</p></div>
    <div class="sig"><p>Quality Officer (Sign &amp; Date)</p></div>
    <div class="sig"><p>Finance / Admin (Sign &amp; Date)</p></div>
  </div>

  <p class="note">This sheet is filled manually throughout the day and reconciled against system entries (Store Receipts) at end of day.</p>

  <div class="no-print" style="margin-top:20px; text-align:center;">
    <button onclick="window.print()" style="padding:8px 20px;">Print</button>
  </div>
</body>
</html>`;
};

export default DailyPurchaseTemplate;