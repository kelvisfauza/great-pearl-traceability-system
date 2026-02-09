import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { getVerificationQRUrl } from '@/utils/verificationCode';

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

  const qualityParameters = [
    { parameter: 'Moisture', value: moisture, unit: '%' },
    { parameter: 'G1 Defects', value: group1_defects, unit: '%' },
    { parameter: 'G2 Defects', value: group2_defects, unit: '%' },
    { parameter: 'Below 12', value: below12, unit: '%' },
    { parameter: 'Pods', value: pods, unit: '%' },
    { parameter: 'Husks', value: husks, unit: '%' },
    { parameter: 'Stones', value: stones, unit: '%' },
  ];

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
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold mb-2">
            Goods Received Note (GRN)
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          {/* Compact header with inline verification */}
          <div className="grn-header">
            <div className="grn-header-top">
              <div className="grn-logo-section">
                <div className="grn-logo-bg">
                  <img src="/lovable-uploads/great-pearl-coffee-logo.png" alt="Logo" className="grn-logo" />
                </div>
                <div className="grn-company-info">
                  <h1 className="grn-company-name">GREAT PEARL COFFEE FACTORY</h1>
                  <p className="grn-tagline">Delivering coffee from the heart of Rwenzori.</p>
                  <p className="grn-contact">+256781121639 / +256778536681 | info@greatpearlcoffee.com</p>
                </div>
              </div>
              {verificationCode && (
                <div className="grn-qr-section">
                  <img src={getVerificationQRUrl(verificationCode, 60)} alt="QR" className="grn-qr" />
                  <p className="grn-verify-code">{verificationCode}</p>
                </div>
              )}
            </div>
            <div className="grn-doc-title">GOODS RECEIVED NOTE (GRN)</div>
            <div className="grn-doc-meta">
              <span>Doc#: {grnNumber}</span>
              <span>Date: {new Date(createdAt).toLocaleDateString('en-GB')}</span>
              <span>Assessed By: {assessedBy}</span>
            </div>
          </div>

          {/* Supplier & Coffee details - compact two-column */}
          <div className="grn-details-grid">
            <div className="grn-detail"><strong>Supplier:</strong> {supplierName}</div>
            <div className="grn-detail"><strong>Coffee Type:</strong> {coffeeType}</div>
            <div className="grn-detail"><strong>No. of Bags:</strong> {numberOfBags}</div>
            <div className="grn-detail"><strong>Total Weight:</strong> {totalKgs.toLocaleString()} kg</div>
            <div className="grn-detail"><strong>Unit Price:</strong> UGX {unitPrice.toLocaleString()}/kg</div>
            <div className="grn-detail grn-total"><strong>Total Amount:</strong> UGX {totalAmount.toLocaleString()}</div>
          </div>

          {/* Quality parameters table - compact */}
          <div className="grn-quality-section">
            <div className="grn-section-title">Quality Assessment Parameters</div>
            <table className="grn-quality-table">
              <thead>
                <tr>
                  {qualityParameters.map((p, i) => (
                    <th key={i}>{p.parameter}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {qualityParameters.map((p, i) => (
                    <td key={i}>{p.value !== undefined ? `${p.value}${p.unit}` : 'N/A'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grn-signatures">
            <div className="grn-sig-block">
              <div className="grn-sig-line"></div>
              <p>Store Keeper</p>
              <p className="grn-sig-sub">Signature & Date</p>
            </div>
            <div className="grn-sig-block">
              <div className="grn-sig-line"></div>
              <p>Quality Analyst</p>
              <p className="grn-sig-sub">Signature & Date</p>
            </div>
            <div className="grn-sig-block">
              <div className="grn-sig-line"></div>
              <p>Authorized By</p>
              <p className="grn-sig-sub">Signature & Date</p>
            </div>
          </div>

          <div className="grn-footer">
            <p>System-generated document • Great Pearl Coffee Factory Management System</p>
            {verificationCode && <p>Verify at: greatpearlcoffee.com/verify/{verificationCode}</p>}
          </div>
        </div>

        <div className="mt-4 flex justify-end no-print">
          <Button variant="outline" onClick={handlePrint}>
            Print GRN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Compact print styles optimized for single-page A4 GRN */
function getGRNPrintStyles(): string {
  return `
    @page { margin: 8mm 10mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #333; line-height: 1.2; }

    .grn-header { border-bottom: 2px solid #1a365d; padding-bottom: 4px; margin-bottom: 6px; }
    .grn-header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .grn-logo-section { display: flex; align-items: center; gap: 6px; }
    .grn-logo-bg { background: #0d3d1f; padding: 3px 8px; border-radius: 3px; }
    .grn-logo { height: 24px !important; width: auto !important; display: block !important; }
    .grn-company-name { font-size: 13px; font-weight: bold; color: #1a365d; margin: 0; }
    .grn-tagline { font-size: 7px; color: #666; margin: 0; }
    .grn-contact { font-size: 7px; color: #666; margin: 0; }

    .grn-qr-section { text-align: center; }
    .grn-qr { width: 48px !important; height: 48px !important; display: block !important; }
    .grn-verify-code { font-family: monospace; font-size: 7px; font-weight: bold; color: #0d3d1f; margin-top: 1px; }

    .grn-doc-title { text-align: center; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 3px 0; }
    .grn-doc-meta { display: flex; justify-content: center; gap: 16px; font-size: 8px; color: #666; }

    .grn-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; margin: 6px 0; padding: 4px 6px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; }
    .grn-detail { font-size: 10px; padding: 1px 0; }
    .grn-total { font-size: 11px; color: #1a365d; }

    .grn-quality-section { margin: 6px 0; }
    .grn-section-title { font-size: 10px; font-weight: bold; padding: 2px 5px; background: #f0f4f8; border-left: 3px solid #1a365d; margin-bottom: 3px; }
    .grn-quality-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .grn-quality-table th { background: #f0f4f8; border: 1px solid #d1d5db; padding: 2px 3px; text-align: center; font-weight: 600; font-size: 8px; }
    .grn-quality-table td { border: 1px solid #d1d5db; padding: 2px 3px; text-align: center; }

    .grn-signatures { display: flex; justify-content: space-between; margin-top: 14px; }
    .grn-sig-block { text-align: center; flex: 1; margin: 0 6px; font-size: 9px; }
    .grn-sig-line { border-top: 1px solid #000; margin: 18px auto 3px; width: 100px; }
    .grn-sig-sub { font-size: 7px; color: #666; }

    .grn-footer { text-align: center; font-size: 7px; color: #888; border-top: 1px solid #ddd; padding-top: 4px; margin-top: 8px; }

    .no-print { display: none !important; }
    @media screen { body { padding: 15px; } }
  `;
}

export default GRNPrintModal;
