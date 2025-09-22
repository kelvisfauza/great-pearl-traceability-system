import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { StandardPrintHeader } from '@/components/print/StandardPrintHeader';

interface PaymentSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    title: string;
    amount: number;
    requestedby: string;
    paymentMethod: string;
    financeApprovedBy?: string;
    adminApprovedBy?: string;
    financeApprovedAt?: string;
    adminApprovedAt?: string;
    phoneNumber?: string;
    reason?: string;
  } | null;
  recipientName?: string;
}

export const PaymentSlipModal: React.FC<PaymentSlipModalProps> = ({ 
  open, 
  onOpenChange, 
  request,
  recipientName 
}) => {
  if (!request) return null;

  const generatePaymentSlipNumber = () => {
    return `PS-${new Date().getFullYear()}-${new Date().getMonth() + 1}-${request.id.slice(0, 8).toUpperCase()}`;
  };

  const handlePrint = () => {
    const paymentSlipNumber = generatePaymentSlipNumber();
    
    const slipContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0; font-size: 24px;">PAYMENT SLIP</h1>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">FarmFlow Coffee Company</p>
          <p style="margin: 0; color: #666; font-size: 12px;">Finance Department</p>
          <hr style="border: 1px solid #333; margin: 20px 0;">
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Payment Slip Details</h3>
          <p style="margin: 5px 0;"><strong>Slip Number:</strong> ${paymentSlipNumber}</p>
          <p style="margin: 5px 0;"><strong>Date Issued:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Recipient Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${recipientName || request.requestedby.split('@')[0]}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${request.requestedby}</p>
          <p style="margin: 5px 0;"><strong>Phone Number:</strong> ${request.phoneNumber || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Request Type:</strong> ${request.title}</p>
          ${request.reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${request.reason}</p>` : ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Payment Information</h3>
          <p style="margin: 5px 0;"><strong>Amount:</strong> <span style="font-size: 18px; font-weight: bold;">UGX ${request.amount.toLocaleString()}</span></p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${request.paymentMethod}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: green; font-weight: bold;">Approved & Ready for Payment</span></p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Approval Chain</h3>
          <p style="margin: 5px 0;"><strong>Finance Approved By:</strong> ${request.financeApprovedBy || 'Finance Team'}</p>
          <p style="margin: 5px 0;"><strong>Finance Approval Date:</strong> ${request.financeApprovedAt ? new Date(request.financeApprovedAt).toLocaleString() : 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Final Approved By:</strong> ${request.adminApprovedBy || 'Admin Team'}</p>
          <p style="margin: 5px 0;"><strong>Final Approval Date:</strong> ${request.adminApprovedAt ? new Date(request.adminApprovedAt).toLocaleString() : new Date().toLocaleString()}</p>
        </div>
        
        <div style="border: 2px solid #333; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">Recipient Acknowledgment</h3>
          <p style="margin: 10px 0; font-size: 14px;">I acknowledge receipt of the above amount:</p>
          
          <div style="margin-top: 30px;">
            <div style="display: inline-block; width: 200px; border-bottom: 1px solid #333; margin-right: 50px;">
              <p style="margin: 20px 0 5px 0; font-size: 12px;">Recipient Signature</p>
            </div>
            <div style="display: inline-block; width: 200px; border-bottom: 1px solid #333;">
              <p style="margin: 20px 0 5px 0; font-size: 12px;">Date</p>
            </div>
          </div>
          
          <div style="margin-top: 30px;">
            <div style="display: inline-block; width: 200px; border-bottom: 1px solid #333; margin-right: 50px;">
              <p style="margin: 20px 0 5px 0; font-size: 12px;">Paymaster Signature</p>
            </div>
            <div style="display: inline-block; width: 200px; border-bottom: 1px solid #333;">
              <p style="margin: 20px 0 5px 0; font-size: 12px;">Date</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc;">
          <p style="margin: 0; color: #666; font-size: 12px;">This is an official payment slip. Please retain for your records.</p>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 10px;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payment Slip - ${paymentSlipNumber}</title>
            <style>
              @media print {
                body { margin: 0; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${slipContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Payment Slip - {request.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
          <StandardPrintHeader 
            title="PAYMENT SLIP"
            subtitle="Finance Department"
            documentNumber={generatePaymentSlipNumber()}
            includeDate={true}
          />
          
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-900 mb-3">Recipient Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {recipientName || request.requestedby.split('@')[0]}</div>
              <div><span className="font-medium">Email:</span> {request.requestedby}</div>
              <div><span className="font-medium">Phone:</span> {request.phoneNumber || 'Not provided'}</div>
              <div><span className="font-medium">Request Type:</span> {request.title}</div>
              {request.reason && <div><span className="font-medium">Reason:</span> {request.reason}</div>}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Amount:</span> <span className="font-bold text-green-600 text-lg">UGX {request.amount.toLocaleString()}</span></div>
              <div><span className="font-medium">Payment Method:</span> {request.paymentMethod}</div>
              <div><span className="font-medium">Status:</span> <span className="text-green-600 font-medium">Approved & Ready for Payment</span></div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-900 mb-3">Approval Chain</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Finance Approved By:</span> {request.financeApprovedBy || 'Finance Team'}</div>
              <div><span className="font-medium">Finance Approval Date:</span> {request.financeApprovedAt ? new Date(request.financeApprovedAt).toLocaleString() : 'N/A'}</div>
              <div><span className="font-medium">Final Approved By:</span> {request.adminApprovedBy || 'Admin Team'}</div>
              <div><span className="font-medium">Final Approval Date:</span> {request.adminApprovedAt ? new Date(request.adminApprovedAt).toLocaleString() : new Date().toLocaleString()}</div>
            </div>
          </div>
          
          <div className="border-2 border-dashed border-gray-400 p-4 bg-yellow-50">
            <h3 className="font-semibold text-gray-900 mb-3">Recipient Acknowledgment</h3>
            <p className="text-sm text-gray-700 mb-4">Please sign below to acknowledge receipt of payment:</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-b border-gray-400 pb-1">
                <p className="text-xs text-gray-500 mt-8">Recipient Signature & Date</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <p className="text-xs text-gray-500 mt-8">Paymaster Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Payment Slip
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};