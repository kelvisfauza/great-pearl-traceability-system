import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="https://esm.sh/jspdf@2.5.1"
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

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

function generatePayslipPDF(data: PayslipData): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── Company Header ──
  doc.setFillColor(26, 86, 50); // #1a5632
  doc.rect(0, 0, w, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Great Agro Coffee', w / 2, y + 2, { align: 'center' });

  y += 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Coffee Excellence \u2022 P.O. Box 000, Kampala, Uganda', w / 2, y, { align: 'center' });

  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT SLIP', w / 2, y, { align: 'center' });

  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.month, w / 2, y, { align: 'center' });

  y = 50;

  // ── Employee Info ──
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS', 15, y);
  y += 2;
  doc.setDrawColor(26, 86, 50);
  doc.setLineWidth(0.5);
  doc.line(15, y, w - 15, y);
  y += 7;

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const infoRows = [
    ['Employee Name:', data.employeeName],
    ['Employee ID:', data.employeeId || '—'],
    ['Department:', data.department || '—'],
    ['Position:', data.position || '—'],
    ['Payment Method:', data.paymentMethod],
    ['Transaction Ref:', data.transactionId],
    ['Processed Date:', data.processedDate],
  ];

  for (const [label, value] of infoRows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(String(value), 65, y);
    y += 6;
  }

  y += 5;

  // ── Salary Breakdown Table ──
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SALARY BREAKDOWN', 15, y);
  y += 2;
  doc.line(15, y, w - 15, y);
  y += 3;

  // Table header
  doc.setFillColor(240, 247, 243);
  doc.rect(15, y, w - 30, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 86, 50);
  doc.text('Description', 18, y + 5.5);
  doc.text('Amount (UGX)', w - 18, y + 5.5, { align: 'right' });
  y += 10;

  // Gross salary row
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text('Basic / Gross Salary', 18, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`UGX ${data.grossSalary.toLocaleString()}`, w - 18, y + 5, { align: 'right' });
  doc.setDrawColor(230, 230, 230);
  doc.line(15, y + 8, w - 15, y + 8);
  y += 10;

  // Deductions
  if (data.advanceDeduction > 0) {
    doc.setFillColor(255, 248, 225);
    doc.rect(15, y, w - 30, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 81, 0);
    doc.setFontSize(8);
    doc.text('DEDUCTIONS', 18, y + 5);
    y += 9;

    if (data.advanceDetails && data.advanceDetails.length > 0) {
      for (const adv of data.advanceDetails) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text('Salary Advance Recovery', 18, y + 5);
        doc.setTextColor(198, 40, 40);
        doc.text(`- UGX ${adv.deduction.toLocaleString()}`, w - 18, y + 5, { align: 'right' });
        doc.setDrawColor(230, 230, 230);
        doc.line(15, y + 8, w - 15, y + 8);
        y += 10;
      }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text('Salary Advance Recovery', 18, y + 5);
      doc.setTextColor(198, 40, 40);
      doc.text(`- UGX ${data.advanceDeduction.toLocaleString()}`, w - 18, y + 5, { align: 'right' });
      doc.line(15, y + 8, w - 15, y + 8);
      y += 10;
    }

    // Total deductions row
    doc.setFillColor(255, 235, 238);
    doc.rect(15, y, w - 30, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(198, 40, 40);
    doc.setFontSize(9);
    doc.text('Total Deductions', 18, y + 5.5);
    doc.text(`- UGX ${data.advanceDeduction.toLocaleString()}`, w - 18, y + 5.5, { align: 'right' });
    y += 12;
  }

  // ── NET PAY BOX ──
  y += 3;
  doc.setFillColor(26, 86, 50);
  doc.roundedRect(15, y, w - 30, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 22, y + 10.5);
  doc.setFontSize(16);
  doc.text(`UGX ${data.netSalary.toLocaleString()}`, w - 22, y + 10.5, { align: 'right' });

  y += 25;

  // ── Note ──
  if (data.advanceDeduction > 0) {
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(15, y, w - 30, 12, 2, 2, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Note: A salary advance deduction has been applied. This was previously approved', 20, y + 5);
    doc.text('and auto-recovered from your payroll.', 20, y + 9);
    y += 16;
  }

  // ── Footer ──
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, y, w - 15, y);
  y += 8;

  doc.setTextColor(170, 170, 170);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated payslip and does not require a signature.', w / 2, y, { align: 'center' });
  y += 5;
  doc.text('For queries, please contact the HR or Finance department.', w / 2, y, { align: 'center' });
  y += 5;
  const year = new Date().getFullYear();
  doc.text(`\u00A9 ${year} Great Agro Coffee \u2014 Confidential`, w / 2, y, { align: 'center' });

  // Status watermark
  doc.setTextColor(230, 245, 235);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID', w / 2, 180, { align: 'center', angle: 35 });

  return doc.output('arraybuffer') as unknown as Uint8Array;
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

    // Generate PDF
    const pdfBytes = generatePayslipPDF(body);

    const sanitizedName = body.employeeName.replace(/[^a-zA-Z0-9]/g, '_');
    const monthSlug = body.month.replace(/\s+/g, '_');
    const fileName = `payslips/${monthSlug}/payslip_${sanitizedName}_${monthSlug}.pdf`;

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

    const { data: urlData } = supabase.storage
      .from('statements')
      .getPublicUrl(fileName);

    console.log(`\u2705 Payslip PDF generated for ${body.employeeName}: ${urlData.publicUrl}`);

    return new Response(JSON.stringify({ 
      success: true, 
      url: urlData.publicUrl,
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
