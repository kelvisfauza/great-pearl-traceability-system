import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';

interface PaymentVoucherProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    type: string;
    title: string;
    description: string;
    amount: number;
    status: string;
    created_at: string;
    finance_approved_at?: string | null;
    admin_approved_at?: string | null;
    requestedby_name?: string;
    department?: string;
  };
  employeeName: string;
  employeeDepartment: string;
}

const PaymentVoucher: React.FC<PaymentVoucherProps> = ({
  isOpen,
  onClose,
  request,
  employeeName,
  employeeDepartment
}) => {
  const voucherRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = voucherRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Voucher - ${request.id.slice(0, 8).toUpperCase()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              background: white;
            }
            .voucher {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #333;
            }
            .header {
              background: linear-gradient(135deg, #1a5f2a 0%, #2d8a3e 100%);
              color: white;
              padding: 25px 30px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo-icon {
              width: 60px;
              height: 60px;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
            }
            .company-info h1 {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .company-info p {
              font-size: 12px;
              opacity: 0.9;
            }
            .voucher-badge {
              background: rgba(255,255,255,0.2);
              padding: 10px 20px;
              border-radius: 8px;
              text-align: center;
            }
            .voucher-badge h2 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .voucher-badge p {
              font-size: 11px;
              opacity: 0.9;
            }
            .content {
              padding: 25px 30px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #1a5f2a;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #1a5f2a;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            .detail-item {
              padding: 10px;
              background: #f8f9fa;
              border-radius: 6px;
            }
            .detail-item.full-width {
              grid-column: 1 / -1;
            }
            .detail-label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .detail-value {
              font-size: 14px;
              color: #333;
              font-weight: 500;
            }
            .amount-section {
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              border: 2px solid #1a5f2a;
              padding: 25px;
              margin: 20px 0;
              border-radius: 12px;
              text-align: center;
            }
            .amount-label {
              font-size: 12px;
              color: #166534;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            .amount-value {
              font-size: 36px;
              font-weight: bold;
              color: #1a5f2a;
            }
            .amount-words {
              font-size: 13px;
              color: #166534;
              margin-top: 8px;
              font-style: italic;
            }
            .status-approved {
              display: inline-block;
              background: #22c55e;
              color: white;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 10px;
            }
            .instructions {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 15px 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .instructions-title {
              font-weight: bold;
              color: #92400e;
              margin-bottom: 10px;
              font-size: 13px;
            }
            .instructions-list {
              color: #78350f;
              padding-left: 20px;
              font-size: 12px;
              line-height: 1.8;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              padding-top: 20px;
            }
            .signature-box {
              text-align: center;
              width: 180px;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-bottom: 8px;
              padding-top: 40px;
            }
            .signature-title {
              font-size: 11px;
              color: #666;
            }
            .footer {
              background: #f8f9fa;
              text-align: center;
              padding: 15px;
              font-size: 11px;
              color: #666;
              border-top: 1px solid #ddd;
            }
            .footer p {
              margin: 3px 0;
            }
            @media print {
              body { padding: 0; }
              .voucher { border: 2px solid #333; }
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
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
      if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    };
    
    return convert(Math.floor(num)) + ' Shillings Only';
  };

  const voucherNumber = `PV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${request.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment Voucher</span>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Voucher
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={voucherRef}>
          <div className="voucher">
            <div className="header">
              <div className="logo-section">
                <div className="logo-icon">☕</div>
                <div className="company-info">
                  <h1>GREAT PEARL COFFEE</h1>
                  <p>Premium Coffee Trading & Export</p>
                </div>
              </div>
              <div className="voucher-badge">
                <h2>PAYMENT VOUCHER</h2>
                <p>No: {voucherNumber}</p>
              </div>
            </div>

            <div className="content">
              <div className="section-title">Payee Information</div>
              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-label">Payee Name</div>
                  <div className="detail-value">{employeeName}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Department</div>
                  <div className="detail-value">{employeeDepartment}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Request Type</div>
                  <div className="detail-value">{request.type}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Request Date</div>
                  <div className="detail-value">{formatDate(request.created_at)}</div>
                </div>
                <div className="detail-item full-width">
                  <div className="detail-label">Purpose</div>
                  <div className="detail-value">{request.title}</div>
                </div>
                <div className="detail-item full-width">
                  <div className="detail-label">Description</div>
                  <div className="detail-value">{request.description}</div>
                </div>
              </div>

              <div className="amount-section">
                <div className="amount-label">Amount Approved for Payment</div>
                <div className="amount-value">UGX {request.amount.toLocaleString()}</div>
                <div className="amount-words">{numberToWords(request.amount)}</div>
                <span className="status-approved">✓ APPROVED</span>
              </div>

              <div className="instructions">
                <div className="instructions-title">📋 Payment Instructions:</div>
                <ul className="instructions-list">
                  <li>Present this voucher to the Finance Department</li>
                  <li>Carry a valid ID for verification</li>
                  <li>Sign the payment register upon receiving payment</li>
                  <li>This voucher is valid for 7 days from approval date</li>
                </ul>
              </div>

              <div className="signatures">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-title">Payee Signature</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-title">Finance Officer</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-title">Authorized By</div>
                </div>
              </div>
            </div>

            <div className="footer">
              <p>Generated on: {new Date().toLocaleString('en-UG')}</p>
              <p>Great Pearl Coffee | www.greatpearlcoffeesystem.site | +256 778 536 681</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentVoucher;
