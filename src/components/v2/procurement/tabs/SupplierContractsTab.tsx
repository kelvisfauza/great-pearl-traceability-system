import { useState } from "react";
import { useSupplierContracts } from "@/hooks/useSupplierContracts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, FileText, Plus, Pencil, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useDeletionRequest } from "@/hooks/useDeletionRequest";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SupplierContractFormDialog from "../dialogs/SupplierContractFormDialog";
import SupplierContractDetailDialog from "../dialogs/SupplierContractDetailDialog";
import type { SupplierContract } from "@/hooks/useSupplierContracts";

const SupplierContractsTab = () => {
  const { contracts, loading, createContract, fetchContracts } = useSupplierContracts();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<SupplierContract | null>(null);
  const [detailContract, setDetailContract] = useState<SupplierContract | null>(null);
  const { toast } = useToast();
  const { submitDeletionRequest, isSubmitting: isDeleting } = useDeletionRequest();
  const { canSeeDeleteButton } = useRolePermissions();
  const [deleteTarget, setDeleteTarget] = useState<SupplierContract | null>(null);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const filtered = contracts.filter(c =>
    c.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    c.contractType.toLowerCase().includes(search.toLowerCase())
  );

  const active = contracts.filter(c => c.status === 'Active');
  const voided = contracts.filter(c => c.status === 'Voided' || c.status === 'Terminated');
  const expired = contracts.filter(c => c.status === 'Expired');
  const completed = contracts.filter(c => c.status === 'Completed');
  const totalExpectedKg = active.reduce((s, c) => s + c.kilogramsExpected, 0);
  const totalDeliveredKg = active.reduce((s, c) => s + c.deliveredQuantity, 0);
  const totalAdvances = active.reduce((s, c) => s + c.advanceGiven, 0);

  const handleCreate = async (data: any) => {
    await createContract(data);
  };

  const handleEdit = async (data: any) => {
    if (!editingContract) return;
    try {
      const { error } = await supabase
        .from('supplier_contracts')
        .update({
          supplier_name: data.supplierName,
          supplier_id: data.supplierId,
          contract_type: data.contractType,
          date: data.date,
          kilograms_expected: data.kilogramsExpected,
          price_per_kg: data.pricePerKg,
          advance_given: data.advanceGiven,
          status: data.status,
        })
        .eq('id', editingContract.id);

      if (error) throw error;
      toast({ title: "Success", description: "Supplier contract updated" });
      await fetchContracts();
      setEditingContract(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" });
      throw err;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Completed': return 'secondary';
      case 'Expired': return 'outline';
      case 'Voided': case 'Terminated': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" /> Supplier Contracts (Contracts We Give to Suppliers)
        </h3>
        <Button onClick={() => { setEditingContract(null); setFormOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Supplier Contract
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Contracts</p>
          <p className="text-2xl font-bold">{contracts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
          {completed.length > 0 && <p className="text-xs text-muted-foreground">{completed.length} completed</p>}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Expected Volume</p>
          <p className="text-2xl font-bold">{(totalExpectedKg / 1000).toFixed(1)}t</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{(totalDeliveredKg / 1000).toFixed(1)}t</p>
          <p className="text-xs text-muted-foreground">
            {totalExpectedKg > 0 ? ((totalDeliveredKg / totalExpectedKg) * 100).toFixed(0) : 0}% fulfilled
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Advances</p>
          <p className="text-2xl font-bold">UGX {totalAdvances.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by supplier or contract type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Supplier Contracts ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Price/Kg</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => {
                const remaining = Math.max(0, c.kilogramsExpected - c.deliveredQuantity);
                const fulfillPct = c.kilogramsExpected > 0 ? (c.deliveredQuantity / c.kilogramsExpected) * 100 : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.supplierName}</TableCell>
                    <TableCell className="text-xs">{c.contractType}</TableCell>
                    <TableCell className="text-xs">{c.date ? format(new Date(c.date), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>{c.kilogramsExpected.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="text-sm">{c.deliveredQuantity.toLocaleString()} kg</span>
                        <Progress value={Math.min(fulfillPct, 100)} className="h-1.5 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-amber-600">{remaining.toLocaleString()} kg</TableCell>
                    <TableCell>UGX {c.pricePerKg.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(c.status) as any}
                        className={c.status === 'Expired' ? 'border-amber-500 text-amber-600' : ''}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="View details & deliveries"
                          onClick={() => setDetailContract(c)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingContract(c); setFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {checkAdminPermission() && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No supplier contracts found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {voided.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader><CardTitle className="text-sm text-destructive">Voided/Terminated Contracts ({voided.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Voided By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {voided.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.supplierName}</TableCell>
                    <TableCell>{c.contractType}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{c.void_reason || '—'}</TableCell>
                    <TableCell className="text-xs">{c.voided_by || '—'}</TableCell>
                    <TableCell className="text-xs">{c.voided_at ? format(new Date(c.voided_at), 'dd MMM yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SupplierContractFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contract={editingContract}
        onSubmit={editingContract ? handleEdit : handleCreate}
      />

      {detailContract && (
        <SupplierContractDetailDialog
          open={!!detailContract}
          onOpenChange={(v) => !v && setDetailContract(null)}
          contract={detailContract}
          onChanged={() => { fetchContracts(); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the contract for <strong>{deleteTarget?.supplierName}</strong> ({deleteTarget?.contractType})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                const success = await submitDeletionRequest(
                  'supplier_contracts',
                  deleteTarget.id,
                  deleteTarget,
                  'Admin deletion',
                  `Supplier Contract - ${deleteTarget.supplierName} (${deleteTarget.contractType})`
                );
                if (success) {
                  setDeleteTarget(null);
                  fetchContracts();
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupplierContractsTab;
