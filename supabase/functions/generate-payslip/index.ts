import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  advanceDetails?: Array<{
    advance_id: string;
    original_amount: number;
    deduction: number;
    remaining_after: number;
  }>;
}

function generatePayslipHTML(data: PayslipData): string {
  const advanceRows = (data.advanceDetails || []).map(a => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd;font-size:12px;">Salary Advance Recovery</td>
      <td style="padding:6px 10px;border:1px solid #ddd;font-size:12px;text-align:right;color:#c62828;">UGX ${a.deduction.toLocaleString()}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; color: #333; }
  .header { display: flex; align-items: center; border-bottom: 3px solid #1a5632; padding-bottom: 15px; margin-bottom: 20px; }
  .logo-area { flex-shrink: 0; margin-right: 20px; }
  .logo-area img { height: 60px; }
  .company-info { flex: 1; }
  .company-name { font-size: 22px; font-weight: bold; color: #1a5632; margin: 0; }
  .company-tagline { font-size: 11px; color: #777; margin: 2px 0 0; }
  .slip-title { text-align: center; font-size: 18px; font-weight: bold; color: #1a5632; margin: 25px 0 5px; text-transform: uppercase; letter-spacing: 1px; }
  .slip-period { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; }
  .info-grid { display: flex; gap: 30px; margin-bottom: 20px; }
  .info-block { flex: 1; background: #f8faf9; border-radius: 6px; padding: 12px 15px; border: 1px solid #e0e8e3; }
  .info-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .info-value { font-size: 13px; font-weight: 600; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #1a5632; color: white; padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 600; }
  th:last-child { text-align: right; }
  td { padding: 8px 10px; border: 1px solid #ddd; font-size: 13px; }
  .total-row { background: #f0f7f3; font-weight: bold; }
  .total-row td { border: 2px solid #1a5632; font-size: 14px; color: #1a5632; }
  .net-box { background: #1a5632; color: white; border-radius: 8px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; margin: 20px 0; }
  .net-label { font-size: 14px; font-weight: 600; }
  .net-amount { font-size: 22px; font-weight: bold; }
  .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; }
  .footer-grid { display: flex; gap: 30px; }
  .footer-block { flex: 1; }
  .footer-label { font-size: 10px; color: #888; text-transform: uppercase; }
  .footer-value { font-size: 12px; color: #333; margin-top: 2px; }
  .disclaimer { margin-top: 25px; font-size: 10px; color: #999; text-align: center; border-top: 1px dashed #ddd; padding-top: 10px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(26, 86, 50, 0.04); font-weight: bold; pointer-events: none; z-index: -1; }
</style>
</head>
<body>
<div class="watermark">PAYSLIP</div>

<div class="header">
  <div class="logo-area">
    <img src="https://great-pearl-traceability-system.lovable.app/lovable-uploads/great-agro-coffee-logo.png" alt="Logo" style="height:60px;" />
  </div>
  <div class="company-info">
    <p class="company-name">Great Agro Coffee</p>
    <p class="company-tagline">Coffee Excellence • Since Inception</p>
    <p style="font-size:11px;color:#666;margin:2px 0 0;">P.O. Box 000, Kampala, Uganda</p>
  </div>
</div>

<div class="slip-title">Payment Slip</div>
<div class="slip-period">${data.month}</div>

<div class="info-grid">
  <div class="info-block">
    <div class="info-label">Employee Name</div>
    <div class="info-value">${data.employeeName}</div>
  </div>
  <div class="info-block">
    <div class="info-label">Employee ID</div>
    <div class="info-value">${data.employeeId || '—'}</div>
  </div>
  <div class="info-block">
    <div class="info-label">Department</div>
    <div class="info-value">${data.department || '—'}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-block">
    <div class="info-label">Position</div>
    <div class="info-value">${data.position || '—'}</div>
  </div>
  <div class="info-block">
    <div class="info-label">Payment Method</div>
    <div class="info-value">${data.paymentMethod}</div>
  </div>
  <div class="info-block">
    <div class="info-label">Transaction Ref</div>
    <div class="info-value">${data.transactionId}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:right;">Amount (UGX)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:8px 10px;border:1px solid #ddd;">Basic / Gross Salary</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-weight:600;">UGX ${data.grossSalary.toLocaleString()}</td>
    </tr>
    ${data.advanceDeduction > 0 ? `
    <tr>
      <td colspan="2" style="padding:6px 10px;border:1px solid #ddd;background:#fff8e1;font-weight:600;font-size:12px;color:#e65100;">DEDUCTIONS</td>
    </tr>
    ${advanceRows || `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd;font-size:12px;">Salary Advance Recovery</td>
      <td style="padding:6px 10px;border:1px solid #ddd;font-size:12px;text-align:right;color:#c62828;">UGX ${data.advanceDeduction.toLocaleString()}</td>
    </tr>`}
    <tr class="total-row">
      <td>Total Deductions</td>
      <td style="text-align:right;color:#c62828;">UGX ${data.advanceDeduction.toLocaleString()}</td>
    </tr>
    ` : ''}
  </tbody>
</table>

<div class="net-box">
  <span class="net-label">NET PAY</span>
  <span class="net-amount">UGX ${data.netSalary.toLocaleString()}</span>
</div>

<div class="footer">
  <div class="footer-grid">
    <div class="footer-block">
      <div class="footer-label">Processed Date</div>
      <div class="footer-value">${data.processedDate}</div>
    </div>
    <div class="footer-block">
      <div class="footer-label">Processed By</div>
      <div class="footer-value">Finance Department</div>
    </div>
    <div class="footer-block">
      <div class="footer-label">Status</div>
      <div class="footer-value" style="color:#1a5632;font-weight:bold;">✓ PAID</div>
    </div>
  </div>
</div>

<div class="disclaimer">
  This is a computer-generated payslip and does not require a signature.<br/>
  For queries, please contact the HR or Finance department.<br/>
  © ${new Date().getFullYear()} Great Agro Coffee — Confidential
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PayslipData = await req.json();

    // Generate HTML payslip
    const html = generatePayslipHTML(body);

    // Convert HTML to PDF using a headless approach
    // We'll use jspdf-like approach via HTML content stored as a styled HTML file
    // Store the HTML as a downloadable file (browsers render it perfectly as a payslip)
    const sanitizedName = body.employeeName.replace(/[^a-zA-Z0-9]/g, '_');
    const monthSlug = body.month.replace(/\s+/g, '_');
    const fileName = `payslips/${monthSlug}/payslip_${sanitizedName}_${monthSlug}.html`;

    // Upload to Supabase Storage
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const { error: uploadError } = await supabase.storage
      .from('statements')
      .upload(fileName, htmlBlob, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload payslip: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('statements')
      .getPublicUrl(fileName);

    console.log(`✅ Payslip generated for ${body.employeeName}: ${urlData.publicUrl}`);

    return new Response(JSON.stringify({ 
      success: true, 
      url: urlData.publicUrl,
      fileName 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating payslip:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
