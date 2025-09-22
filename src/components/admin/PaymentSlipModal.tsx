import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';

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
  console.log('🎯 PaymentSlipModal render - open:', open, 'request:', !!request);
  
  if (!request) {
    console.log('🎯 PaymentSlipModal - no request provided, returning null');
    return null;
  }

  const generatePaymentSlipNumber = () => {
    return `PS-${new Date().getFullYear()}-${new Date().getMonth() + 1}-${request.id.slice(0, 8).toUpperCase()}`;
  };

  const handlePrint = () => {
    const paymentSlipNumber = generatePaymentSlipNumber();
    
    const slipContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 8px; border: 1px solid #333;">
        <!-- Company Header -->
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px;">
          <img src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
               alt="Great Pearl Coffee Factory Logo" 
               style="height: 40px; width: auto; margin-bottom: 4px;" />
          <h1 style="color: #333; margin: 2px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">
            GREAT PEARL COFFEE FACTORY
          </h1>
          <div style="font-size: 8px; color: #666; line-height: 1.2;">
            <p style="margin: 1px 0;">Specialty Coffee Processing & Export</p>
            <p style="margin: 1px 0;">+256781121639 / +256778536681</p>
            <p style="margin: 1px 0;">www.greatpearlcoffee.com | greatpearlcoffee@gmail.com</p>
          </div>
          <h2 style="color: #333; margin: 6px 0 2px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
            PAYMENT SLIP
          </h2>
          <p style="margin: 0; color: #666; font-size: 10px;">Finance Department</p>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 12px;">
          <div style="flex: 1; background: #f9f9f9; padding: 8px; border-radius: 3px;">
            <h4 style="margin: 0 0 6px 0; color: #333; font-size: 12px;">Payment Details</h4>
            <p style="margin: 2px 0; font-size: 10px;"><strong>Slip Number:</strong> ${paymentSlipNumber}</p>
            <p style="margin: 2px 0; font-size: 10px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 2px 0; font-size: 10px;"><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
          </div>
          <div style="flex: 1; background: #f9f9f9; padding: 8px; border-radius: 3px;">
            <h4 style="margin: 0 0 6px 0; color: #333; font-size: 12px;">Amount</h4>
            <p style="margin: 2px 0; font-size: 16px; font-weight: bold; color: #2563eb;">UGX ${request.amount.toLocaleString()}</p>
            <p style="margin: 2px 0; font-size: 10px;"><strong>Method:</strong> ${request.paymentMethod}</p>
            <p style="margin: 2px 0; font-size: 10px; color: green;"><strong>Status:</strong> Approved</p>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 6px 0; color: #333; font-size: 12px;">Recipient Information</h4>
          <div style="display: flex; gap: 15px;">
            <div style="flex: 1;">
              <p style="margin: 2px 0; font-size: 10px;"><strong>Name:</strong> ${recipientName || request.requestedby.split('@')[0]}</p>
              <p style="margin: 2px 0; font-size: 10px;"><strong>Email:</strong> ${request.requestedby}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 2px 0; font-size: 10px;"><strong>Phone:</strong> ${request.phoneNumber || 'Not provided'}</p>
              <p style="margin: 2px 0; font-size: 10px;"><strong>Type:</strong> ${request.title}</p>
            </div>
          </div>
          ${request.reason ? `<p style="margin: 4px 0 0 0; font-size: 10px;"><strong>Reason:</strong> ${request.reason}</p>` : ''}
        </div>
        
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 6px 0; color: #333; font-size: 12px;">Approval Chain</h4>
          <div style="display: flex; gap: 15px; font-size: 10px;">
            <div style="flex: 1;">
              <p style="margin: 2px 0;"><strong>Finance:</strong> ${request.financeApprovedBy || 'Finance Team'}</p>
              <p style="margin: 2px 0;">${request.financeApprovedAt ? new Date(request.financeApprovedAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 2px 0;"><strong>Admin:</strong> ${request.adminApprovedBy || 'Admin Team'}</p>
              <p style="margin: 2px 0;">${request.adminApprovedAt ? new Date(request.adminApprovedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        
        <div style="border: 1px solid #333; padding: 12px; margin-bottom: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #333; font-size: 12px;">Recipient Acknowledgment</h4>
          <p style="margin: 4px 0; font-size: 10px;">I acknowledge receipt of the above amount:</p>
          
          <div style="display: flex; gap: 20px; margin-top: 15px;">
            <div style="flex: 1; text-align: center;">
              <div style="border-bottom: 1px solid #333; height: 25px; margin-bottom: 4px;"></div>
              <p style="margin: 0; font-size: 9px;">Recipient Signature & Date</p>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="border-bottom: 1px solid #333; height: 25px; margin-bottom: 4px;"></div>
              <p style="margin: 0; font-size: 9px;">Paymaster Signature & Date</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 6px;">
          <p style="margin: 0;">Official payment slip - Retain for records</p>
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
                body { margin: 0; padding: 0; }
                @page { 
                  margin: 0.5cm; 
                  size: A4;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
              @media screen {
                body { padding: 20px; background: #f5f5f5; }
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