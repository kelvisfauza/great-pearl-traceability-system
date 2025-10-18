import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Warehouse } from "@/hooks/useLogistics";

interface EditWarehouseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
  onSuccess?: () => void;
}

export const EditWarehouseModal = ({ open, onOpenChange, warehouse, onSuccess }: EditWarehouseModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: "",
    capacity_bags: "",
    current_bags: "",
    status: "Operational"
  });

  useEffect(() => {
    if (warehouse) {
      setFormData({
        location: warehouse.location,
        capacity_bags: warehouse.capacity_bags.toString(),
        current_bags: warehouse.current_bags.toString(),
        status: warehouse.status
      });
    }
  }, [warehouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const capacityBags = parseInt(formData.capacity_bags);
      const currentBags = parseInt(formData.current_bags);
      const utilizationPercentage = (currentBags / capacityBags) * 100;

      const { error } = await supabase
        .from('warehouses')
        .update({
          location: formData.location,
          capacity_bags: capacityBags,
          current_bags: currentBags,
          utilization_percentage: utilizationPercentage,
          status: formData.status
        })
        .eq('id', warehouse?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Warehouse updated successfully"
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast({
        title: "Error",
        description: "Failed to update warehouse",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!warehouse) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Warehouse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Warehouse location"
              required
            />
          </div>

          <div>
            <Label htmlFor="capacity_bags">Capacity (bags)</Label>
            <Input
              id="capacity_bags"
              type="number"
              value={formData.capacity_bags}
              onChange={(e) => setFormData({ ...formData, capacity_bags: e.target.value })}
              placeholder="Total capacity"
              required
            />
          </div>

          <div>
            <Label htmlFor="current_bags">Current Stock (bags)</Label>
            <Input
              id="current_bags"
              type="number"
              value={formData.current_bags}
              onChange={(e) => setFormData({ ...formData, current_bags: e.target.value })}
              placeholder="Current stock"
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operational">Operational</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                <SelectItem value="Full">Full</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
