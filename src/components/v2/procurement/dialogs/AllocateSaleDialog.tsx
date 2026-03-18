import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import type { BuyerContract } from "@/hooks/useBuyerContracts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: BuyerContract;
  onAllocated: () => void;
}

interface SaleRow {
  id: string;
  date: string;
  customer: string;
  coffee_type: string;
  weight: number;
  unit_price: number;
  total_amount: number;
  status: string;
  already_allocated: number;
}

const AllocateSaleDialog = ({ open, onOpenChange, contract, onAllocated }: Props) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});

  const remaining = contract.total_quantity - contract.allocated_quantity;

  // Fetch sales with their existing allocations
  const { data: sales, isLoading } = useQuery({
    queryKey: ["allocatable-sales", contract.id],
    queryFn: async () => {
      const [salesRes, allocRes] = await Promise.all([
        supabase
          .from("sales_transactions")
          .select("*")
          .order("date", { ascending: false })
          .limit(200),
        supabase
          .from("contract_allocations")
          .select("sale_id, allocated_kg"),
      ]);

      // Sum already-allocated kg per sale across ALL contracts
      const allocBySale: Record<string, number> = {};
      (allocRes.data || []).forEach((a: any) => {
        allocBySale[a.sale_id] = (allocBySale[a.sale_id] || 0) + a.allocated_kg;
      });

      return (salesRes.data || []).map((s: any) => ({
        ...s,
        already_allocated: allocBySale[s.id] || 0,
      })) as SaleRow[];
    },
    enabled: open,
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(selected).filter(([, kg]) => kg > 0);
      if (entries.length === 0) throw new Error("No sales selected");

      const totalKg = entries.reduce((s, [, kg]) => s + kg, 0);
      if (totalKg > remaining) throw new Error(`Total ${totalKg} kg exceeds remaining ${remaining} kg on contract`);

      // Insert allocations
      const rows = entries.map(([saleId, kg]) => ({
        contract_id: contract.id,
        sale_id: saleId,
        allocated_kg: kg,
        allocated_by: employee?.name || "Unknown",
      }));

      const { error: insertErr } = await supabase.from("contract_allocations").insert(rows);
      if (insertErr) throw insertErr;

      // Update contract allocated_quantity
      const { error: updateErr } = await supabase
        .from("buyer_contracts")
        .update({ allocated_quantity: contract.allocated_quantity + totalKg })
        .eq("id", contract.id);
      if (updateErr) throw updateErr;

      return totalKg;
    },
    onSuccess: (totalKg) => {
      toast({ title: "Allocated", description: `${totalKg.toLocaleString()} kg allocated to ${contract.contract_ref}` });
      queryClient.invalidateQueries({ queryKey: ["allocatable-sales"] });
      queryClient.invalidateQueries({ queryKey: ["contract-allocations"] });
      setSelected({});
      onAllocated();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (sales || []).filter(
    (s) =>
      s.customer?.toLowerCase().includes(search.toLowerCase()) ||
      s.coffee_type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSelected = Object.values(selected).reduce((s, v) => s + (v || 0), 0);

  const toggleSale = (sale: SaleRow) => {
    if (selected[sale.id] !== undefined) {
      const next = { ...selected };
      delete next[sale.id];
      setSelected(next);
    } else {
      const availableOnSale = sale.weight - sale.already_allocated;
      setSelected({ ...selected, [sale.id]: Math.min(availableOnSale, remaining - totalSelected) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate Sales to {contract.contract_ref}</DialogTitle>
          <DialogDescription>
            {contract.buyer_name} • Remaining: <strong>{remaining.toLocaleString()} kg</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by customer or type..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Allocate (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sale) => {
                const available = sale.weight - sale.already_allocated;
                const isSelected = selected[sale.id] !== undefined;
                return (
                  <TableRow key={sale.id} className={isSelected ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        disabled={available <= 0 && !isSelected}
                        onCheckedChange={() => toggleSale(sale)}
                      />
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(sale.date), "dd MMM yy")}</TableCell>
                    <TableCell className="text-sm font-medium">{sale.customer}</TableCell>
                    <TableCell className="text-xs">{sale.coffee_type}</TableCell>
                    <TableCell>{sale.weight.toLocaleString()} kg</TableCell>
                    <TableCell>
                      {available > 0 ? (
                        <span className="text-green-600 font-medium">{available.toLocaleString()} kg</span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Fully allocated</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSelected && (
                        <Input
                          type="number"
                          min={1}
                          max={available}
                          value={selected[sale.id] || ""}
                          onChange={(e) =>
                            setSelected({ ...selected, [sale.id]: Math.min(Number(e.target.value) || 0, available) })
                          }
                          className="w-24 h-8"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No sales found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <DialogFooter className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Selected: <strong>{totalSelected.toLocaleString()} kg</strong> / {remaining.toLocaleString()} kg remaining
            {totalSelected > remaining && <span className="text-destructive ml-2">⚠ Exceeds remaining</span>}
          </div>
          <Button
            onClick={() => allocateMutation.mutate()}
            disabled={totalSelected <= 0 || totalSelected > remaining || allocateMutation.isPending}
          >
            {allocateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Allocate {totalSelected.toLocaleString()} kg
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllocateSaleDialog;
