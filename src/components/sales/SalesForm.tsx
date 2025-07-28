import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Printer, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useInventoryManagement } from '@/hooks/useInventoryManagement';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import DeliveryNoteModal from './DeliveryNoteModal';

interface SalesFormData {
  date: Date;
  customer: string;
  coffeeType: string;
  moisture: string;
  weight: number;
  unitPrice: number;
  totalAmount: number;
  truckDetails: string;
  driverDetails: string;
}

const SalesForm = () => {
  const [formData, setFormData] = useState<SalesFormData>({
    date: new Date(),
    customer: '',
    coffeeType: '',
    moisture: '',
    weight: 0,
    unitPrice: 0,
    totalAmount: 0,
    truckDetails: '',
    driverDetails: ''
  });
  
  const [showDeliveryNote, setShowDeliveryNote] = useState(false);
  const [lastSaleRecord, setLastSaleRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { fetchInventoryData } = useInventoryManagement();

  const customers = [
    'Starbucks Uganda',
    'Java House',
    'Good African Coffee',
    'Volcafe Uganda',
    'Kyagalanyi Coffee',
    'Export Client A',
    'Export Client B'
  ];

  const coffeeTypes = [
    'Arabica',
    'Robusta',
    'Screen 18',
    'Screen 15',
    'FAQ',
    'Bugisu AA'
  ];

  const handleInputChange = (field: keyof SalesFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total amount when weight or unit price changes
      if (field === 'weight' || field === 'unitPrice') {
        updated.totalAmount = updated.weight * updated.unitPrice;
      }
      
      return updated;
    });
  };

  const validateForm = () => {
    if (!formData.customer || !formData.coffeeType || !formData.weight || 
        !formData.unitPrice || !formData.truckDetails || !formData.driverDetails) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Save sales transaction
      const saleRecord = {
        ...formData,
        date: formData.date.toISOString().split('T')[0],
        status: 'Completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'sales_transactions'), saleRecord);
      setLastSaleRecord({ ...saleRecord, id: docRef.id });

      // Update inventory - reduce stock
      await addDoc(collection(db, 'inventory_movements'), {
        coffee_type: formData.coffeeType,
        movement_type: 'outbound',
        quantity: formData.weight,
        reason: 'Sale to ' + formData.customer,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      // Add to finance transactions (revenue)
      await addDoc(collection(db, 'finance_transactions'), {
        type: 'Income',
        description: `Coffee sale to ${formData.customer}`,
        amount: formData.totalAmount,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Sale Recorded Successfully",
        description: `Sale of ${formData.weight}kg to ${formData.customer} has been recorded`,
      });

      // Reset form
      setFormData({
        date: new Date(),
        customer: '',
        coffeeType: '',
        moisture: '',
        weight: 0,
        unitPrice: 0,
        totalAmount: 0,
        truckDetails: '',
        driverDetails: ''
      });

    } catch (error) {
      console.error('Error saving sale:', error);
      toast({
        title: "Error",
        description: "Failed to record sale",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDeliveryNote = () => {
    if (!validateForm()) return;
    setShowDeliveryNote(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Coffee Sales Form
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Sale Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", 
                      !formData.date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && handleInputChange('date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={formData.customer} onValueChange={(value) => handleInputChange('customer', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coffee Type */}
            <div className="space-y-2">
              <Label>Coffee Type *</Label>
              <Select value={formData.coffeeType} onValueChange={(value) => handleInputChange('coffeeType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coffee type" />
                </SelectTrigger>
                <SelectContent>
                  {coffeeTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Moisture */}
            <div className="space-y-2">
              <Label>Moisture (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.moisture}
                onChange={(e) => handleInputChange('moisture', e.target.value)}
                placeholder="Enter moisture percentage"
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label>Weight (kg) *</Label>
              <Input
                type="number"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                placeholder="Enter weight in kg"
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-2">
              <Label>Unit Price (UGX/kg) *</Label>
              <Input
                type="number"
                value={formData.unitPrice || ''}
                onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
                placeholder="Enter unit price"
              />
            </div>

            {/* Total Amount (Read-only) */}
            <div className="space-y-2">
              <Label>Total Amount (UGX)</Label>
              <Input
                type="number"
                value={formData.totalAmount}
                readOnly
                className="bg-muted"
              />
            </div>

            {/* Truck Details */}
            <div className="space-y-2">
              <Label>Truck Details *</Label>
              <Input
                value={formData.truckDetails}
                onChange={(e) => handleInputChange('truckDetails', e.target.value)}
                placeholder="Truck number plate, capacity, etc."
              />
            </div>

            {/* Driver Details */}
            <div className="space-y-2">
              <Label>Driver Details *</Label>
              <Input
                value={formData.driverDetails}
                onChange={(e) => handleInputChange('driverDetails', e.target.value)}
                placeholder="Driver name, phone number"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={handlePrintDeliveryNote}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Delivery Note
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Sale'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeliveryNoteModal
        open={showDeliveryNote}
        onClose={() => setShowDeliveryNote(false)}
        saleData={formData}
      />
    </>
  );
};

export default SalesForm;