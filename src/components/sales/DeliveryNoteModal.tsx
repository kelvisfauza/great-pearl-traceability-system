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
        
        <div className="delivery-note-content bg-white text-black overflow-y-auto flex-1 text-sm" id="delivery-note">
          {/* Modern Header */}
          <div style={{ backgroundColor: '#0d3d1f', padding: '16px', marginBottom: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src="/lovable-uploads/great-pearl-coffee-logo.png" 
                  alt="Great Pearl Coffee" 
                  style={{ height: '50px', width: 'auto' }}
                />
                <div style={{ color: 'white' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>GREAT PEARL COFFEE FACTORY</h1>
                  <p style={{ fontSize: '11px', margin: '2px 0 0 0', opacity: '0.9' }}>Delivering coffee from the heart of Rwenzori</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', color: 'white', fontSize: '11px' }}>
                <p style={{ margin: '0' }}>+256781121639 / +256778536681</p>
                <p style={{ margin: '2px 0 0 0' }}>info@greatpearlcoffee.com</p>
              </div>
            </div>
          </div>

          {/* Document Title Bar */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px 16px', borderBottom: '2px solid #0d3d1f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: '#0d3d1f', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Delivery Note
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#666' }}>
              <p style={{ margin: '0', fontWeight: '600' }}>DN-{format(new Date(), 'yyyyMMdd')}-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
              <p style={{ margin: '2px 0 0 0' }}>Date: {format(saleData.date, 'dd/MM/yyyy')}</p>
            </div>
          </div>

          {/* From / To Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '10px', fontWeight: '600', color: '#0d3d1f', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>From (Seller)</h3>
              <p style={{ fontWeight: '600', margin: '0 0 4px 0', fontSize: '13px' }}>Great Pearl Coffee Factory</p>
              <p style={{ margin: '0', color: '#666', fontSize: '11px', lineHeight: '1.4' }}>
                Kasese, Uganda<br />
                UCDA Licensed Exporter
              </p>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <h3 style={{ fontSize: '10px', fontWeight: '600', color: '#0d3d1f', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>To (Buyer)</h3>
              <p style={{ fontWeight: '600', margin: '0 0 4px 0', fontSize: '13px' }}>{saleData.customer || 'N/A'}</p>
              <p style={{ margin: '0', color: '#666', fontSize: '11px' }}>Delivery Date: {format(saleData.date, 'dd/MM/yyyy')}</p>
            </div>
          </div>

          {/* Product Details Table */}
          <div style={{ padding: '14px 16px' }}>
            <h3 style={{ fontSize: '10px', fontWeight: '600', color: '#0d3d1f', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>Product Details</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0d3d1f', color: 'white' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>Quantity (Kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>Moisture %</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px', fontWeight: '500' }}>{saleData.coffeeType || 'N/A'}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>{saleData.weight?.toLocaleString() || '0'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{saleData.moisture || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transport Details */}
          <div style={{ padding: '0 16px 14px 16px' }}>
            <h3 style={{ fontSize: '10px', fontWeight: '600', color: '#0d3d1f', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>Transport Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Vehicle Registration</p>
                <p style={{ fontWeight: '600', margin: '0', fontSize: '12px' }}>{saleData.truckDetails || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Driver Name</p>
                <p style={{ fontWeight: '600', margin: '0', fontSize: '12px' }}>{saleData.driverDetails || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', marginBottom: '30px' }}>Dispatched By</p>
                <div style={{ borderTop: '1px solid #333', width: '80%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>Name / Sign / Date</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', marginBottom: '30px' }}>Driver</p>
                <div style={{ borderTop: '1px solid #333', width: '80%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>Name / Sign / Date</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', marginBottom: '30px' }}>Received By</p>
                <div style={{ borderTop: '1px solid #333', width: '80%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>Name / Sign / Date</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '10px 16px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: '9px', color: '#666', margin: '0' }}>
              This document confirms the dispatch of goods as described above. Please retain for your records.
            </p>
            <p style={{ fontSize: '8px', color: '#999', margin: '4px 0 0 0' }}>
              Great Pearl Coffee Factory | www.greatpearlcoffee.com | UCDA Licensed
            </p>
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