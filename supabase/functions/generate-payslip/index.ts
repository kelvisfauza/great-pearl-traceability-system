import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="https://esm.sh/jspdf@2.5.1"
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayslipData {
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  department: string;
  position?: string;
  month: string;
  grossSalary: number;
  advanceDeduction: number;
  netSalary: number;
  paymentMethod: string;
  transactionId: string;
  processedDate: string;
  nssfEmployee?: number;
  nssfEmployer?: number;
  paye?: number;
  taxableIncome?: number;
  advanceDetails?: Array<{
    advance_id: string;
    original_amount: number;
    deduction: number;
    remaining_after: number;
  }>;
}

interface Enrich {
  payslipNo: string; verifyCode: string; qr: string;
  position?: string; department?: string; staffNo?: string; joinDate?: string;
  nssfNo?: string; tin?: string; nin?: string; phone?: string;
  bank?: string; accountName?: string; accountNo?: string; wallet?: string;
  ytdGross: number; ytdNssf: number; ytdPaye: number; ytdNet: number; monthsPaid: number;
}

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function words(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'Zero';
  const chunk = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    const t = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : '');
    return [h ? ONES[h] + ' Hundred' : '', t].filter(Boolean).join(h && t ? ' and ' : '');
  };
  const parts: string[] = [];
  for (const [v, name] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand'], [1, '']] as [number, string][]) {
    const q = Math.floor(n / v); n %= v;
    if (q) parts.push(chunk(q) + (name ? ' ' + name : ''));
  }
  return parts.join(' ');
}
const ugx = (n: number) => `UGX ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

function periodDates(month: string): { start: string; end: string } {
  const d = new Date(`1 ${month}`);
  if (isNaN(d.getTime())) return { start: '-', end: '-' };
  const s = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  const e = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0));
  const f = (x: Date) => x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { start: f(s), end: f(e) };
}

function generatePayslipPDF(data: PayslipData, x: Enrich): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const L = 14, R = w - 14;
  const G: [number, number, number] = [20, 74, 52], GOLD: [number, number, number] = [176, 141, 56];
  const gross = Number(data.grossSalary || 0), nssf = Number(data.nssfEmployee || 0), paye = Number(data.paye || 0);
  const nssfEr = Number(data.nssfEmployer || 0), adv = Number(data.advanceDeduction || 0);
  const statutoryNet = Math.max(0, gross - nssf - paye);
  const paid = Number(data.netSalary || statutoryNet);
  const taxable = Number(data.taxableIncome ?? gross);
  const per = periodDates(data.month);

  // Header band
  doc.setFillColor(...G); doc.rect(0, 0, w, 34, 'F');
  doc.setFillColor(...GOLD); doc.rect(0, 34, w, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('GREAT AGRO COFFEE', L, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('A member of Hello YEDA COFFEE COMPANY LIMITED', L, 20);
  doc.text('P.O Box 431420, Kasese, Uganda', L, 25);
  doc.text('greatpearlcoffeesystem.site', L, 30);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('PAYSLIP', R, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(`No. ${x.payslipNo}`, R, 20, { align: 'right' });
  doc.text(`Pay period: ${data.month}`, R, 25, { align: 'right' });
  doc.text(`${per.start} - ${per.end}`, R, 30, { align: 'right' });

  let y = 43;
  const section = (title: string) => {
    doc.setFillColor(237, 244, 240); doc.rect(L, y, R - L, 6.5, 'F');
    doc.setTextColor(...G); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(title, L + 2, y + 4.5); y += 9;
  };
  const kv = (pairs: [string, string][]) => {
    const colW = (R - L) / 2;
    pairs.forEach(([k, v], i) => {
      const cx = L + 2 + (i % 2) * colW, cy = y + Math.floor(i / 2) * 5.6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(115, 115, 115); doc.text(k, cx, cy);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(35, 35, 35);
      doc.text(String(v || '-').slice(0, 42), cx + 31, cy);
    });
    y += Math.ceil(pairs.length / 2) * 5.6 + 2;
  };

  section('EMPLOYEE INFORMATION');
  kv([
    ['Full name', data.employeeName], ['Staff number', x.staffNo || data.employeeId || '-'],
    ['Position', x.position || data.position || '-'], ['Department', x.department || data.department || '-'],
    ['Date joined', x.joinDate || '-'], ['Employment', 'Active'],
    ['NSSF number', x.nssfNo || '-'], ['TIN', x.tin || '-'],
    ['National ID', x.nin || '-'], ['Phone', x.phone || '-'],
    ['Email', data.employeeEmail], ['Wallet account', x.wallet || '-'],
  ]);

  section('PAYMENT INFORMATION');
  kv([
    ['Payment date', data.processedDate], ['Payment method', data.paymentMethod === 'Wallet' ? 'Company staff wallet' : data.paymentMethod],
    ['Transaction ref', data.transactionId], ['Currency', 'Uganda Shillings (UGX)'],
    ['Bank', x.bank || '-'], ['Bank account', x.accountNo ? `${x.accountNo}${x.accountName ? ' (' + x.accountName + ')' : ''}` : '-'],
  ]);

  // Earnings & deductions table
  const tbl = (title: string, rows: [string, number, boolean?][], totalLabel: string, total: number, neg = false) => {
    doc.setFillColor(...G); doc.rect(L, y, R - L, 6.5, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(title, L + 2, y + 4.5); doc.text('Amount (UGX)', R - 2, y + 4.5, { align: 'right' }); y += 6.5;
    rows.forEach(([k, v], i) => {
      if (i % 2) { doc.setFillColor(248, 250, 249); doc.rect(L, y, R - L, 6, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50); doc.text(k, L + 2, y + 4.2);
      doc.text((neg && v ? '- ' : '') + Math.round(v).toLocaleString('en-US'), R - 2, y + 4.2, { align: 'right' });
      y += 6;
    });
    doc.setDrawColor(...G); doc.setLineWidth(0.3); doc.line(L, y, R, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...G);
    doc.text(totalLabel, L + 2, y + 4.5); doc.text((neg && total ? '- ' : '') + Math.round(total).toLocaleString('en-US'), R - 2, y + 4.5, { align: 'right' });
    y += 9;
  };
  tbl('EARNINGS', [['Basic salary', gross], ['Allowances', 0], ['Overtime / bonus', 0]], 'Gross pay', gross);
  tbl('STATUTORY DEDUCTIONS', [['NSSF employee contribution (5%)', nssf], ['PAYE income tax (URA)', paye]], 'Total statutory deductions', nssf + paye, true);

  // Net pay box
  doc.setFillColor(...G); doc.roundedRect(L, y, R - L, 17, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('NET SALARY PAID', L + 4, y + 7);
  doc.setFontSize(15); doc.text(ugx(paid), R - 4, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5);
  doc.text(`${words(paid)} Uganda Shillings only`, L + 4, y + 13.5);
  y += 22;

  if (adv > 0) {
    tbl('RECOVERIES TAKEN FROM WALLET AFTER PAYMENT', [['Salary advance / other recoveries', adv]], 'Balance remaining in wallet from this salary', Math.max(0, paid - adv));
  }

  // Summary boxes: employer + YTD
  const half = (R - L - 4) / 2;
  const box = (bx: number, title: string, rows: [string, string][]) => {
    doc.setDrawColor(210, 220, 214); doc.setLineWidth(0.3); doc.roundedRect(bx, y, half, 8 + rows.length * 5.2, 1.5, 1.5);
    doc.setTextColor(...G); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(title, bx + 3, y + 5.5);
    rows.forEach(([k, v], i) => {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100); doc.setFontSize(7.8); doc.text(k, bx + 3, y + 11 + i * 5.2);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(35, 35, 35); doc.text(v, bx + half - 3, y + 11 + i * 5.2, { align: 'right' });
    });
  };
  box(L, 'EMPLOYER CONTRIBUTIONS', [['NSSF employer (10%)', ugx(nssfEr)], ['Total NSSF remitted (15%)', ugx(nssf + nssfEr)], ['Taxable income', ugx(taxable)]]);
  box(L + half + 4, `YEAR TO DATE (${x.monthsPaid} month${x.monthsPaid === 1 ? '' : 's'})`, [['Gross pay', ugx(x.ytdGross)], ['NSSF + PAYE', ugx(x.ytdNssf + x.ytdPaye)], ['Net salary paid', ugx(x.ytdNet)]]);
  y += 8 + 3 * 5.2 + 6;

  // Certification + QR
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.line(L, y, R, y); y += 5;
  doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('EMPLOYER CERTIFICATION', L, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8);
  const cert = doc.splitTextToSize(`This is to certify that ${data.employeeName} is employed by Great Agro Coffee and that the salary shown above for ${data.month} was paid by the company. NSSF and PAYE shown are withheld for remittance to NSSF and the Uganda Revenue Authority. This payslip is issued by the company payroll system; scan the QR code or visit the address below to confirm it is genuine.`, R - L - 40);
  doc.text(cert, L, y + 5);
  if (x.qr) doc.addImage(x.qr, 'PNG', R - 32, y - 2, 32, 32);
  y += 5 + cert.length * 3.6 + 4;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...G); doc.setFontSize(8);
  doc.text(`Verification code: ${x.verifyCode}`, L, y);
  doc.setFont('helvetica', 'normal'); doc.text(`greatpearlcoffeesystem.site/verify/${x.verifyCode}`, L, y + 4.5);
  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...G); doc.rect(0, ph - 10, w, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7);
  doc.text(`Confidential - issued to ${data.employeeName}. Generated ${data.processedDate} by the Great Agro Coffee payroll system.`, w / 2, ph - 4, { align: 'center' });

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  { const __deny = await requireInternalOrAdmin(req, corsHeaders); if (__deny) return __deny; }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PayslipData = await req.json();

    // Generate PDF
    const email = body.employeeEmail.toLowerCase();
    const { data: emp } = await supabase.from('employees').select('employee_id,position,department,join_date,nssf_number,tin_number,national_id_number,phone,bank_name,account_name,account_number,wallet_account_number').ilike('email', email).maybeSingle();
    const yr = (body.month.match(/\d{4}/) || [String(new Date().getFullYear())])[0];
    const { data: ytdRows } = await supabase.from('employee_salary_payments').select('payment_month,gross_salary,nssf_employee,paye,net_salary').ilike('employee_email', email).eq('status', 'completed').like('payment_month', `%${yr}`);
    const order = (m: string) => new Date(`1 ${m}`).getTime() || 0;
    const upto = (ytdRows || []).filter((r: any) => order(r.payment_month) <= order(body.month));
    const sum = (k: string) => upto.reduce((t: number, r: any) => t + Number(r[k] || 0), 0);
    const verifyCode = `DOC-PAY-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
    const payslipNo = `PS-${yr}-${String(body.transactionId || verifyCode).replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()}`;
    const ver = await supabase.from('verifications').upsert({ code: verifyCode, type: 'document', subtype: 'payslip', status: 'verified', issued_to_name: body.employeeName, issued_at: new Date().toISOString(), reference_no: `Payslip ${payslipNo} - ${body.month}`, meta: { title: `Payslip - ${body.month}`, format: 'pdf', employee_name: body.employeeName, pay_period: body.month, payslip_no: payslipNo, net_salary_paid: Number(body.netSalary || 0), generated_by: 'Payroll system', verification_scope: 'Confirms this payslip was issued by the company payroll system for the named employee and period.' } }, { onConflict: 'code' });
    if (ver.error) throw new Error(`Payslip verification failed: ${ver.error.message}`);
    const { default: QRCode } = await import('npm:qrcode@1.5.4');
    const qr = await QRCode.toDataURL(`https://greatpearlcoffeesystem.site/verify/${verifyCode}`, { width: 192, margin: 1 });
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined;
    const pdfBytes = generatePayslipPDF(body, {
      payslipNo, verifyCode, qr, position: emp?.position, department: emp?.department, staffNo: emp?.employee_id, joinDate: fmtDate(emp?.join_date),
      nssfNo: emp?.nssf_number, tin: emp?.tin_number, nin: emp?.national_id_number, phone: emp?.phone, bank: emp?.bank_name,
      accountName: emp?.account_name, accountNo: emp?.account_number, wallet: emp?.wallet_account_number,
      ytdGross: sum('gross_salary'), ytdNssf: sum('nssf_employee'), ytdPaye: sum('paye'), ytdNet: sum('net_salary'), monthsPaid: upto.length,
    });

    const sanitizedName = body.employeeName.replace(/[^a-zA-Z0-9]/g, '_');
    const monthSlug = body.month.replace(/\s+/g, '_');
    const fileName = `secured-payslips/${crypto.randomUUID()}/payslip_${sanitizedName}_${monthSlug}.pdf`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('statements')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload payslip: ${uploadError.message}`);
    }

    const { data: access, error: accessError } = await supabase.from('payslip_access_records').insert({
      employee_email: body.employeeEmail.toLowerCase(), storage_path:fileName, label:`Payslip ${body.month}.pdf`,
    }).select('id').single();
    if (accessError || !access) throw new Error('Failed to register protected payslip access');

    console.log('Payslip PDF generated');

    return new Response(JSON.stringify({
      success: true,
      url: `https://greatpearlcoffeesystem.site/payslip/${access.id}`,
      fileName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating payslip:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
