import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

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
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Delivery Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="delivery-note-content space-y-6 p-6 bg-white text-black" id="delivery-note">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">COFFEE DELIVERY NOTE</h1>
            <p className="text-sm text-gray-600 mt-2">Document Number: DN-{format(new Date(), 'yyyyMMdd')}-{Math.floor(Math.random() * 1000)}</p>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-2">From:</h3>
              <div className="space-y-1">
                <p className="font-medium">Your Coffee Company</p>
                <p>123 Coffee Street</p>
                <p>Kampala, Uganda</p>
                <p>Tel: +256 XXX XXX XXX</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">To:</h3>
              <div className="space-y-1">
                <p className="font-medium">{saleData.customer}</p>
                <p>Customer Address</p>
                <p>Date: {format(saleData.date, 'dd/MM/yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-4">Delivery Details</h3>
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
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-2">Quality Information</h3>
            <p>Coffee delivered as per agreed specifications and quality standards.</p>
            {saleData.moisture && <p>Moisture content: {saleData.moisture}%</p>}
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="border-t pt-4">
              <p className="text-center">Delivered By</p>
              <div className="h-16"></div>
              <p className="text-center">Signature & Date</p>
            </div>
            <div className="border-t pt-4">
              <p className="text-center">Received By</p>
              <div className="h-16"></div>
              <p className="text-center">Signature & Date</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600 border-t pt-4">
            <p>This delivery note serves as proof of delivery and should be retained for records.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
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