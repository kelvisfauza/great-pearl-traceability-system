import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SalesTransaction {
  id: string;
  customer: string;
  coffee_type: string;
  weight: number;
  unit_price: number;
  total_amount: number;
  status: string;
  date: string;
  moisture?: string;
  truck_details?: string;
  driver_details?: string;
}

interface EditSalesTransactionDialogProps {
  transaction: SalesTransaction;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

export const EditSalesTransactionDialog = ({
  transaction,
  open,
  onClose,
  onSuccess
}: EditSalesTransactionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(transaction.date),
    customer: transaction.customer,
    coffeeType: transaction.coffee_type,
    moisture: transaction.moisture || '',
    weight: transaction.weight,
    unitPrice: transaction.unit_price,
    totalAmount: transaction.total_amount,
    truckDetails: transaction.truck_details || '',
    driverDetails: transaction.driver_details || '',
    status: transaction.status
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'weight' || field === 'unitPrice') {
        updated.totalAmount = updated.weight * updated.unitPrice;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Format date in local timezone
      const localDate = `${formData.date.getFullYear()}-${String(formData.date.getMonth() + 1).padStart(2, '0')}-${String(formData.date.getDate()).padStart(2, '0')}`;
      
      const { error } = await supabase
        .from('sales_transactions')
        .update({
          date: localDate,
          customer: formData.customer,
          coffee_type: formData.coffeeType,
          moisture: formData.moisture,
          weight: formData.weight,
          unit_price: formData.unitPrice,
          total_amount: formData.totalAmount,
          truck_details: formData.truckDetails,
          driver_details: formData.driverDetails,
          status: formData.status
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales transaction updated successfully"
      });
      onSuccess();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sales Transaction</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>Sale Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, "PPP")}
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
            <Label>Customer</Label>
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
            <Label>Coffee Type</Label>
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
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              value={formData.weight || ''}
              onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Unit Price */}
          <div className="space-y-2">
            <Label>Unit Price (UGX/kg)</Label>
            <Input
              type="number"
              value={formData.unitPrice || ''}
              onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Total Amount */}
          <div className="space-y-2">
            <Label>Total Amount (UGX)</Label>
            <Input
              type="number"
              value={formData.totalAmount}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Truck Details */}
          <div className="space-y-2">
            <Label>Truck Details</Label>
            <Input
              value={formData.truckDetails}
              onChange={(e) => handleInputChange('truckDetails', e.target.value)}
            />
          </div>

          {/* Driver Details */}
          <div className="space-y-2">
            <Label>Driver Details</Label>
            <Input
              value={formData.driverDetails}
              onChange={(e) => handleInputChange('driverDetails', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};