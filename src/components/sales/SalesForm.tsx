import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Printer, Save, Upload, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSalesTransactions } from '@/hooks/useSalesTransactions';
import DeliveryNoteModal from './DeliveryNoteModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  grnFile?: File;
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
  const [availableInventory, setAvailableInventory] = useState<number>(0);
  const [checkingInventory, setCheckingInventory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { createTransaction, uploadGRNFile, checkInventoryAvailability } = useSalesTransactions();

  // Check inventory when coffee type changes
  useEffect(() => {
    if (formData.coffeeType) {
      setCheckingInventory(true);
      checkInventoryAvailability(formData.coffeeType, 0).then(result => {
        setAvailableInventory(result.available);
        setCheckingInventory(false);
      });
    } else {
      setAvailableInventory(0);
    }
  }, [formData.coffeeType]);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, grnFile: file }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    // Check if trying to sell more than available inventory
    if (formData.weight > availableInventory) {
      toast({
        title: "Insufficient Inventory",
        description: `Cannot sell ${formData.weight} kg. Only ${availableInventory.toFixed(2)} kg available in store for ${formData.coffeeType}.`,
        variant: "destructive"
      });
      return;
    }

    // Check if no inventory available
    if (availableInventory === 0) {
      toast({
        title: "No Inventory Available",
        description: `No ${formData.coffeeType} available in store. Please check procurement records.`,
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      // Create sales transaction
      // Format date in local timezone to prevent UTC conversion shifting the date
      const localDate = `${formData.date.getFullYear()}-${String(formData.date.getMonth() + 1).padStart(2, '0')}-${String(formData.date.getDate()).padStart(2, '0')}`;
      const transactionData = {
        date: localDate,
        customer: formData.customer,
        coffee_type: formData.coffeeType,
        moisture: formData.moisture,
        weight: formData.weight,
        unit_price: formData.unitPrice,
        total_amount: formData.totalAmount,
        truck_details: formData.truckDetails,
        driver_details: formData.driverDetails,
        status: 'Completed' as const
      };
      
      const savedTransaction = await createTransaction(transactionData);
      setLastSaleRecord(savedTransaction);

      // Upload GRN file if provided
      if (formData.grnFile && savedTransaction) {
        await uploadGRNFile(formData.grnFile, savedTransaction.id);
      }

      // Reset form with current date (will automatically be today's date)
      setFormData({
        date: new Date(), // This ensures it's always today's date when saving
        customer: '',
        coffeeType: '',
        moisture: '',
        weight: 0,
        unitPrice: 0,
        totalAmount: 0,
        truckDetails: '',
        driverDetails: ''
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error saving sale:', error);
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

            {/* Coffee Type with Inventory Info */}
            <div className="space-y-2 col-span-2">
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
              {formData.coffeeType && (
                <Alert className={availableInventory > 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                  <AlertCircle className={`h-4 w-4 ${availableInventory > 0 ? "text-green-600" : "text-red-600"}`} />
                  <AlertDescription className={availableInventory > 0 ? "text-green-800" : "text-red-800"}>
                    {checkingInventory ? 'Checking inventory...' : 
                      availableInventory > 0 
                        ? `Available in inventory: ${availableInventory.toFixed(2)} kg`
                        : 'No inventory available for this coffee type'
                    }
                  </AlertDescription>
                </Alert>
              )}
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
                max={availableInventory}
              />
              {formData.weight > availableInventory && formData.coffeeType && (
                <p className="text-sm text-red-600">
                  Cannot sell more than available inventory ({availableInventory.toFixed(2)} kg)
                </p>
              )}
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

            {/* GRN File Upload */}
            <div className="space-y-2 col-span-2">
              <Label>Upload Sales GRN (Optional)</Label>
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {formData.grnFile ? 'Change File' : 'Upload GRN'}
                </Button>
                {formData.grnFile && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    {formData.grnFile.name}
                  </div>
                )}
              </div>
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
              disabled={loading || formData.weight > availableInventory || availableInventory === 0}
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