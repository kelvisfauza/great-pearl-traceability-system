import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';
import { getStandardPrintStyles } from '@/utils/printStyles';

interface DeliveryNoteModalProps {
  open: boolean;
  onClose: () => void;
  saleData: {
    date: Date;
    customer: string;
    coffeeType: string;
    moisture: string;
    weight: number;
    truckDetails: string;
    driverDetails: string;
  };
}

const DeliveryNoteModal: React.FC<DeliveryNoteModalProps> = ({ open, onClose, saleData }) => {
  
  const handlePrint = () => {
    const printContent = document.getElementById('delivery-note');
    if (printContent) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Delivery Note - DN-${format(new Date(), 'yyyyMMdd')}</title>
              <style>${getStandardPrintStyles()}</style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for content to load before printing
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
        
        // Fallback for browsers where onload doesn't fire
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      } else {
        // Fallback: use iframe for printing if popup blocked
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.write(`
            <html>
              <head>
                <title>Delivery Note</title>
                <style>${getStandardPrintStyles()}</style>
              </head>
              <body>
                ${printContent.innerHTML}
              </body>
            </html>
          `);
          iframeDoc.close();
          
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
          }, 250);
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Delivery Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="delivery-note-content space-y-4 p-4 bg-white text-black overflow-y-auto flex-1" id="delivery-note">
          <StandardPrintHeader
            title="Coffee Delivery Note"
            documentNumber={`DN-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`}
            additionalInfo={`Delivery Date: ${format(saleData.date, 'dd/MM/yyyy')}`}
          />

          {/* Customer Info */}
          <div className="content-section">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-2">From:</h3>
                <div className="space-y-1">
                  <p className="font-medium">Great Pearl Coffee Factory</p>
                  <p>Delivering coffee from the heart of Rwenzori.</p>
                  <p>+256781121639 / +256778536681</p>
                  <p>info@greatpearlcoffee.com</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">To:</h3>
                <div className="space-y-1">
                  <p className="font-medium">{saleData.customer}</p>
                  <p>Customer Address</p>
                  <p>Delivery Date: {format(saleData.date, 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="content-section border rounded-lg p-4">
            <h3 className="section-title">Delivery Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Coffee Type:</span> {saleData.coffeeType}</p>
                <p><span className="font-medium">Weight:</span> {saleData.weight} kg</p>
                {saleData.moisture && <p><span className="font-medium">Moisture Content:</span> {saleData.moisture}%</p>}
              </div>
              <div>
                <p><span className="font-medium">Truck Details:</span> {saleData.truckDetails}</p>
                <p><span className="font-medium">Driver:</span> {saleData.driverDetails}</p>
              </div>
            </div>
          </div>

          {/* Quality Information */}
          <div className="content-section border rounded-lg p-4">
            <h3 className="section-title">Quality Information</h3>
            <p>Coffee delivered as per agreed specifications and quality standards.</p>
            {saleData.moisture && <p>Moisture content: {saleData.moisture}%</p>}
          </div>

          {/* Signatures */}
          <div className="signatures">
            <div>
              <p>Delivered By</p>
              <div className="signature-line"></div>
              <p>Signature & Date</p>
            </div>
            <div>
              <p>Received By</p>
              <div className="signature-line"></div>
              <p>Signature & Date</p>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>This delivery note serves as proof of delivery and should be retained for records.</p>
            <p>Generated by Great Pearl Coffee Factory Management System</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryNoteModal;