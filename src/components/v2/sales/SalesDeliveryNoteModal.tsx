import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { getStandardPrintStyles } from '@/utils/printStyles';

interface SalesDeliveryNoteModalProps {
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

const SalesDeliveryNoteModal: React.FC<SalesDeliveryNoteModalProps> = ({ open, onClose, saleData }) => {
  const documentNumber = `DN-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  const handlePrint = () => {
    const printContent = document.getElementById('sales-delivery-note');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Delivery Note - ${documentNumber}</title>
              <style>
                ${getStandardPrintStyles()}
                
                .delivery-header {
                  text-align: center;
                  border-bottom: 3px solid #1a365d;
                  padding-bottom: 20px;
                  margin-bottom: 25px;
                }
                
                .logo-container {
                  background-color: #0d3d1f;
                  padding: 15px 30px;
                  border-radius: 8px;
                  display: inline-block;
                  margin-bottom: 15px;
                }
                
                .logo-container img {
                  height: 60px !important;
                  width: auto !important;
                  max-width: none !important;
                }
                
                .company-title {
                  font-size: 24px;
                  font-weight: bold;
                  color: #1a365d;
                  text-transform: uppercase;
                  letter-spacing: 2px;
                  margin-bottom: 8px;
                }
                
                .company-tagline {
                  font-size: 12px;
                  color: #666;
                  margin-bottom: 5px;
                }
                
                .doc-title {
                  font-size: 20px;
                  font-weight: bold;
                  color: #1a365d;
                  text-transform: uppercase;
                  margin-top: 15px;
                  padding: 8px 20px;
                  border: 2px solid #1a365d;
                  display: inline-block;
                }
                
                .doc-info {
                  margin-top: 10px;
                  font-size: 11px;
                  color: #666;
                }
                
                .info-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 30px;
                  margin: 20px 0;
                }
                
                .info-section {
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  padding: 15px;
                  background: #fafafa;
                }
                
                .info-section h3 {
                  font-size: 14px;
                  font-weight: bold;
                  color: #1a365d;
                  border-bottom: 2px solid #1a365d;
                  padding-bottom: 8px;
                  margin-bottom: 12px;
                }
                
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 6px 0;
                  border-bottom: 1px dashed #eee;
                }
                
                .info-row:last-child {
                  border-bottom: none;
                }
                
                .info-label {
                  font-weight: 600;
                  color: #333;
                }
                
                .info-value {
                  color: #555;
                }
                
                .delivery-details {
                  border: 2px solid #1a365d;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
                  background: #f8fafc;
                }
                
                .delivery-details h3 {
                  font-size: 16px;
                  font-weight: bold;
                  color: #1a365d;
                  margin-bottom: 15px;
                  text-transform: uppercase;
                }
                
                .details-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 15px;
                }
                
                .detail-item {
                  background: white;
                  padding: 12px;
                  border-radius: 6px;
                  border: 1px solid #e2e8f0;
                }
                
                .detail-item .label {
                  font-size: 10px;
                  text-transform: uppercase;
                  color: #666;
                  margin-bottom: 4px;
                }
                
                .detail-item .value {
                  font-size: 14px;
                  font-weight: 600;
                  color: #1a365d;
                }
                
                .signatures-section {
                  margin-top: 40px;
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 30px;
                }
                
                .signature-box {
                  text-align: center;
                  padding: 15px;
                }
                
                .signature-title {
                  font-weight: bold;
                  font-size: 12px;
                  color: #1a365d;
                  margin-bottom: 50px;
                  text-transform: uppercase;
                }
                
                .signature-line {
                  border-top: 2px solid #333;
                  width: 100%;
                  margin-bottom: 8px;
                }
                
                .signature-label {
                  font-size: 10px;
                  color: #666;
                }
                
                .footer-note {
                  margin-top: 30px;
                  padding: 15px;
                  background: #f1f5f9;
                  border-radius: 6px;
                  text-align: center;
                  font-size: 10px;
                  color: #666;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Delivery Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-white text-black p-6" id="sales-delivery-note">
          {/* Company Header */}
          <div className="delivery-header text-center border-b-2 border-primary pb-5 mb-6">
            <div className="logo-container inline-block bg-[#0d3d1f] p-4 rounded-lg mb-4">
              <img 
                src="/lovable-uploads/great-pearl-coffee-logo.png" 
                alt="Great Pearl Coffee Factory Logo" 
                className="h-16 w-auto"
              />
            </div>
            <h1 className="company-title text-2xl font-bold text-[#1a365d] uppercase tracking-wider mb-2">
              GREAT PEARL COFFEE FACTORY
            </h1>
            <p className="company-tagline text-sm text-gray-600 mb-1">Specialty Coffee Processing & Export</p>
            <p className="text-xs text-gray-500">+256781121639 / +256778536681 | greatpearlcoffee@gmail.com</p>
            <p className="text-xs text-gray-500">Uganda Coffee Development Authority Licensed</p>
            
            <div className="doc-title inline-block mt-4 px-6 py-2 border-2 border-[#1a365d] font-bold text-[#1a365d] uppercase">
              COFFEE DELIVERY NOTE
            </div>
            
            <div className="doc-info mt-3 text-sm text-gray-600">
              <p>Document No: <strong>{documentNumber}</strong></p>
              <p>Date: <strong>{format(saleData.date, 'dd MMMM yyyy')}</strong></p>
            </div>
          </div>

          {/* Customer & Delivery Info */}
          <div className="info-grid grid grid-cols-2 gap-8 mb-6">
            <div className="info-section border rounded-lg p-4 bg-gray-50">
              <h3 className="font-bold text-[#1a365d] border-b-2 border-[#1a365d] pb-2 mb-3">DELIVERED TO</h3>
              <div className="space-y-2">
                <div className="info-row flex justify-between py-1 border-b border-dashed border-gray-200">
                  <span className="info-label font-semibold">Customer:</span>
                  <span className="info-value">{saleData.customer}</span>
                </div>
                <div className="info-row flex justify-between py-1">
                  <span className="info-label font-semibold">Delivery Date:</span>
                  <span className="info-value">{format(saleData.date, 'dd/MM/yyyy')}</span>
                </div>
              </div>
            </div>
            
            <div className="info-section border rounded-lg p-4 bg-gray-50">
              <h3 className="font-bold text-[#1a365d] border-b-2 border-[#1a365d] pb-2 mb-3">TRANSPORT DETAILS</h3>
              <div className="space-y-2">
                <div className="info-row flex justify-between py-1 border-b border-dashed border-gray-200">
                  <span className="info-label font-semibold">Truck No:</span>
                  <span className="info-value">{saleData.truckDetails || 'N/A'}</span>
                </div>
                <div className="info-row flex justify-between py-1">
                  <span className="info-label font-semibold">Driver:</span>
                  <span className="info-value">{saleData.driverDetails || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coffee Details */}
          <div className="delivery-details border-2 border-[#1a365d] rounded-lg p-5 mb-6 bg-slate-50">
            <h3 className="text-lg font-bold text-[#1a365d] mb-4 uppercase">Coffee Details</h3>
            <div className="details-grid grid grid-cols-2 gap-4">
              <div className="detail-item bg-white p-3 rounded border">
                <div className="label text-xs uppercase text-gray-500 mb-1">Coffee Type</div>
                <div className="value text-base font-semibold text-[#1a365d]">{saleData.coffeeType}</div>
              </div>
              <div className="detail-item bg-white p-3 rounded border">
                <div className="label text-xs uppercase text-gray-500 mb-1">Total Weight</div>
                <div className="value text-base font-semibold text-[#1a365d]">{saleData.weight.toLocaleString()} KG</div>
              </div>
              <div className="detail-item bg-white p-3 rounded border">
                <div className="label text-xs uppercase text-gray-500 mb-1">Moisture Content</div>
                <div className="value text-base font-semibold text-[#1a365d]">{saleData.moisture ? `${saleData.moisture}%` : 'N/A'}</div>
              </div>
              <div className="detail-item bg-white p-3 rounded border">
                <div className="label text-xs uppercase text-gray-500 mb-1">Condition</div>
                <div className="value text-base font-semibold text-[#1a365d]">Good</div>
              </div>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="signatures-section grid grid-cols-3 gap-8 mt-10">
            <div className="signature-box text-center p-4">
              <div className="signature-title font-bold text-sm text-[#1a365d] uppercase mb-12">
                Driver's Signature
              </div>
              <div className="signature-line border-t-2 border-gray-800 mb-2"></div>
              <div className="signature-label text-xs text-gray-500">Name: {saleData.driverDetails || '_____________'}</div>
              <div className="signature-label text-xs text-gray-500 mt-1">Date: _______________</div>
            </div>
            
            <div className="signature-box text-center p-4">
              <div className="signature-title font-bold text-sm text-[#1a365d] uppercase mb-12">
                Store Manager's Signature
              </div>
              <div className="signature-line border-t-2 border-gray-800 mb-2"></div>
              <div className="signature-label text-xs text-gray-500">Name: _______________</div>
              <div className="signature-label text-xs text-gray-500 mt-1">Date: _______________</div>
            </div>
            
            <div className="signature-box text-center p-4">
              <div className="signature-title font-bold text-sm text-[#1a365d] uppercase mb-12">
                Received By (Customer)
              </div>
              <div className="signature-line border-t-2 border-gray-800 mb-2"></div>
              <div className="signature-label text-xs text-gray-500">Name: _______________</div>
              <div className="signature-label text-xs text-gray-500 mt-1">Date: _______________</div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer-note mt-8 p-4 bg-slate-100 rounded text-center text-xs text-gray-500">
            <p>This delivery note serves as proof of delivery and should be retained for records.</p>
            <p className="mt-1">Generated by Great Pearl Coffee Factory Management System</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Delivery Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesDeliveryNoteModal;