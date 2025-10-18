import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddVehicleModal = ({ open, onOpenChange }: AddVehicleModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    vehicle_type: "Truck",
    driver_name: "",
    driver_phone: "",
    route: "",
    status: "Available",
    load_capacity_bags: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('vehicles').insert({
        name: formData.name,
        vehicle_type: formData.vehicle_type,
        driver_name: formData.driver_name,
        driver_phone: formData.driver_phone || null,
        route: formData.route,
        status: formData.status,
        load_capacity_bags: formData.load_capacity_bags ? parseInt(formData.load_capacity_bags) : null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vehicle added successfully"
      });

      onOpenChange(false);
      setFormData({
        name: "",
        vehicle_type: "Truck",
        driver_name: "",
        driver_phone: "",
        route: "",
        status: "Available",
        load_capacity_bags: ""
      });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to add vehicle",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Vehicle Name/Number</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Truck-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="vehicle_type">Vehicle Type</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Truck">Truck</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Pickup">Pickup</SelectItem>
                <SelectItem value="Container">Container</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="driver_name">Driver Name</Label>
            <Input
              id="driver_name"
              value={formData.driver_name}
              onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
              placeholder="Driver's full name"
              required
            />
          </div>

          <div>
            <Label htmlFor="driver_phone">Driver Phone</Label>
            <Input
              id="driver_phone"
              value={formData.driver_phone}
              onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>

          <div>
            <Label htmlFor="route">Route</Label>
            <Input
              id="route"
              value={formData.route}
              onChange={(e) => setFormData({ ...formData, route: e.target.value })}
              placeholder="e.g., Kampala - Mbale"
              required
            />
          </div>

          <div>
            <Label htmlFor="load_capacity_bags">Load Capacity (bags)</Label>
            <Input
              id="load_capacity_bags"
              type="number"
              value={formData.load_capacity_bags}
              onChange={(e) => setFormData({ ...formData, load_capacity_bags: e.target.value })}
              placeholder="Number of bags"
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
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="En Route">En Route</SelectItem>
                <SelectItem value="Loading">Loading</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
