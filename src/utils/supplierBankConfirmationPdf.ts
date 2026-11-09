import { jsPDF } from 'jspdf';
import { COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONES, COMPANY_EMAIL } from './companyBrand';

// Business-name certificate supplied for this letter; not the parent/company incorporation record.
export const SUPPLIER_LETTER_REGISTRATION = 'Business Name Registration No. 8003082157051';

export function buildSupplierBankConfirmationPdf(logo: string) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  doc.setProperties({ title: 'Supplier Advance Confirmation - Bwambale James', author: COMPANY_NAME });
  doc.addImage(logo, 'PNG', 18, 15, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(COMPANY_NAME, 47, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(COMPANY_TAGLINE, 47, 29);
  doc.text(COMPANY_ADDRESS, 47, 35);
  doc.setFontSize(8);
  doc.text(SUPPLIER_LETTER_REGISTRATION, 18, 45);
  doc.text(`${COMPANY_PHONES} | ${COMPANY_EMAIL}`, 18, 50);
  doc.line(18, 54, 192, 54);
  doc.setFontSize(10.5);
  doc.text('9 November 2026', 18, 64);
  doc.text(['The Branch Manager', 'Equity Bank', 'Kasese Branch'], 18, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const subject = ['RE: CONFIRMATION OF SOURCE OF FUNDS - UGX 20,000,000', 'ACCOUNT HOLDER: BWAMBALE JAMES | ACCOUNT NO. 1022101523938'];
  doc.text(subject, 18, 96);
  let y = 96 + subject.length * 5 + 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Dear Sir/Madam,', 18, y);
  y += 10;
  const paragraphs = [
    'We hereby confirm that UGX 20,000,000 (Uganda Shillings Twenty Million only) deposited into the above-mentioned Equity Bank account held by Mr. Bwambale James originated from Great Agro Coffee.',
    'This payment constitutes a supplier advance to Mr. Bwambale James for the supply of coffee during the 2026/2027 main season.',
    'The funds were disbursed from Great Agro Coffee\'s account held with Stanbic Bank to Twekyo, the agent banking intermediary acting on our behalf. Twekyo subsequently deposited the funds into Mr. Bwambale James\'s Equity Bank account, number 1022101523938.',
    'Accordingly, we confirm that Great Agro Coffee was the source of the funds and that Twekyo made the deposit on our behalf for the business purpose stated above. This letter is issued at your request as confirmation of the source and purpose of the deposit.',
    'Please contact the undersigned should you require any further clarification or supporting transaction documentation.',
  ];
  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph, 174);
    doc.text(lines, 18, y, { lineHeightFactor: 1.3 });
    y += lines.length * 4.82 + 5;
  }
  doc.text('Yours faithfully,', 18, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('For and on behalf of Great Agro Coffee', 18, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(['Name: __________________________________', 'Designation: ______________________________', 'Signature: _________________________________', 'Telephone: ________________________________'], 18, y, { lineHeightFactor: 1.7 });
  doc.text('Company stamp', 146, y + 8);
  return doc;
}