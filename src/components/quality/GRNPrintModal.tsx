import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { Printer } from 'lucide-react';
import { GRNDocumentData, getGRNPreviewHTML, getGRNPrintDocumentHTML } from '@/utils/grnPrintTemplate';

interface GRNPrintModalProps {
  open: boolean;
  onClose: () => void;
  grnData: GRNDocumentData | null;
  onPrinted?: () => void;
}

const GRNPrintModal: React.FC<GRNPrintModalProps> = ({ open, onClose, grnData, onPrinted }) => {
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
            assessedBy: grnData.assessedBy,
          },
        });
        setVerificationCode(code);
      }
    };

    generateVerification();
  }, [open, grnData, verificationCode, createVerification]);

  useEffect(() => {
    if (!open) setVerificationCode(null);
  }, [open]);

  const previewData = useMemo(() => {
    if (!grnData) return null;
    return {
      ...grnData,
      verificationCode: verificationCode ?? grnData.verificationCode,
    };
  }, [grnData, verificationCode]);

  const previewHtml = useMemo(() => {
    if (!previewData) return '';
    return getGRNPreviewHTML(previewData);
  }, [previewData]);

  const handlePrint = () => {
    if (!previewData) return;

    const printWindow = window.open('', '', 'width=1000,height=1200');
    if (!printWindow) return;

    printWindow.document.write(getGRNPrintDocumentHTML([previewData], `GRN - ${previewData.grnNumber}`));
    printWindow.document.close();
    onPrinted?.();
  };

  if (!grnData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            Goods Received Note Preview
          </DialogTitle>
        </DialogHeader>

        <div
          className="overflow-auto rounded-md border bg-background"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />

        <div className="mt-3 flex justify-end gap-2">
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

export default GRNPrintModal;
