import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVendorAccounts } from '@/hooks/useVendorAccounts';

export default function VendorAccountSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: vendors = [], isLoading, error } = useVendorAccounts();
  return <div className="space-y-2">
    <Label>Vendor account</Label>
    <Select value={value || 'unlinked'} onValueChange={id => onChange(id === 'unlinked' ? '' : id)} disabled={isLoading || Boolean(error)}>
      <SelectTrigger aria-label="Vendor account"><SelectValue placeholder="Choose vendor account" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="unlinked">Not attached</SelectItem>
        {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name} · {v.vendor_number}</SelectItem>)}
      </SelectContent>
    </Select>
    {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
  </div>;
}