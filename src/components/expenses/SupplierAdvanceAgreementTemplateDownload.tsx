import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Handshake, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

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

export const generateSupplierAdvanceAgreementForm = async () => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  const logoData = await loadImageAsBase64(LOGO_URL);

  const drawHeader = (subtitle: string) => {
    if (logoData) {
      try { doc.addImage(logoData, 'PNG', margin, 6, 16, 16); } catch { /* ignore */ }
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('GREAT AGRO COFFEE', margin + 20, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 20, 16.5);
    doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103', margin + 20, 20);
    doc.text('info@greatpearlcoffee.com', margin + 20, 23);
    doc.setLineWidth(0.5);
    doc.line(margin, 26, pageW - margin, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(subtitle, pageW / 2, 32, { align: 'center' });
    doc.setLineWidth(0.35);
    y = 37;
  };

  const drawFooter = (pageNo: number, total: number) => {
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(
      'Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda',
      pageW / 2, pageH - 9, { align: 'center' },
    );
    doc.text(`Page ${pageNo} of ${total}`, pageW - margin, pageH - 9, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const ensure = (needed: number, subtitle: string) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      drawHeader(subtitle);
    }
  };

  // ---------------- PAGE 1 : particulars ----------------
  drawHeader('SUPPLIER ADVANCE AGREEMENT & UNDERTAKING');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Advance Ref: ______________________', pageW - margin, 32, { align: 'right' });

  const rowH = 10.5;
  const half = contentW / 2;
  const cell = (label: string, x: number, w: number, yy: number) => {
    doc.rect(x, yy, w, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(label, x + 2, yy + 4);
  };

  cell('ADVANCE REFERENCE NO. (e.g. GAC-ADV-2609-0001)', margin, half, y);
  cell('ISSUE DATE', margin + half, half, y);
  y += rowH;
  cell('CROP YEAR / SEASON', margin, half, y);
  cell('AMOUNT AWARDED (UGX, in figures)', margin + half, half, y);
  y += rowH;
  doc.rect(margin, y, contentW, rowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.text('AMOUNT AWARDED (in words)', margin + 2, y + 3.4);
  y += rowH;
  cell('SUPPLIER / BUSINESS NAME', margin, half, y);
  cell('SUPPLIER CODE', margin + half, half, y);
  y += rowH;
  cell('NATIONAL ID (NIN) / PASSPORT NO.', margin, half, y);
  cell('TELEPHONE / MOBILE MONEY NO.', margin + half, half, y);
  y += rowH;
  cell('PHYSICAL ADDRESS (Village, Parish, Sub-county, District)', margin, contentW, y);
  y += rowH;
  cell('COFFEE TYPE(S) TO BE DELIVERED', margin, half, y);
  cell('AGREED PRICE BASIS (UGX / Kg)', margin + half, half, y);
  y += rowH;
  cell('TOTAL KILOGRAMS PLEDGED AGAINST THIS ADVANCE', margin, half, y);
  cell('FINAL RECOVERY / EXPIRY DATE', margin + half, half, y);
  y += rowH;
  cell('DISBURSEMENT MODE (Cash / MoMo / Bank)', margin, half, y);
  cell('EXPECTED FIRST DELIVERY DATE', margin + half, half, y);
  y += rowH + 5;

  // Recovery method selection
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RECOVERY METHOD (tick one)', margin, y);
  y += 4;
  doc.rect(margin, y, contentW, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.rect(margin + 4, y + 4, 4, 4);
  doc.text('RECOVERY THROUGH DELIVERIES — deducted per kilogram/consignment delivered until fully cleared.', margin + 11, y + 8);
  doc.rect(margin + 4, y + 12, 4, 4);
  doc.text('RECOVERY AT ONCE (LUMP SUM) — full repayment in cash on or before the recovery date above.', margin + 11, y + 16);
  y += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Deduction rate per delivery (if by deliveries): ________ UGX/Kg or ________ % of consignment value.', margin, y);
  y += 5.5;
  doc.text('Lump-sum repayment date (if at once): ______________________________', margin, y);
  y += 9;

  // ---------------- PAGES 2-3 : terms ----------------
  doc.addPage();
  drawHeader('TERMS AND CONDITIONS OF THE ADVANCE');

  const clauses: [string, string[]][] = [
    ['1. DEFINITIONS AND PARTIES', [
      '"The Company" means GREAT AGRO COFFEE, a member of YEDA Coffee Company Limited, of P.O Box 431420, Kasese, Uganda. "The Supplier" means the person or business named overleaf who receives the advance. "The Advance" means the sum of money awarded to the Supplier as stated overleaf, together with any charges, costs and recovery expenses arising under this Agreement. "Crop Year" means the coffee season stated overleaf during which the pledged coffee is to be delivered.',
    ]],
    ['2. PURPOSE OF THE ADVANCE', [
      'The Advance is issued strictly as working capital to enable the Supplier to purchase, prepare, transport and deliver clean coffee to the Company during the stated Crop Year. It is not a gift, donation, bonus or payment for coffee already delivered. Diversion of the Advance to any other use, including on-lending to third parties, is a fundamental breach of this Agreement.',
    ]],
    ['3. ACKNOWLEDGEMENT OF DEBT', [
      'By signing this Agreement the Supplier acknowledges receipt of the Advance and admits it as a liquidated debt owed to the Company. This Agreement shall serve as a written acknowledgement of debt and may be produced in any court of law or before any authority as conclusive evidence of the amount owed.',
    ]],
    ['4. RECOVERY THROUGH DELIVERIES', [
      'Where the recovery method ticked overleaf is recovery through deliveries, the Company shall deduct from the value of every consignment delivered by the Supplier the agreed amount per kilogram or the agreed percentage of consignment value, until the Advance is cleared in full. The Supplier may not demand full cash payment for a consignment while the Advance remains outstanding. Deductions shall be shown on each Goods Received Note (GRN) and payment voucher, and a running statement shall be available to the Supplier on request.',
    ]],
    ['5. RECOVERY AT ONCE (LUMP SUM)', [
      'Where the recovery method ticked overleaf is recovery at once, the Supplier shall repay the entire Advance in cash, mobile money or bank transfer on or before the repayment date stated overleaf, whether or not any coffee has been delivered. Part-payments shall be applied first to costs and charges, then to the principal.',
    ]],
    ['6. QUALITY, WEIGHT AND PRICING', [
      'All coffee delivered against this Advance must meet the Company quality standards, including maximum moisture content of 13.0%, acceptable defect counts, absence of foreign matter and freedom from off-odours. Weight and quality determined at the Company store by the Quality Department shall be final for purposes of recovery. Coffee rejected on quality grounds shall not count towards recovery of the Advance.',
    ]],
    ['7. DELAYED DELIVERIES', [
      'Time is of the essence. If the Supplier fails to deliver by any due date in the delivery schedule, the Company may, without further notice: (a) declare the whole outstanding Advance immediately due and payable; (b) apply a delayed-delivery charge on the outstanding balance at the rate communicated at issue; (c) suspend all further advances, bookings and contracts held by the Supplier; and (d) set off the outstanding balance against any other money, coffee, deposit or security of the Supplier held by the Company or by any affiliated company.',
    ]],
    ['8. DEFAULT', [
      'The Supplier shall be in default if the Supplier: fails to deliver the pledged quantity within the Crop Year; fails to repay on the due date; sells coffee purchased with the Advance to any third party; gives false information, false identity or false security; becomes insolvent; or absconds, relocates or becomes unreachable for fourteen (14) consecutive days.',
    ]],
    ['9. SIDE-SELLING', [
      'Selling, pledging or diverting to any other buyer coffee purchased with the Company Advance is expressly prohibited. The Company treats side-selling as obtaining money by false pretence and as a conversion of the Company property, and reserves the right to pursue both civil recovery and criminal prosecution.',
    ]],
    ['10. SECURITY', [
      'The Company may require security, which may include a land agreement, logbook, stock pledge, post-dated cheque, or other collateral acceptable to the Company. The Supplier agrees that the Company may enforce its security in accordance with the terms of the security document or applicable law without first obtaining a court order where the law permits.',
    ]],
  ];

  const clauses2: [string, string[]][] = [
    ['11. DEMAND AND RECOVERY PROCEDURE', [
      'On default the Company shall issue a written demand notice by letter, email, SMS or WhatsApp to the contacts given overleaf, requiring settlement within seven (7) days. If the balance is not cleared within that period, the Company may instruct its advocates or a licensed debt collection agent, and all resulting fees, costs and disbursements shall be added to and recoverable as part of the debt.',
    ]],
    ['12. INVOLVEMENT OF THE LAW / LEGAL ACTION', [
      'The Supplier expressly acknowledges that on default the Company may: (a) file a civil suit for recovery of the outstanding sum, charges, interest and costs in the Magistrate\'s Court or the High Court of Uganda having jurisdiction; (b) lodge a criminal complaint with the Uganda Police Force where the facts disclose obtaining money by false pretence, embezzlement, fraud or conversion, which may lead to arrest, detention, being charged in court and prosecution in accordance with the laws of Uganda; (c) apply for attachment and sale of the Supplier\'s property, garnishee orders or any other execution remedy granted by court; and (d) report the Supplier to industry bodies, credit reference bureaus and other coffee buyers.',
    ]],
    ['13. ARREST AND CRIMINAL LIABILITY', [
      'The Supplier understands that criminal proceedings, including arrest by the Police and remand by a court of law, are matters entirely within the discretion of the State once a complaint is lodged, and that settlement of the civil debt does not automatically terminate criminal proceedings already commenced. Nothing in this Agreement shall be read as the Company waiving its right to report a criminal offence.',
    ]],
    ['14. COSTS OF RECOVERY', [
      'The Supplier shall bear all costs of recovery on an advocate-client basis, including legal fees, court fees, police facilitation where lawfully payable, transport, tracing costs, auctioneer fees and any other reasonable expense incurred by the Company in recovering the Advance.',
    ]],
    ['15. SET-OFF AND LIEN', [
      'The Company may at any time set off the outstanding balance against any sum payable to the Supplier under this or any other transaction, and shall have a lien over any coffee, goods, documents or property of the Supplier in its possession until the Advance is cleared in full.',
    ]],
    ['16. DEATH, INCAPACITY OR DISSOLUTION', [
      'In the event of the death, incapacity or dissolution of the Supplier, the outstanding balance shall become immediately payable and shall be recoverable from the estate, successors, administrators, partners or guarantors of the Supplier.',
    ]],
    ['17. FORCE MAJEURE', [
      'Neither party shall be liable for failure caused by events genuinely beyond its control, including natural disaster, epidemic, civil unrest or government directive. The Supplier must notify the Company in writing within seven (7) days of the event. Force majeure suspends delivery obligations only and does not extinguish the debt.',
    ]],
    ['18. VARIATION AND WAIVER', [
      'No variation of this Agreement is valid unless in writing and signed by an authorised officer of the Company. Any indulgence, delay or partial acceptance by the Company shall not be treated as a waiver of any of its rights.',
    ]],
    ['19. DATA AND COMMUNICATION CONSENT', [
      'The Supplier consents to the Company processing the Supplier\'s personal data for purposes of this Agreement, to receiving SMS, email and WhatsApp notices on the contacts provided, and to the Company sharing default information with its advocates, agents, financiers and law-enforcement authorities.',
    ]],
    ['20. GOVERNING LAW AND JURISDICTION', [
      'This Agreement is governed by the laws of the Republic of Uganda. The parties submit to the jurisdiction of the courts of Uganda, with Kasese as the preferred place of filing. The parties may, by mutual written consent, first attempt amicable settlement or mediation, but this shall not delay the Company from taking urgent recovery or protective action.',
    ]],
    ['21. ENTIRE AGREEMENT AND SEVERABILITY', [
      'This Agreement, together with the particulars overleaf, constitutes the entire agreement between the parties concerning the Advance and supersedes any prior verbal understanding. If any clause is held unenforceable, the remaining clauses shall continue in full force.',
    ]],
  ];

  const renderClauses = (list: [string, string[]][], subtitle: string) => {
    list.forEach(([heading, paras]) => {
      ensure(16, subtitle);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.text(heading, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      paras.forEach((p) => {
        const lines = doc.splitTextToSize(p, contentW) as string[];
        lines.forEach((ln) => {
          ensure(6, subtitle);
          doc.text(ln, margin, y);
          y += 3.6;
        });
      });
      y += 3;
    });
  };

  renderClauses(clauses, 'TERMS AND CONDITIONS OF THE ADVANCE (cont.)');
  renderClauses(clauses2, 'TERMS AND CONDITIONS OF THE ADVANCE (cont.)');

  // ---------------- Declaration & signatures ----------------
  ensure(90, 'DECLARATION AND EXECUTION');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.text('DECLARATION BY THE SUPPLIER', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  const decl =
    'I confirm that the particulars given by me are true, that this Agreement has been read out and explained to me in a language I understand, that I have received the Advance stated overleaf, and that I accept all the terms above including recovery through deliveries or at once, delayed-delivery charges, civil suit, arrest, prosecution and attachment of my property in the event of default.';
  (doc.splitTextToSize(decl, contentW) as string[]).forEach((ln) => {
    doc.text(ln, margin, y);
    y += 3.6;
  });
  y += 6;

  const sigBlock = (title: string, rows: string[], startY: number, w: number, xPos: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.text(title, xPos, startY);
    let yy = startY + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    rows.forEach((r) => {
      doc.text(r, xPos, yy);
      doc.setLineWidth(0.25);
      doc.line(xPos + doc.getTextWidth(r) + 2, yy + 0.8, xPos + w, yy + 0.8);
      yy += 7;
    });
    return yy;
  };

  const colW = (contentW - 10) / 2;
  const leftEnd = sigBlock('SUPPLIER', ['Name:', 'NIN:', 'Signature / Thumbprint:', 'Date:'], y, colW, margin);
  const rightEnd = sigBlock('WITNESS (Company Officer)', ['Name:', 'Title:', 'Signature:', 'Date:'], y, colW, margin + colW + 10);
  y = Math.max(leftEnd, rightEnd) + 6;

  ensure(40, 'DECLARATION AND EXECUTION');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.text('FOR AND ON BEHALF OF GREAT AGRO COFFEE', margin, y);
  y += 5;
  const a1 = sigBlock('Approved By — Administrator', ['Name:', 'Signature:', 'Date:'], y, colW, margin);
  const a2 = sigBlock('Verified By — Finance / Procurement', ['Name:', 'Signature:', 'Date:'], y, colW, margin + colW + 10);
  y = Math.max(a1, a2) + 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.text('Company stamp: ______________________', margin, y + 4);

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFooter(p, total);
  }

  doc.save('Supplier-Advance-Agreement-Form.pdf');
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

const SupplierAdvanceAgreementTemplateDownload = () => {
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    try {
      setBusy(true);
      await generateSupplierAdvanceAgreementForm();
      toast({
        title: 'Advance agreement ready',
        description: 'PDF downloaded and print preview opened — issue it to the supplier for signing.',
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate the template.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Handshake className="h-5 w-5 text-primary" />
          Supplier Advance Agreement & Undertaking
        </CardTitle>
        <CardDescription className="text-xs">
          Legal advance contract issued to suppliers for signing. Captures advance reference, issue date,
          crop year, amount awarded (figures & words), supplier and security details, and recovery method
          (through deliveries or at once). Includes 21 detailed clauses covering side-selling, delayed
          deliveries, default, demand notices, legal action, arrest and prosecution, attachment of property,
          costs of recovery, set-off and governing law — plus supplier, witness and company signature blocks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerate} disabled={busy} className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Advance Agreement
        </Button>
      </CardContent>
    </Card>
  );
};

export default SupplierAdvanceAgreementTemplateDownload;
