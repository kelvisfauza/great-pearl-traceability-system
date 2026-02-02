import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";
import { getStandardPrintStyles } from "@/utils/printStyles";
import { useDocumentVerification } from "@/hooks/useDocumentVerification";
import { getVerificationQRHtml } from "@/components/print/VerificationQRCode";
import { useState, useEffect } from "react";

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  formatCurrency: (amount: number) => string;
}

const ReceiptPrintModal = ({ isOpen, onClose, payment, formatCurrency }: ReceiptPrintModalProps) => {
  const { employee } = useAuth();
  const { createVerification, isCreating } = useDocumentVerification();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  
  // Create verification when modal opens
  useEffect(() => {
    if (isOpen && payment && !verificationCode) {
      createVerification({
        type: 'receipt',
        subtype: 'Payment Receipt',
        issued_to_name: payment.supplier || 'Unknown',
        department: 'Finance',
        reference_no: payment.id,
        meta: {
          amount: payment.amount,
          method: payment.method,
          batch_number: payment.batch_number,
        }
      }).then(code => {
        if (code) setVerificationCode(code);
      });
    }
  }, [isOpen, payment]);

  // Reset verification code when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVerificationCode(null);
    }
  }, [isOpen]);
  
  if (!payment) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt - ${payment.id}</title>
              <style>${getStandardPrintStyles()}</style>
            </head>
            <body>
              ${printContent.innerHTML}
              ${verificationCode ? getVerificationQRHtml(verificationCode) : ''}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleDownload = () => {
    const element = document.getElementById('receipt-content');
    if (element) {
      const printContent = element.innerHTML;
      const blob = new Blob([`
        <html>
          <head>
            <title>Receipt - ${payment.id}</title>
            <style>${getStandardPrintStyles()}</style>
          </head>
          <body>
            ${printContent}
            ${verificationCode ? getVerificationQRHtml(verificationCode) : ''}
          </body>
        </html>
      `], { type: 'text/html' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${payment.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div id="receipt-content" className="receipt">
            <StandardPrintHeader
              title="Payment Receipt"
              documentNumber={payment.id}
              additionalInfo={`Time: ${new Date().toLocaleTimeString()}`}
              verificationCode={verificationCode || undefined}
            />

            <div className="content-section receipt-details">
              <h3 className="section-title">Payment Details</h3>
              
              <div className="detail-row">
                <span className="detail-label">Receipt No:</span>
                <span>{payment.id}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Supplier:</span>
                <span>{payment.supplier}</span>
              </div>
              
              {payment.batch_number && (
                <div className="detail-row">
                  <span className="detail-label">Batch Number:</span>
                  <span>{payment.batch_number}</span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="detail-label">Payment Method:</span>
                <span>{payment.method}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Amount Paid:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(payment.amount)}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{payment.status}</span>
              </div>
            </div>

            <div className="signature">
              <div className="detail-row">
                <span className="detail-label">Processed By:</span>
                <span>{employee?.name || 'Finance Officer'}</span>
              </div>
              <div className="signature-line"></div>
              <div style={{ textAlign: 'center' }}>Authorized Signature</div>
            </div>

            <div className="footer">
              <p>Thank you for your business!</p>
              <p>This is a computer-generated receipt and does not require a signature.</p>
            </div>
          </div>

          <div className="flex gap-4 justify-end no-print">
            <Button variant="outline" onClick={handleDownload} disabled={isCreating}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} disabled={isCreating}>
              <Printer className="h-4 w-4 mr-2" />
              {isCreating ? 'Preparing...' : 'Print'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPrintModal;
