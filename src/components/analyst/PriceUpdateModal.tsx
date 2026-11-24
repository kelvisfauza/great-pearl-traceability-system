import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PriceUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PriceUpdateModal = ({ open, onOpenChange }: PriceUpdateModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    outturn: "",
    moisture: "",
    fm: "",
    price: "",
    sendNotification: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.outturn || !formData.moisture || !formData.fm || !formData.price) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Save market update to Supabase
      const marketUpdate = {
        date: new Date().toISOString().split('T')[0],
        outturn: parseFloat(formData.outturn),
        moisture: parseFloat(formData.moisture),
        fm: parseFloat(formData.fm),
        price: parseFloat(formData.price),
        updated_by: "Data Analyst",
        created_at: new Date().toISOString()
      };

      const { data: savedUpdate, error: insertError } = await supabase
        .from('market_updates' as any)
        .insert(marketUpdate).select('id').single();

      if (insertError) {
        throw insertError;
      }

      // Post to Microsoft Teams - TRADE TEAM channel (fire-and-forget)
      {
        const dateStr = new Date().toLocaleDateString('en-GB');
        supabase.functions
          .invoke('teams-notify', {
            body: {
              channel: 'trade',
              title: `Arabica Price Update - ${dateStr}`,
              message: `Outturn: ${formData.outturn}%\nMoisture: ${formData.moisture}%\nFM: ${formData.fm}%\nPrice: UGX ${parseFloat(formData.price).toLocaleString()}/kg`,
            },
          })
          .catch((e) => console.error('teams-notify (price) failed', e));
      }

      let accepted = 0;
      let notAccepted = 0;
      // Send only the saved market update, never caller-composed prices.
      if (formData.sendNotification) {
        const { data: suppliers, error: suppliersError } = await supabase
          .from('suppliers')
          .select('id, name, phone')
          .not('phone', 'is', null);

        if (suppliersError) {
          console.error('Error fetching suppliers:', suppliersError);
        }

        const suppliersList = suppliers?.filter(s => s.phone) || [];

        // Send SMS to each supplier
        console.log(`📱 Sending SMS to ${suppliersList.length} suppliers`);
        const smsPromises = suppliersList.map(async (supplier) => {
          try {
            console.log(`Sending to ${supplier.name} at ${supplier.phone}`);
            const { data: result, error } = await supabase.functions.invoke('send-sms', {
              body: {
                phone: supplier.phone,
                requestId: (savedUpdate as any)?.id,
                priceSource: 'market_update',
                messageType: 'price_update',
              }
            });
            if (error || result?.success !== true) {
              notAccepted++;
              console.error(`❌ Failed to send SMS to ${supplier.name}:`, result);
            } else {
              accepted++;
              console.log(`✅ SMS sent to ${supplier.name}`);
            }
          } catch (error) {
            notAccepted++;
            console.error(`❌ Error sending SMS to ${supplier.name}:`, error);
          }
        });

        await Promise.allSettled(smsPromises);
      }

      toast({
        title: "Success",
        description: formData.sendNotification 
          ? `Price updated. ${accepted} supplier texts accepted; ${notAccepted} not accepted.`
          : "Price updated successfully"
      });

      // Reset form and close modal
      setFormData({
        outturn: "",
        moisture: "",
        fm: "",
        price: "",
        sendNotification: false
      });
      onOpenChange(false);

    } catch (error) {
      console.error("Error updating prices:", error);
      toast({
        title: "Error",
        description: "Failed to update prices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Market Prices</DialogTitle>
          <DialogDescription>
            Set today's buying parameters for Arabica coffee
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outturn">Outturn (%)</Label>
            <Input
              id="outturn"
              type="number"
              step="0.01"
              placeholder="e.g., 70"
              value={formData.outturn}
              onChange={(e) => setFormData({ ...formData, outturn: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="moisture">Moisture (%)</Label>
            <Input
              id="moisture"
              type="number"
              step="0.01"
              placeholder="e.g., 12.5"
              value={formData.moisture}
              onChange={(e) => setFormData({ ...formData, moisture: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fm">FM (%)</Label>
            <Input
              id="fm"
              type="number"
              step="0.01"
              placeholder="e.g., 5"
              value={formData.fm}
              onChange={(e) => setFormData({ ...formData, fm: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (UGX/kg)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="e.g., 8500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendNotification"
              checked={formData.sendNotification}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, sendNotification: checked as boolean })
              }
              disabled={loading}
            />
            <Label 
              htmlFor="sendNotification" 
              className="text-sm font-normal cursor-pointer"
            >
              Send SMS notifications to all suppliers
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Prices
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
