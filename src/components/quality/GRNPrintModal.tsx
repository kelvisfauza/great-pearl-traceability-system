import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { getVerificationQRUrl } from '@/utils/verificationCode';
import { Printer } from 'lucide-react';

interface GRNPrintModalProps {
  open: boolean;
  onClose: () => void;
  grnData: {
    grnNumber: string;
    supplierName: string;
    coffeeType: string;
    qualityAssessment: string;
    numberOfBags: number;
    totalKgs: number;
    unitPrice: number;
    assessedBy: string;
    createdAt: string;
    moisture?: number;
    group1_defects?: number;
    group2_defects?: number;
    below12?: number;
    pods?: number;
    husks?: number;
    stones?: number;
  } | null;
}

const GRNPrintModal: React.FC<GRNPrintModalProps> = ({ open, onClose, grnData }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { createVerification } = useDocumentVerification();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);

  useEffect(() => {
    const generateVerification = async () => {
      if (open && grnData && !verificationCode) {
        const code = await createVerification({
          type: 'document',
          subtype: 'Goods Received Note (GRN)',
          issued_to_name: grnData.supplierName,
          reference_no: grnData.grnNumber,
          meta: {
            coffeeType: grnData.coffeeType,
            totalKgs: grnData.totalKgs,
            unitPrice: grnData.unitPrice,
            assessedBy: grnData.assessedBy
          }
        });
        setVerificationCode(code);
      }
    };
    generateVerification();
  }, [open, grnData]);

  useEffect(() => {
    if (!open) setVerificationCode(null);
  }, [open]);

  if (!grnData) return null;

  const {
    grnNumber, supplierName, coffeeType, numberOfBags,
    totalKgs, unitPrice, assessedBy, createdAt,
    moisture, group1_defects, group2_defects, below12, pods, husks, stones
  } = grnData;

  const totalAmount = totalKgs * unitPrice;
  const dateObj = new Date(createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Number to words helper
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
      if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    };
    return convert(Math.floor(num)) + ' Shillings Only';
  };

  const qualityParameters = [
    { parameter: 'Moisture Content', value: moisture, unit: '%', standard: '≤ 13%' },
    { parameter: 'Group 1 Defects', value: group1_defects, unit: '%', standard: '≤ 5%' },
    { parameter: 'Group 2 Defects', value: group2_defects, unit: '%', standard: '≤ 8%' },
    { parameter: 'Below Screen 12', value: below12, unit: '%', standard: '≤ 5%' },
    { parameter: 'Pods', value: pods, unit: '%', standard: '≤ 3%' },
    { parameter: 'Husks', value: husks, unit: '%', standard: '≤ 2%' },
    { parameter: 'Stones/Foreign Matter', value: stones, unit: '%', standard: '0%' },
  ];

  const getQualityStatus = (param: typeof qualityParameters[0]) => {
    if (param.value === undefined || param.value === null) return 'N/A';
    const stdVal = parseFloat(param.standard.replace(/[≤%]/g, ''));
    return param.value <= stdVal ? 'PASS' : 'FAIL';
  };

  const overallGrade = grnData.qualityAssessment || 'Standard';

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=900,height=1200');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>GRN - ${grnNumber}</title>
          <style>${getGRNPrintStyles()}</style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            Goods Received Note Preview
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          {/* ========== HEADER ========== */}
          <div className="grn-header">
            <div className="grn-header-row">
              <div className="grn-logo-block">
                <div className="grn-logo-wrapper">
                  <img src="/lovable-uploads/great-pearl-coffee-logo.png" alt="Logo" className="grn-logo" />
                </div>
              </div>
              <div className="grn-company-block">
                <h1 className="grn-company-name">GREAT PEARL COFFEE FACTORY LTD</h1>
                <p className="grn-motto">Delivering coffee from the heart of Rwenzori.</p>
                <p className="grn-address">Fort Portal, Kabarole District, Western Uganda</p>
                <p className="grn-contacts">Tel: +256 781 121 639 / +256 778 536 681 | Email: info@greatpearlcoffee.com</p>
              </div>
              {verificationCode && (
                <div className="grn-qr-block">
                  <img src={getVerificationQRUrl(verificationCode, 70)} alt="QR" className="grn-qr" />
                  <p className="grn-qr-label">Scan to Verify</p>
                  <p className="grn-qr-code">{verificationCode}</p>
                </div>
              )}
            </div>
            <div className="grn-title-bar">
              <span className="grn-title-text">GOODS RECEIVED NOTE (GRN)</span>
            </div>
          </div>

          {/* ========== DOCUMENT INFO ========== */}
          <div className="grn-doc-info">
            <table className="grn-info-table">
              <tbody>
                <tr>
                  <td className="grn-info-label">GRN Number:</td>
                  <td className="grn-info-value">{grnNumber}</td>
                  <td className="grn-info-label">Date:</td>
                  <td className="grn-info-value">{formattedDate}</td>
                </tr>
                <tr>
                  <td className="grn-info-label">Time Received:</td>
                  <td className="grn-info-value">{formattedTime}</td>
                  <td className="grn-info-label">Assessed By:</td>
                  <td className="grn-info-value">{assessedBy}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ========== SUPPLIER DETAILS ========== */}
          <div className="grn-section">
            <div className="grn-section-header">SUPPLIER DETAILS</div>
            <table className="grn-info-table">
              <tbody>
                <tr>
                  <td className="grn-info-label">Supplier Name:</td>
                  <td className="grn-info-value" colSpan={3}>{supplierName}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ========== GOODS DESCRIPTION ========== */}
          <div className="grn-section">
            <div className="grn-section-header">GOODS DESCRIPTION</div>
            <table className="grn-goods-table">
              <thead>
                <tr>
                  <th className="grn-th-no">#</th>
                  <th className="grn-th-desc">Description</th>
                  <th className="grn-th-type">Coffee Type</th>
                  <th className="grn-th-bags">Bags</th>
                  <th className="grn-th-weight">Weight (kg)</th>
                  <th className="grn-th-rate">Rate/kg (UGX)</th>
                  <th className="grn-th-amount">Amount (UGX)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="grn-td-center">1</td>
                  <td>Raw Coffee Beans</td>
                  <td className="grn-td-center">{coffeeType}</td>
                  <td className="grn-td-center">{numberOfBags}</td>
                  <td className="grn-td-right">{totalKgs.toLocaleString()}</td>
                  <td className="grn-td-right">{unitPrice.toLocaleString()}</td>
                  <td className="grn-td-right grn-td-bold">{totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="grn-total-row">
                  <td colSpan={3} className="grn-td-right grn-td-bold">TOTAL</td>
                  <td className="grn-td-center grn-td-bold">{numberOfBags}</td>
                  <td className="grn-td-right grn-td-bold">{totalKgs.toLocaleString()}</td>
                  <td></td>
                  <td className="grn-td-right grn-td-bold grn-grand-total">UGX {totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
            <div className="grn-amount-words">
              <strong>Amount in Words:</strong> {numberToWords(totalAmount)}
            </div>
          </div>

          {/* ========== QUALITY ASSESSMENT ========== */}
          <div className="grn-section">
            <div className="grn-section-header">QUALITY ASSESSMENT REPORT</div>
            <div className="grn-grade-banner">
              Overall Grade: <strong>{overallGrade}</strong>
            </div>
            <table className="grn-quality-table">
              <thead>
                <tr>
                  <th className="grn-qt-param">Parameter</th>
                  <th className="grn-qt-std">Standard</th>
                  <th className="grn-qt-result">Result</th>
                  <th className="grn-qt-status">Status</th>
                </tr>
              </thead>
              <tbody>
                {qualityParameters.map((p, i) => {
                  const status = getQualityStatus(p);
                  return (
                    <tr key={i}>
                      <td>{p.parameter}</td>
                      <td className="grn-td-center">{p.standard}</td>
                      <td className="grn-td-center">
                        {p.value !== undefined && p.value !== null ? `${p.value}${p.unit}` : 'N/A'}
                      </td>
                      <td className={`grn-td-center grn-status-${status.toLowerCase()}`}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========== REMARKS ========== */}
          <div className="grn-section">
            <div className="grn-section-header">REMARKS / OBSERVATIONS</div>
            <div className="grn-remarks-box">
              <p>Coffee received and inspected as per the quality parameters above.</p>
            </div>
          </div>

          {/* ========== SIGNATURES ========== */}
          <div className="grn-section">
            <div className="grn-section-header">AUTHORISATION</div>
            <div className="grn-signatures">
              <div className="grn-sig-col">
                <p className="grn-sig-role">Delivered By (Supplier)</p>
                <div className="grn-sig-space"></div>
                <div className="grn-sig-line"></div>
                <p className="grn-sig-details">Name: _____________________</p>
                <p className="grn-sig-details">Signature: __________________</p>
                <p className="grn-sig-details">Date: ______________________</p>
              </div>
              <div className="grn-sig-col">
                <p className="grn-sig-role">Received By (Store Keeper)</p>
                <div className="grn-sig-space"></div>
                <div className="grn-sig-line"></div>
                <p className="grn-sig-details">Name: _____________________</p>
                <p className="grn-sig-details">Signature: __________________</p>
                <p className="grn-sig-details">Date: ______________________</p>
              </div>
              <div className="grn-sig-col">
                <p className="grn-sig-role">Quality Analyst</p>
                <div className="grn-sig-space"></div>
                <div className="grn-sig-line"></div>
                <p className="grn-sig-details">Name: {assessedBy}</p>
                <p className="grn-sig-details">Signature: __________________</p>
                <p className="grn-sig-details">Date: {formattedDate}</p>
              </div>
              <div className="grn-sig-col">
                <p className="grn-sig-role">Authorised By (Manager)</p>
                <div className="grn-sig-space"></div>
                <div className="grn-sig-line"></div>
                <p className="grn-sig-details">Name: _____________________</p>
                <p className="grn-sig-details">Signature: __________________</p>
                <p className="grn-sig-details">Date: ______________________</p>
              </div>
            </div>
          </div>

          {/* ========== FOOTER ========== */}
          <div className="grn-footer">
            <div className="grn-footer-left">
              <p>This is a system-generated document.</p>
              <p>Great Pearl Coffee Factory Ltd — Management System</p>
            </div>
            <div className="grn-footer-right">
              {verificationCode && <p>Verify: greatpearlcoffee.com/verify/{verificationCode}</p>}
              <p>Printed: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2 no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print GRN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getGRNPrintStyles(): string {
  return `
    @page {
      margin: 12mm 14mm;
      size: A4;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      line-height: 1.4;
    }

    /* ===== HEADER ===== */
    .grn-header {
      margin-bottom: 10px;
    }
    .grn-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 3px double #1a365d;
    }
    .grn-logo-block {
      flex-shrink: 0;
    }
    .grn-logo-wrapper {
      background: #0d3d1f;
      padding: 6px 12px;
      border-radius: 4px;
    }
    .grn-logo {
      height: 36px !important;
      width: auto !important;
      display: block !important;
    }
    .grn-company-block {
      text-align: center;
      flex: 1;
      padding: 0 12px;
    }
    .grn-company-name {
      font-size: 16px;
      font-weight: 800;
      color: #1a365d;
      letter-spacing: 1.5px;
      margin-bottom: 1px;
    }
    .grn-motto {
      font-size: 8px;
      color: #4a5568;
      font-style: italic;
      margin-bottom: 2px;
    }
    .grn-address {
      font-size: 8px;
      color: #4a5568;
    }
    .grn-contacts {
      font-size: 8px;
      color: #4a5568;
    }
    .grn-qr-block {
      text-align: center;
      flex-shrink: 0;
    }
    .grn-qr {
      width: 64px !important;
      height: 64px !important;
      display: block !important;
      margin: 0 auto;
    }
    .grn-qr-label {
      font-size: 6px;
      color: #888;
      margin-top: 2px;
    }
    .grn-qr-code {
      font-family: 'Courier New', monospace;
      font-size: 8px;
      font-weight: bold;
      color: #0d3d1f;
    }
    .grn-title-bar {
      background: #1a365d;
      color: #fff;
      text-align: center;
      padding: 6px 0;
      margin-top: 8px;
      border-radius: 3px;
    }
    .grn-title-text {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3px;
    }

    /* ===== DOCUMENT INFO ===== */
    .grn-doc-info {
      margin: 8px 0;
      border: 1px solid #cbd5e0;
      border-radius: 3px;
      overflow: hidden;
    }
    .grn-info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .grn-info-table td {
      padding: 4px 8px;
      border: 1px solid #e2e8f0;
      font-size: 10px;
    }
    .grn-info-label {
      background: #f7fafc;
      font-weight: 600;
      color: #2d3748;
      width: 18%;
      white-space: nowrap;
    }
    .grn-info-value {
      color: #1a202c;
      width: 32%;
    }

    /* ===== SECTIONS ===== */
    .grn-section {
      margin: 8px 0;
    }
    .grn-section-header {
      background: #edf2f7;
      border-left: 4px solid #1a365d;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 700;
      color: #1a365d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    /* ===== GOODS TABLE ===== */
    .grn-goods-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .grn-goods-table th {
      background: #2d3748;
      color: #fff;
      padding: 5px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .grn-goods-table td {
      padding: 6px;
      border: 1px solid #e2e8f0;
    }
    .grn-th-no { width: 5%; text-align: center !important; }
    .grn-th-desc { width: 22%; }
    .grn-th-type { width: 14%; text-align: center !important; }
    .grn-th-bags { width: 9%; text-align: center !important; }
    .grn-th-weight { width: 14%; text-align: right !important; }
    .grn-th-rate { width: 16%; text-align: right !important; }
    .grn-th-amount { width: 20%; text-align: right !important; }
    .grn-td-center { text-align: center; }
    .grn-td-right { text-align: right; }
    .grn-td-bold { font-weight: 700; }
    .grn-total-row {
      background: #f7fafc;
      border-top: 2px solid #2d3748;
    }
    .grn-grand-total {
      font-size: 11px;
      color: #1a365d;
    }
    .grn-amount-words {
      margin-top: 4px;
      padding: 4px 8px;
      background: #fffff0;
      border: 1px dashed #d69e2e;
      border-radius: 2px;
      font-size: 10px;
      font-style: italic;
      color: #744210;
    }

    /* ===== QUALITY TABLE ===== */
    .grn-grade-banner {
      text-align: center;
      padding: 4px;
      background: #f0fff4;
      border: 1px solid #9ae6b4;
      border-radius: 3px;
      font-size: 11px;
      color: #22543d;
      margin-bottom: 4px;
    }
    .grn-quality-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .grn-quality-table th {
      background: #edf2f7;
      border: 1px solid #cbd5e0;
      padding: 4px 8px;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
    }
    .grn-quality-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 8px;
    }
    .grn-qt-param { text-align: left; width: 40%; }
    .grn-qt-std { text-align: center; width: 20%; }
    .grn-qt-result { text-align: center; width: 20%; }
    .grn-qt-status { text-align: center; width: 20%; }
    .grn-status-pass { color: #22543d; font-weight: 700; background: #f0fff4; }
    .grn-status-fail { color: #c53030; font-weight: 700; background: #fff5f5; }
    .grn-status-n\\/a { color: #718096; }

    /* ===== REMARKS ===== */
    .grn-remarks-box {
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      min-height: 30px;
      border-radius: 2px;
      font-size: 10px;
      color: #4a5568;
    }

    /* ===== SIGNATURES ===== */
    .grn-signatures {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 6px;
    }
    .grn-sig-col {
      flex: 1;
      text-align: center;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 6px 4px 8px;
    }
    .grn-sig-role {
      font-size: 9px;
      font-weight: 700;
      color: #1a365d;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .grn-sig-space {
      height: 28px;
    }
    .grn-sig-line {
      border-top: 1px solid #2d3748;
      margin: 0 8px 4px;
    }
    .grn-sig-details {
      font-size: 8px;
      color: #4a5568;
      text-align: left;
      padding: 1px 8px;
    }

    /* ===== FOOTER ===== */
    .grn-footer {
      display: flex;
      justify-content: space-between;
      border-top: 2px solid #1a365d;
      padding-top: 6px;
      margin-top: 10px;
      font-size: 7px;
      color: #718096;
    }
    .grn-footer-left { text-align: left; }
    .grn-footer-right { text-align: right; }

    .no-print { display: none !important; }
    @media screen {
      body { padding: 16px; max-width: 210mm; margin: 0 auto; }
    }
  `;
}

export default GRNPrintModal;
