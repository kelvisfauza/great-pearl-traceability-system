import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users, Search, Phone, MapPin, Landmark, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const SupplierRecordsTab = () => {
  const [search, setSearch] = useState("");
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_name: '', account_number: '' });
  const [deleteSupplier, setDeleteSupplier] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const canDelete = isAdmin();

  const openDelete = async (supplier: any) => {
    setDeleteSupplier(supplier);
    setBlockers([]);
    setChecking(true);
    try {
      const [deliveries, advances, lots] = await Promise.all([
        supabase.from('coffee_records').select('id', { count: 'exact', head: true }).eq('supplier_id', supplier.id),
        supabase.from('supplier_advances').select('id', { count: 'exact', head: true }).eq('supplier_id', supplier.id),
        supabase.from('finance_coffee_lots').select('id', { count: 'exact', head: true })
          .eq('supplier_id', supplier.id).not('finance_status', 'in', '(PAID,POSTED)'),
      ]);
      const found: string[] = [];
      if ((deliveries.count || 0) > 0) found.push(`${deliveries.count} delivery record(s) on file`);
      if ((advances.count || 0) > 0) found.push(`${advances.count} advance record(s) on file`);
      if ((lots.count || 0) > 0) found.push(`${lots.count} payment(s) still pending`);
      setBlockers(found);
    } catch (error: any) {
      setBlockers(['Could not verify supplier history — deletion blocked for safety']);
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSupplier || blockers.length > 0) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', deleteSupplier.id);
      if (error) throw error;
      toast({ title: "Supplier deleted", description: `${deleteSupplier.name} has been removed` });
      setDeleteSupplier(null);
      queryClient.invalidateQueries({ queryKey: ['procurement-suppliers'] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete supplier", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['procurement-suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const handleEditBank = (supplier: any) => {
    setEditSupplier(supplier);
    setBankForm({
      bank_name: supplier.bank_name || '',
      account_name: supplier.account_name || '',
      account_number: supplier.account_number || '',
    });
  };

  const handleSaveBank = async () => {
    if (!editSupplier) return;
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          bank_name: bankForm.bank_name || null,
          account_name: bankForm.account_name || null,
          account_number: bankForm.account_number || null,
        })
        .eq('id', editSupplier.id);

      if (error) throw error;
      toast({ title: "Success", description: "Bank details updated" });
      setEditSupplier(null);
      queryClient.invalidateQueries({ queryKey: ['procurement-suppliers'] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const filtered = suppliers?.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  ) || [];

  const withBankDetails = suppliers?.filter((s: any) => s.bank_name && s.account_number).length || 0;
  const missingBank = (suppliers?.length || 0) - withBankDetails;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />Supplier Records & Bank Details
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Suppliers</p>
          <p className="text-2xl font-bold">{suppliers?.length || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Bank Info Complete</p>
          <p className="text-2xl font-bold text-blue-600">{withBankDetails}</p>
        </CardContent></Card>
        <Card className={missingBank > 0 ? 'border-red-200' : ''}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Missing Bank Info</p>
            <p className="text-2xl font-bold text-red-600">{missingBank}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, code, or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader><CardTitle>Supplier Directory ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Bank Name</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.code || '—'}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    {s.phone ? <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{s.phone}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs">{s.email || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{s.origin || '—'}</TableCell>
                  <TableCell className="text-xs">{s.bank_name || <span className="text-red-500">Missing</span>}</TableCell>
                  <TableCell className="text-xs font-mono">{s.account_number || <span className="text-red-500">Missing</span>}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditBank(s)}>
                        <Landmark className="h-3.5 w-3.5 mr-1" />Bank
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => openDelete(s)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No suppliers found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Bank Details Dialog */}
      <Dialog open={!!editSupplier} onOpenChange={() => setEditSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Details — {editSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bank Name</Label>
              <Input value={bankForm.bank_name} onChange={e => setBankForm(prev => ({ ...prev, bank_name: e.target.value }))} placeholder="e.g., Stanbic Bank" />
            </div>
            <div>
              <Label>Account Name</Label>
              <Input value={bankForm.account_name} onChange={e => setBankForm(prev => ({ ...prev, account_name: e.target.value }))} placeholder="Account holder name" />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input value={bankForm.account_number} onChange={e => setBankForm(prev => ({ ...prev, account_number: e.target.value }))} placeholder="Account number" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditSupplier(null)}>Cancel</Button>
              <Button onClick={handleSaveBank}>Save Bank Details</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Dialog */}
      <Dialog open={!!deleteSupplier} onOpenChange={() => { if (!deleting) setDeleteSupplier(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />Delete Supplier — {deleteSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {checking ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Checking supplier history...
              </div>
            ) : blockers.length > 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />This supplier cannot be deleted
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No deliveries, advances or pending payments found. This supplier can be permanently removed. This cannot be undone.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteSupplier(null)} disabled={deleting}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={checking || deleting || blockers.length > 0}
              >
                {deleting ? 'Deleting...' : 'Delete Supplier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierRecordsTab;
