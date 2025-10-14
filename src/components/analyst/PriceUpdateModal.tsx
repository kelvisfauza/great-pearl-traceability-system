import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
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
      // Save market update
      const marketUpdate = {
        date: new Date().toISOString().split('T')[0],
        outturn: parseFloat(formData.outturn),
        moisture: parseFloat(formData.moisture),
        fm: parseFloat(formData.fm),
        price: parseFloat(formData.price),
        timestamp: new Date(),
        updatedBy: "Data Analyst"
      };

      await addDoc(collection(db, "market_updates"), marketUpdate);

      // Send SMS notifications if checked
      if (formData.sendNotification) {
        const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
        const suppliers = suppliersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((s: any) => s.phone);

        const date = new Date().toLocaleDateString('en-GB');
        const message = `Great Pearl Coffee updates, today ${date} price, Arabica outturn ${formData.outturn}%, moisture ${formData.moisture}%, FM ${formData.fm}%, price UGX ${parseFloat(formData.price).toLocaleString()}/kg. Deliver now to get served best.`;

        // Send SMS to each supplier
        console.log(`📱 Sending SMS to ${suppliers.length} suppliers`);
        const smsPromises = suppliers.map(async (supplier: any) => {
          try {
            console.log(`Sending to ${supplier.name} at ${supplier.phone}`);
            const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'
              },
              body: JSON.stringify({
                phone: supplier.phone,
                message: message,
                userName: supplier.name,
                messageType: 'price_update',
                triggeredBy: 'Data Analyst',
                department: 'Analyst'
              })
            });

            const result = await response.json();
            if (!response.ok) {
              console.error(`❌ Failed to send SMS to ${supplier.name}:`, result);
            } else {
              console.log(`✅ SMS sent to ${supplier.name}`);
            }
          } catch (error) {
            console.error(`❌ Error sending SMS to ${supplier.name}:`, error);
          }
        });

        await Promise.allSettled(smsPromises);
      }

      toast({
        title: "Success",
        description: formData.sendNotification 
          ? "Price updated and notifications sent to suppliers"
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
