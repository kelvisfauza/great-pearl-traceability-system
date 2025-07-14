import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  formatCurrency: (amount: number) => string;
}

const ReceiptPrintModal = ({ isOpen, onClose, payment, formatCurrency }: ReceiptPrintModalProps) => {
  const { employee } = useAuth();
  
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
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { max-width: 600px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .company-name { font-size: 24px; font-weight: bold; color: #16a34a; }
                .company-details { font-size: 14px; color: #666; margin-top: 10px; }
                .receipt-details { border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
                .detail-label { font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                .signature { margin-top: 40px; }
                .signature-line { border-top: 1px solid #000; width: 200px; margin: 20px auto; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
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
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 600px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; color: #16a34a; }
              .company-details { font-size: 14px; color: #666; margin-top: 10px; }
              .receipt-details { border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
              .detail-label { font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
              .signature { margin-top: 40px; }
              .signature-line { border-top: 1px solid #000; width: 200px; margin: 20px auto; }
            </style>
          </head>
          <body>
            ${printContent}
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
            <div className="header">
              <div className="company-name">Great Pearl Coffee Factory</div>
              <div className="company-details">
                <div>P.O. Box 1234, Kampala, Uganda</div>
                <div>Tel: +256-XXX-XXXXXX | Email: info@greatpearl.com</div>
                <div>TIN: 1234567890</div>
              </div>
            </div>

            <div className="receipt-details">
              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>PAYMENT RECEIPT</h3>
              
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
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPrintModal;