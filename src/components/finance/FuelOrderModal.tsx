import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel, Printer, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { buildFuelOrderNumber, openFuelOrderPdf, type FuelOrderPayload } from '@/utils/fuelOrderPdf';

interface Props {
  open: boolean;
  onClose: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export const FuelOrderModal: React.FC<Props> = ({ open, onClose }) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<FuelOrderPayload>({
    orderNumber: buildFuelOrderNumber(),
    reference: '',
    date: todayISO(),
    serviceProvider: '',
    providerAddress: '',
    truckNumber: '',
    driverName: '',
    driverPhone: '',
    fuelType: 'Diesel',
    requestedVolume: '',
    fullTank: false,
    destination: '',
    purpose: '',
    requestedBy: employee?.name || '',
    requestedByTitle: employee?.position || employee?.department || '',
    authorisedBy: '',
    authorisedByTitle: '',
    notes: '',
  });

  const update = <K extends keyof FuelOrderPayload>(k: K, v: FuelOrderPayload[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handlePrint = async () => {
    if (!form.serviceProvider.trim() || !form.truckNumber.trim() || !form.driverName.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Service provider, truck number and driver name are required.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.fullTank && !form.requestedVolume?.trim()) {
      toast({
        title: 'Volume required',
        description: 'Specify a volume or tick "Full Tank".',
        variant: 'destructive',
      });
      return;
    }
    if (!form.authorisedBy.trim()) {
      toast({
        title: 'Authoriser required',
        description: 'Enter the name of the authorising officer.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setBusy(true);
      await openFuelOrderPdf(form);
      toast({ title: 'Fuel order generated', description: form.orderNumber });
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to generate PDF', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            New Fuel / Service Order
          </DialogTitle>
          <DialogDescription>
            Generate an A4 printable order for a service provider (e.g. petrol station) to fuel a company vehicle.
            The provider fills in litres, unit price and the total amount owed on the printed copy.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Order No.</Label>
              <Input value={form.orderNumber} onChange={e => update('orderNumber', e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => update('date', e.target.value)} />
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input placeholder="LPO / Trip ref" value={form.reference} onChange={e => update('reference', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Service Provider *</Label>
              <Input placeholder="e.g. Shell Kasese" value={form.serviceProvider} onChange={e => update('serviceProvider', e.target.value)} />
            </div>
            <div>
              <Label>Provider Address</Label>
              <Input placeholder="Town / Branch" value={form.providerAddress} onChange={e => update('providerAddress', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Truck / Vehicle No. *</Label>
              <Input placeholder="UAX 123A" value={form.truckNumber} onChange={e => update('truckNumber', e.target.value)} />
            </div>
            <div>
              <Label>Driver Name *</Label>
              <Input value={form.driverName} onChange={e => update('driverName', e.target.value)} />
            </div>
            <div>
              <Label>Driver Phone</Label>
              <Input value={form.driverPhone} onChange={e => update('driverPhone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Fuel Type</Label>
              <Select value={form.fuelType} onValueChange={(v) => update('fuelType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Volume Requested</Label>
              <Input
                placeholder="e.g. 200 Litres"
                value={form.requestedVolume}
                disabled={form.fullTank}
                onChange={e => update('requestedVolume', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="full-tank"
                checked={form.fullTank}
                onCheckedChange={(v) => update('fullTank', !!v)}
              />
              <Label htmlFor="full-tank" className="cursor-pointer">Full Tank</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Destination / Route</Label>
              <Input placeholder="e.g. Kasese → Kampala" value={form.destination} onChange={e => update('destination', e.target.value)} />
            </div>
            <div>
              <Label>Purpose</Label>
              <Input placeholder="e.g. Coffee delivery trip" value={form.purpose} onChange={e => update('purpose', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Requested By</Label>
              <Input value={form.requestedBy} onChange={e => update('requestedBy', e.target.value)} />
              <Input className="mt-2" placeholder="Title / Department" value={form.requestedByTitle} onChange={e => update('requestedByTitle', e.target.value)} />
            </div>
            <div>
              <Label>Authorised By *</Label>
              <Input value={form.authorisedBy} onChange={e => update('authorisedBy', e.target.value)} />
              <Input className="mt-2" placeholder="Title" value={form.authorisedByTitle} onChange={e => update('authorisedByTitle', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Any special instructions for the service provider"
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handlePrint} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Generate & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FuelOrderModal;