import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreDeliveryIntake } from '@/hooks/useStoreDeliveryIntake';

export default function DeliverySamplingFields({ intake, disabled }: {
  intake: ReturnType<typeof useStoreDeliveryIntake>; disabled?: boolean;
}) {
  return <div className="space-y-4 border-t pt-4">
    <div className="space-y-2">
      <Label>Was a sample taken? *</Label>
      <RadioGroup aria-label="Was a sample taken?" value={intake.sampleAnswer} onValueChange={intake.setSampleAnswer} disabled={disabled} className="flex gap-6">
        <div className="flex items-center gap-2"><RadioGroupItem id="delivery-sample-yes" value="yes" /><Label htmlFor="delivery-sample-yes">Yes</Label></div>
        <div className="flex items-center gap-2"><RadioGroupItem id="delivery-sample-no" value="no" /><Label htmlFor="delivery-sample-no">No</Label></div>
      </RadioGroup>
    </div>
    {intake.sampleAnswer === 'yes' && <div className="space-y-2">
      <Label htmlFor="delivery-sampling-order">Sampling order *</Label>
      <Select value={intake.orderId} onValueChange={intake.setOrderId} disabled={disabled || intake.ordersLoading}>
        <SelectTrigger id="delivery-sampling-order"><SelectValue placeholder="Select supplier sampling order" /></SelectTrigger>
        <SelectContent>{intake.orders.map(order => <SelectItem key={order.id} value={order.id}>
          {order.order_number || order.id} · {new Date(order.delivery_time).toLocaleDateString()} · {order.sample_type.replace(/_/g, ' ')}
        </SelectItem>)}</SelectContent>
      </Select>
      {intake.ordersLoading && <p className="text-sm text-muted-foreground">Loading sampling orders…</p>}
      {intake.ordersError && <p role="alert" className="text-sm text-destructive">Unable to load sampling orders. Reopen the form to retry.</p>}
      {!intake.ordersLoading && !intake.ordersError && intake.orders.length === 0 && <p role="alert" className="text-sm text-destructive">No unattached sampling orders for this supplier.</p>}
    </div>}
    <div className="space-y-2"><Label htmlFor="delivery-batch-number">Delivery batch number</Label>
      <Input id="delivery-batch-number" readOnly value={intake.batchNumber} placeholder="Assigning batch…" className="font-mono" />
      {intake.batchError && <p role="alert" className="text-sm text-destructive">{intake.batchError}</p>}
    </div>
  </div>;
}