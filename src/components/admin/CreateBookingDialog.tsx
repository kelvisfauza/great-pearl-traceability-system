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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCoffeeBookings } from '@/hooks/useCoffeeBookings';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Coffee, Calendar, DollarSign, Phone, MessageSquare, ChevronsUpDown, Check, Search } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateBookingDialog = ({ open, onOpenChange }: CreateBookingDialogProps) => {
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { createBooking } = useCoffeeBookings();
  const { prices } = useReferencePrices();
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    coffee_type: '' as 'Arabica' | 'Robusta' | '',
    booked_quantity_kg: '',
    booked_price_per_kg: '',
    expected_delivery_date: '',
    expiry_days: '14',
    notes: '',
    supplier_phone: '',
    send_sms: true
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

  const sendBookingSMS = async (phone: string, bookingData: {
    supplier_name: string;
    coffee_type: string;
    quantity: number;
    price: number;
    expiry_date: string;
  }) => {
    const message = `Great Pearl Coffee - Booking Confirmed ✅

Dear ${bookingData.supplier_name},

We have secured a booking for your coffee:
☕ Type: ${bookingData.coffee_type}
📦 Quantity: ${bookingData.quantity.toLocaleString()} kg
💰 Price: UGX ${bookingData.price.toLocaleString()}/kg
📅 Valid until: ${bookingData.expiry_date}

Please deliver to our store within the booking period.

Thank you for partnering with Great Pearl Coffee!`;

    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: { phone, message }
      });
      
      if (error) throw error;
      
      toast({
        title: "SMS Sent",
        description: `Booking confirmation sent to ${phone}`
      });
    } catch (error) {
      console.error('Failed to send booking SMS:', error);
      toast({
        title: "SMS Failed",
        description: "Booking created but SMS notification failed",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id || !formData.coffee_type || !formData.booked_quantity_kg || !formData.booked_price_per_kg) {
      return;
    }

    setLoading(true);
    
    const expiryDate = addDays(new Date(), parseInt(formData.expiry_days));
    const expiryDateFormatted = format(expiryDate, 'MMM dd, yyyy');
    
    const result = await createBooking({
      supplier_id: formData.supplier_id,
      supplier_name: selectedSupplier?.name || '',
      coffee_type: formData.coffee_type as 'Arabica' | 'Robusta',
      booked_quantity_kg: parseFloat(formData.booked_quantity_kg),
      booked_price_per_kg: parseFloat(formData.booked_price_per_kg),
      expected_delivery_date: formData.expected_delivery_date || undefined,
      expiry_date: format(expiryDate, 'yyyy-MM-dd'),
      notes: formData.notes || undefined,
      supplier_phone: formData.supplier_phone || undefined,
      created_by: employee?.name || 'Unknown'
    });

    if (result.success) {
      // Send SMS if phone provided and send_sms is checked
      if (formData.supplier_phone && formData.send_sms) {
        await sendBookingSMS(formData.supplier_phone, {
          supplier_name: selectedSupplier?.name || '',
          coffee_type: formData.coffee_type,
          quantity: parseFloat(formData.booked_quantity_kg),
          price: parseFloat(formData.booked_price_per_kg),
          expiry_date: expiryDateFormatted
        });
      }
      
      setFormData({
        supplier_id: '',
        coffee_type: '',
        booked_quantity_kg: '',
        booked_price_per_kg: '',
        expected_delivery_date: '',
        expiry_days: '14',
        notes: '',
        supplier_phone: '',
        send_sms: true
      });
      onOpenChange(false);
    }
    
    setLoading(false);
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
            <Label className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Supplier
            </Label>
            <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierOpen}
                  className="w-full justify-between font-normal"
                  disabled={suppliersLoading}
                >
                  {formData.supplier_id
                    ? suppliers.find((s) => s.id === formData.supplier_id)?.name
                    : suppliersLoading ? "Loading suppliers..." : "Search supplier..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search supplier by name..." />
                  <CommandList>
                    <CommandEmpty>No supplier found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      {suppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          value={supplier.name}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, supplier_id: supplier.id }));
                            setSupplierOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.supplier_id === supplier.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{supplier.name}</span>
                            {(supplier as any).supplier_code && (
                              <span className="text-xs text-muted-foreground">{(supplier as any).supplier_code}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

          {/* SMS Notification Section */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              SMS Notification
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Supplier Phone
              </Label>
              <Input
                type="tel"
                placeholder="e.g., 0772123456"
                value={formData.supplier_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_phone: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="send_sms" 
                checked={formData.send_sms}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_sms: checked === true }))}
                disabled={!formData.supplier_phone}
              />
              <label
                htmlFor="send_sms"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Send booking confirmation SMS to supplier
              </label>
            </div>
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
