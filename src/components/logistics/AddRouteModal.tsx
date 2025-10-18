import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

interface AddRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddRouteModal = ({ open, onOpenChange }: AddRouteModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>(["", ""]);
  const [formData, setFormData] = useState({
    name: "",
    distance_km: "",
    frequency: "Daily",
    estimated_hours: ""
  });

  const addLocation = () => {
    setLocations([...locations, ""]);
  };

  const removeLocation = (index: number) => {
    if (locations.length > 2) {
      setLocations(locations.filter((_, i) => i !== index));
    }
  };

  const updateLocation = (index: number, value: string) => {
    const newLocations = [...locations];
    newLocations[index] = value;
    setLocations(newLocations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const filteredLocations = locations.filter(loc => loc.trim() !== "");
      
      if (filteredLocations.length < 2) {
        toast({
          title: "Error",
          description: "Please add at least 2 locations",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('delivery_routes').insert({
        name: formData.name,
        locations: filteredLocations,
        distance_km: parseFloat(formData.distance_km),
        frequency: formData.frequency,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        active_vehicles: 0
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route added successfully"
      });

      onOpenChange(false);
      setFormData({
        name: "",
        distance_km: "",
        frequency: "Daily",
        estimated_hours: ""
      });
      setLocations(["", ""]);
    } catch (error) {
      console.error('Error adding route:', error);
      toast({
        title: "Error",
        description: "Failed to add route",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Route</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Route Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Kampala - Mbarara Route"
              required
            />
          </div>

          <div>
            <Label>Locations</Label>
            <div className="space-y-2">
              {locations.map((location, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={location}
                    onChange={(e) => updateLocation(index, e.target.value)}
                    placeholder={`Location ${index + 1}`}
                    required
                  />
                  {locations.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeLocation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLocation}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="distance_km">Distance (km)</Label>
            <Input
              id="distance_km"
              type="number"
              step="0.1"
              value={formData.distance_km}
              onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
              placeholder="Total distance"
              required
            />
          </div>

          <div>
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              placeholder="Travel time estimate"
            />
          </div>

          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="On-demand">On-demand</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Route"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
