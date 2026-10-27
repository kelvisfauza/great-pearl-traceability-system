import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { usePendingSuppliers } from '@/hooks/usePendingSuppliers';
import { useSuppliers } from '@/hooks/useSuppliers';
import { canReviewRequest, requestStatusLabel } from '@/lib/pendingSupplierRules';

export default function PendingSupplierRequests() {
  const { toast } = useToast();
  const { requests, confirm, decline } = usePendingSuppliers();
  const { suppliers } = useSuppliers();
  const [declining, setDeclining] = useState<any | null>(null);
  const [realSupplierId, setRealSupplierId] = useState('');

  const rows = requests.data || [];
  const pendingCount = rows.filter(r => r.status === 'pending').length;

  const handleConfirm = (row: any) => {
    confirm.mutate(row.id, {
      onSuccess: () => toast({ title: 'Supplier confirmed', description: `"${row.proposed_name}" is now a permanent supplier.` }),
      onError: (e: any) => toast({ title: 'Could not confirm', description: e.message, variant: 'destructive' }),
    });
  };

  const handleDecline = () => {
    if (!declining) return;
    decline.mutate({ requestId: declining.id, realSupplierId }, {
      onSuccess: () => {
        toast({ title: 'Request declined', description: 'The coffee was attached to the supplier you chose.' });
        setDeclining(null);
        setRealSupplierId('');
      },
      onError: (e: any) => toast({ title: 'Could not decline', description: e.message, variant: 'destructive' }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Supplier Requests from Store</CardTitle>
            <CardDescription>Suppliers added by store managers. Confirm to save them permanently, or decline and attach the coffee to the real supplier.</CardDescription>
          </div>
          <Badge variant="outline">{pendingCount} pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {requests.isError ? (
          <p role="alert" className="text-destructive">Could not load supplier requests.</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No supplier requests yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposed supplier</TableHead>
                  <TableHead>Origin / Phone</TableHead>
                  <TableHead>Attached coffee</TableHead>
                  <TableHead>Proposed by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.proposed_name}</TableCell>
                    <TableCell>{row.origin}{row.phone ? <div className="text-xs text-muted-foreground">{row.phone}</div> : null}</TableCell>
                    <TableCell className="text-xs">{row.delivery_label || (row.coffee_record_id ? 'Linked delivery' : '—')}</TableCell>
                    <TableCell className="text-xs">{row.proposed_by_name || row.proposed_by}<div className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div></TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'pending' ? 'outline' : row.status === 'confirmed' ? 'default' : 'destructive'}>{requestStatusLabel(row.status)}</Badge>
                      {row.reviewed_by && <div className="text-xs text-muted-foreground">{row.reviewed_by}</div>}
                    </TableCell>
                    <TableCell>
                      {canReviewRequest(row.status) && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleConfirm(row)} disabled={confirm.isPending}>Confirm</Button>
                          <Button size="sm" variant="outline" onClick={() => { setDeclining(row); setRealSupplierId(''); }} disabled={decline.isPending}>Decline</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!declining} onOpenChange={v => { if (!v && !decline.isPending) setDeclining(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline supplier request</DialogTitle>
            <DialogDescription>
              "{declining?.proposed_name}" will not be saved. Choose the real supplier to attach to this coffee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Real supplier</Label>
            <Select value={realSupplierId} onValueChange={setRealSupplierId} disabled={decline.isPending}>
              <SelectTrigger><SelectValue placeholder="Select the real supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · {s.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)} disabled={decline.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDecline} disabled={decline.isPending || !realSupplierId}>
              {decline.isPending ? 'Declining…' : 'Decline and attach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
