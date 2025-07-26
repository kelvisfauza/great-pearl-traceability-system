import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Receipt, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ReceiptPrintModal from './ReceiptPrintModal';

interface IssueReceiptModalProps {
  open: boolean;
  onClose: () => void;
}

interface CoffeeDelivery {
  id: string;
  batch_number: string;
  supplier_name: string;
  kilograms: number;
  grade: string;
  date_delivered: string;
  status: string;
  hasAdvance?: boolean;
  advance_amount?: number;
}

const IssueReceiptModal: React.FC<IssueReceiptModalProps> = ({ open, onClose }) => {
  const [deliveries, setDeliveries] = useState<CoffeeDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);
  
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return `UGX ${amount?.toLocaleString() || 0}`;
  };

  const fetchCoffeeDeliveries = async () => {
    try {
      setLoading(true);
      console.log('Fetching coffee deliveries...');
      
      // Fetch coffee records
      const coffeeQuery = query(collection(db, 'coffee_records'));
      const coffeeSnapshot = await getDocs(coffeeQuery);
      const coffeeRecords = coffeeSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          batch_number: data.batch_number || '',
          supplier_name: data.supplier_name || '',
          kilograms: data.kilograms || 0,
          grade: data.grade || 'Unknown',
          date_delivered: data.date_delivered || data.created_at || '',
          status: 'Delivered',
          ...data
        };
      });

      // Fetch supplier advances to check which suppliers have advances
      const advancesQuery = query(
        collection(db, 'supplier_advances'),
        where('status', '==', 'Active')
      );
      const advancesSnapshot = await getDocs(advancesQuery);
      const advances = advancesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Match deliveries with advances
      const deliveriesWithAdvances = coffeeRecords.map(delivery => {
        const supplierAdvance = advances.find((advance: any) => 
          advance.supplierName === delivery.supplier_name
        );
        
        return {
          ...delivery,
          hasAdvance: !!supplierAdvance,
          advance_amount: (supplierAdvance as any)?.amount || 0
        };
      });

      console.log('Coffee deliveries fetched:', deliveriesWithAdvances.length);
      setDeliveries(deliveriesWithAdvances);
    } catch (error) {
      console.error('Error fetching coffee deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch coffee deliveries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueReceipt = () => {
    const delivery = deliveries.find(d => d.id === selectedDelivery);
    if (!delivery) {
      toast({
        title: "Error",
        description: "Please select a coffee delivery",
        variant: "destructive"
      });
      return;
    }

    // Generate receipt data
    const receipt = {
      id: `RCP-${Date.now()}`,
      supplier: delivery.supplier_name,
      amount: delivery.hasAdvance ? delivery.advance_amount : 0,
      method: "Cash",
      status: "Paid",
      batch_number: delivery.batch_number,
      kilograms: delivery.kilograms,
      grade: delivery.grade,
      date: new Date().toLocaleDateString(),
      delivery_date: delivery.date_delivered,
      receipt_type: delivery.hasAdvance ? "Advance Settlement" : "Coffee Delivery"
    };

    setGeneratedReceipt(receipt);
    setShowReceiptModal(true);
    onClose();

    toast({
      title: "Receipt Generated",
      description: `Receipt generated for ${delivery.supplier_name} - ${delivery.batch_number}`,
    });
  };

  useEffect(() => {
    if (open) {
      fetchCoffeeDeliveries();
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Issue Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Select a coffee delivery to generate a payment receipt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery">Coffee Delivery</Label>
              <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coffee delivery" />
                </SelectTrigger>
                <SelectContent>
                  {deliveries.map((delivery) => (
                    <SelectItem key={delivery.id} value={delivery.id}>
                      <div className="flex items-center gap-2 w-full">
                        <Coffee className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">{delivery.batch_number}</div>
                          <div className="text-sm text-gray-500">
                            {delivery.supplier_name} • {delivery.kilograms}kg • {delivery.grade}
                          </div>
                        </div>
                        {delivery.hasAdvance && (
                          <Badge variant="secondary" className="ml-2">
                            Has Advance
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDelivery && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-2">Delivery Details</h4>
                {deliveries
                  .filter(d => d.id === selectedDelivery)
                  .map(delivery => (
                    <div key={delivery.id} className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Supplier:</span>
                        <span className="font-medium">{delivery.supplier_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Batch:</span>
                        <span>{delivery.batch_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weight:</span>
                        <span>{delivery.kilograms} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Grade:</span>
                        <span>{delivery.grade}</span>
                      </div>
                      {delivery.hasAdvance && (
                        <div className="flex justify-between text-green-600">
                          <span>Advance Given:</span>
                          <span className="font-medium">{formatCurrency(delivery.advance_amount || 0)}</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleIssueReceipt}
              disabled={!selectedDelivery || loading}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Generate Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptPrintModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        payment={generatedReceipt}
        formatCurrency={formatCurrency}
      />
    </>
  );
};

export default IssueReceiptModal;