import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMillingData } from '@/hooks/useMillingData';

interface MillingCustomerEditDialogProps {
  open: boolean;
  onClose: () => void;
  customer: {
    id: string;
    full_name: string;
    phone: string | null;
    address: string | null;
    status: string;
  } | null;
}

const MillingCustomerEditDialog = ({ open, onClose, customer }: MillingCustomerEditDialogProps) => {
  const { updateCustomer } = useMillingData();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    status: 'Active'
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        full_name: customer.full_name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        status: customer.status || 'Active'
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    setLoading(true);
    try {
      await updateCustomer(customer.id, {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        status: formData.status
      });
      onClose();
    } catch (error) {
      console.error('Error updating customer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Full Name *</Label>
            <Input
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phone">Phone Number (for USSD identification)</Label>
            <Input
              id="edit_phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g. 0772123456 or 256772123456"
            />
            <p className="text-xs text-muted-foreground">
              This number is used by the USSD system to identify the customer
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_address">Address</Label>
            <Textarea
              id="edit_address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.full_name.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MillingCustomerEditDialog;
