import { jsPDF } from 'jspdf';
import { COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONES, COMPANY_EMAIL } from './companyBrand';

// Business-name certificate supplied for this letter; not the parent/company incorporation record.
export const SUPPLIER_LETTER_REGISTRATION = 'Business Name Registration No: 8003082157051 | Registered: 9 March 2026';

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
  const subject = doc.splitTextToSize('RE: CONFIRMATION OF SOURCE AND PURPOSE OF UGX 20,000,000 DEPOSIT - BWAMBALE JAMES, ACCOUNT NO. 1022101523938', 174);
  doc.text(subject, 18, 96);
  let y = 96 + subject.length * 5 + 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Dear Sir/Madam,', 18, y);
  y += 10;
  const paragraphs = [
    'We write to confirm that UGX 20,000,000 (Uganda Shillings Twenty Million only) deposited into the Equity Bank account of Bwambale James, account number 1022101523938, originated from Great Agro Coffee.',
    'The funds were provided to Mr. Bwambale James as a supplier advance for coffee supplies during the 2026/2027 main season.',
    'Great Agro Coffee disbursed the funds from its company account held with Stanbic Bank through Twekyo, the agent banking intermediary acting on our behalf. Twekyo subsequently deposited the funds into the supplier\'s above-mentioned Equity Bank account.',
    'We therefore confirm that Great Agro Coffee was the source of the funds and that the deposit was made on our behalf for the stated supplier advance. Kindly accept this letter as confirmation of the source and business purpose of the deposit.',
    'Should you require further clarification or supporting transaction records, please contact the undersigned.',
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