import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SalesDeliveryNoteModal from "./SalesDeliveryNoteModal";

interface InventoryItem {
  id: string;
  coffee_type: string;
  total_kilograms: number;
  location: string;
}

const NewSaleForm = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showDeliveryNote, setShowDeliveryNote] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [formData, setFormData] = useState({
    customer: '',
    coffee_type: '',
    weight: '',
    unit_price: '',
    moisture: '',
    truck_details: '',
    driver_details: ''
  });

  useEffect(() => {
    fetchAvailableInventory();
  }, []);

  const fetchAvailableInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .gt('total_kilograms', 0)
        .eq('status', 'available');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const weight = parseFloat(formData.weight) || 0;
    const price = parseFloat(formData.unit_price) || 0;
    return weight * price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer || !formData.coffee_type || !formData.weight || !formData.unit_price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const weight = parseFloat(formData.weight);
    const selectedInventory = inventory.find(i => i.coffee_type === formData.coffee_type);
    
    if (selectedInventory && weight > selectedInventory.total_kilograms) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${selectedInventory.total_kilograms} kg available for ${formData.coffee_type}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        customer: formData.customer,
        coffee_type: formData.coffee_type,
        weight: parseFloat(formData.weight),
        unit_price: parseFloat(formData.unit_price),
        total_amount: calculateTotal(),
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        truck_details: formData.truck_details || '',
        driver_details: formData.driver_details || '',
        moisture: formData.moisture || ''
      };

      const { error } = await supabase
        .from('sales_transactions')
        .insert(saleData);

      if (error) throw error;

      // Record inventory movement if there's inventory to track
      if (selectedInventory) {
        await supabase.from('inventory_movements').insert({
          coffee_record_id: selectedInventory.id,
          movement_type: 'SALE',
          quantity_kg: -parseFloat(formData.weight),
          created_by: employee?.email || 'system',
          notes: `Sale to ${formData.customer}`
        });
      }

      // Store sale data for delivery note
      setLastSaleData({
        date: new Date(),
        customer: formData.customer,
        coffeeType: formData.coffee_type,
        weight: parseFloat(formData.weight),
        moisture: formData.moisture,
        truckDetails: formData.truck_details,
        driverDetails: formData.driver_details
      });

      toast({
        title: "Sale Recorded",
        description: "The sales transaction has been saved successfully"
      });

      // Reset form
      setFormData({
        customer: '',
        coffee_type: '',
        weight: '',
        unit_price: '',
        moisture: '',
        truck_details: '',
        driver_details: ''
      });
      
      fetchAvailableInventory();
      
      // Show delivery note modal
      setShowDeliveryNote(true);
    } catch (error) {
      console.error('Error creating sale:', error);
      toast({
        title: "Error",
        description: "Failed to record the sale. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueCoffeeTypes = [...new Set(inventory.map(i => i.coffee_type))];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer Name *</Label>
            <Input
              id="customer"
              value={formData.customer}
              onChange={(e) => handleInputChange('customer', e.target.value)}
              placeholder="Enter customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coffee_type">Coffee Type *</Label>
            <Select value={formData.coffee_type} onValueChange={(value) => handleInputChange('coffee_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select coffee type" />
              </SelectTrigger>
              <SelectContent>
                {uniqueCoffeeTypes.map((type) => {
                  const item = inventory.find(i => i.coffee_type === type);
                  return (
                    <SelectItem key={type} value={type}>
                      {type} ({item?.total_kilograms?.toLocaleString()} kg available)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg) *</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              placeholder="Enter weight in kg"
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit_price">Unit Price (UGX/kg) *</Label>
            <Input
              id="unit_price"
              type="number"
              value={formData.unit_price}
              onChange={(e) => handleInputChange('unit_price', e.target.value)}
              placeholder="Enter price per kg"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="moisture">Moisture Content (%)</Label>
            <Input
              id="moisture"
              type="number"
              value={formData.moisture}
              onChange={(e) => handleInputChange('moisture', e.target.value)}
              placeholder="Enter moisture %"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="truck_details">Truck Details</Label>
            <Input
              id="truck_details"
              value={formData.truck_details}
              onChange={(e) => handleInputChange('truck_details', e.target.value)}
              placeholder="Enter truck number plate"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="driver_details">Driver Details</Label>
            <Input
              id="driver_details"
              value={formData.driver_details}
              onChange={(e) => handleInputChange('driver_details', e.target.value)}
              placeholder="Enter driver name and contact"
            />
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount:</span>
            <span className="text-xl font-bold">
              {calculateTotal().toLocaleString()} UGX
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Sale
          </Button>
          {lastSaleData && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowDeliveryNote(true)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Delivery Note
            </Button>
          )}
        </div>
      </form>

      {lastSaleData && (
        <SalesDeliveryNoteModal
          open={showDeliveryNote}
          onClose={() => setShowDeliveryNote(false)}
          saleData={lastSaleData}
        />
      )}
    </>
  );
};

export default NewSaleForm;
