import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trash2, Package, TrendingUp, CalendarDays, DollarSign } from "lucide-react";
import { format } from "date-fns";
import type { BuyerContract } from "@/hooks/useBuyerContracts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: BuyerContract;
  onChanged: () => void;
}

const ContractDetailDialog = ({ open, onOpenChange, contract, onChanged }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allocations, isLoading } = useQuery({
    queryKey: ["contract-allocations", contract.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contract_allocations")
        .select("id, allocated_kg, allocated_by, notes, created_at, sale_id")
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) return [];

      // Fetch corresponding sale details
      const saleIds = data.map((a: any) => a.sale_id);
      const { data: salesData } = await supabase
        .from("sales_transactions")
        .select("id, date, customer, coffee_type, weight, unit_price")
        .in("id", saleIds);

      const salesMap: Record<string, any> = {};
      (salesData || []).forEach((s: any) => { salesMap[s.id] = s; });

      return data.map((a: any) => ({
        ...a,
        sale: salesMap[a.sale_id] || null,
      }));
    },
    enabled: open,
  });

  const removeMutation = useMutation({
    mutationFn: async (alloc: any) => {
      const { error: delErr } = await supabase
        .from("contract_allocations")
        .delete()
        .eq("id", alloc.id);
      if (delErr) throw delErr;

      const newAllocated = Math.max(0, contract.allocated_quantity - alloc.allocated_kg);
      const { error: updateErr } = await supabase
        .from("buyer_contracts")
        .update({ allocated_quantity: newAllocated })
        .eq("id", contract.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      toast({ title: "Removed", description: "Allocation removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["contract-allocations", contract.id] });
      onChanged();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const fulfillPct = contract.total_quantity > 0 ? (contract.allocated_quantity / contract.total_quantity) * 100 : 0;
  const remaining = contract.total_quantity - contract.allocated_quantity;
  const totalValue = contract.total_quantity * contract.price_per_kg;
  const allocatedValue = contract.allocated_quantity * contract.price_per_kg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract.contract_ref} — Contract Details</DialogTitle>
          <DialogDescription>{contract.buyer_name} • {contract.quality}</DialogDescription>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Volume</span>
              </div>
              <p className="text-lg font-bold">{contract.total_quantity.toLocaleString()} kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-muted-foreground">Allocated</span>
              </div>
              <p className="text-lg font-bold text-green-600">{contract.allocated_quantity.toLocaleString()} kg</p>
              <p className="text-xs text-muted-foreground">{remaining.toLocaleString()} kg remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Contract Value</span>
              </div>
              <p className="text-lg font-bold">UGX {(totalValue / 1e6).toFixed(1)}M</p>
              <p className="text-xs text-muted-foreground">{(allocatedValue / 1e6).toFixed(1)}M allocated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Delivery Period</span>
              </div>
              <p className="text-sm font-medium">
                {contract.delivery_period_start
                  ? format(new Date(contract.delivery_period_start), "dd MMM")
                  : "—"}{" "}
                –{" "}
                {contract.delivery_period_end
                  ? format(new Date(contract.delivery_period_end), "dd MMM yy")
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Fulfillment Progress</span>
            <span className="font-medium">{fulfillPct.toFixed(1)}%</span>
          </div>
          <Progress value={fulfillPct} className="h-3" />
        </div>

        {/* Allocation history */}
        <div>
          <h4 className="font-semibold mb-2">Allocation History ({allocations?.length || 0})</h4>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : allocations && allocations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sale Customer</TableHead>
                  <TableHead>Coffee Type</TableHead>
                  <TableHead>Sale Weight</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">
                      {format(new Date(a.created_at), "dd MMM yy, HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{a.sale?.customer || "—"}</TableCell>
                    <TableCell className="text-xs">{a.sale?.coffee_type || "—"}</TableCell>
                    <TableCell className="text-sm">{a.sale?.weight?.toLocaleString() || "—"} kg</TableCell>
                    <TableCell className="font-bold text-sm">{a.allocated_kg.toLocaleString()} kg</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.allocated_by}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Remove this allocation? The kg will be returned to the contract.")) {
                            removeMutation.mutate(a);
                          }
                        }}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No sales allocated to this contract yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDetailDialog;
