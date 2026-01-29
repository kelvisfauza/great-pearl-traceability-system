import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCoffeeBookings } from '@/hooks/useCoffeeBookings';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Coffee, Calendar, DollarSign } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateBookingDialog = ({ open, onOpenChange }: CreateBookingDialogProps) => {
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { createBooking } = useCoffeeBookings();
  const { prices } = useReferencePrices();
  const { employee } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    coffee_type: '' as 'Arabica' | 'Robusta' | '',
    booked_quantity_kg: '',
    booked_price_per_kg: '',
    expected_delivery_date: '',
    expiry_days: '14',
    notes: ''
  });

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  const handleCoffeeTypeChange = (type: 'Arabica' | 'Robusta') => {
    const suggestedPrice = type === 'Arabica' ? prices.arabicaBuyingPrice : prices.robustaBuyingPrice;
    setFormData(prev => ({
      ...prev,
      coffee_type: type,
      booked_price_per_kg: suggestedPrice.toString()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id || !formData.coffee_type || !formData.booked_quantity_kg || !formData.booked_price_per_kg) {
      return;
    }

    setLoading(true);
    
    const expiryDate = addDays(new Date(), parseInt(formData.expiry_days));
    
    const success = await createBooking({
      supplier_id: formData.supplier_id,
      supplier_name: selectedSupplier?.name || '',
      coffee_type: formData.coffee_type as 'Arabica' | 'Robusta',
      booked_quantity_kg: parseFloat(formData.booked_quantity_kg),
      booked_price_per_kg: parseFloat(formData.booked_price_per_kg),
      expected_delivery_date: formData.expected_delivery_date || undefined,
      expiry_date: format(expiryDate, 'yyyy-MM-dd'),
      notes: formData.notes || undefined,
      created_by: employee?.name || 'Unknown'
    });

    setLoading(false);

    if (success) {
      setFormData({
        supplier_id: '',
        coffee_type: '',
        booked_quantity_kg: '',
        booked_price_per_kg: '',
        expected_delivery_date: '',
        expiry_days: '14',
        notes: ''
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Create Coffee Booking
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select 
              value={formData.supplier_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={suppliersLoading ? "Loading..." : "Select supplier"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Coffee Type</Label>
            <Select 
              value={formData.coffee_type} 
              onValueChange={(value) => handleCoffeeTypeChange(value as 'Arabica' | 'Robusta')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arabica">Arabica</SelectItem>
                <SelectItem value="Robusta">Robusta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity (kg)</Label>
              <Input
                type="number"
                placeholder="e.g., 5000"
                value={formData.booked_quantity_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, booked_quantity_kg: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Price/kg (UGX)
              </Label>
              <Input
                type="number"
                placeholder="e.g., 8500"
                value={formData.booked_price_per_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, booked_price_per_kg: e.target.value }))}
              />
              {formData.coffee_type && (
                <p className="text-xs text-muted-foreground">
                  Current: {formData.coffee_type === 'Arabica' 
                    ? prices.arabicaBuyingPrice.toLocaleString() 
                    : prices.robustaBuyingPrice.toLocaleString()} UGX
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expected Delivery
              </Label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Booking Valid For</Label>
              <Select 
                value={formData.expiry_days} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, expiry_days: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="21">21 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional notes about this booking..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.supplier_id || !formData.coffee_type || !formData.booked_quantity_kg || !formData.booked_price_per_kg}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBookingDialog;
