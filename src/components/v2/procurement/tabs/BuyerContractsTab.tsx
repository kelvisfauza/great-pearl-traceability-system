import { useState } from "react";
import { useBuyerContracts } from "@/hooks/useBuyerContracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileText, Package, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const BuyerContractsTab = () => {
  const { contracts, loading, getRemainingQuantity } = useBuyerContracts();
  const [search, setSearch] = useState("");

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const filtered = contracts.filter(c =>
    c.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contract_ref.toLowerCase().includes(search.toLowerCase()) ||
    c.quality.toLowerCase().includes(search.toLowerCase())
  );

  const active = contracts.filter(c => c.status === 'active');
  const completed = contracts.filter(c => c.status === 'completed');
  const abandoned = contracts.filter(c => c.status === 'abandoned' || c.status === 'cancelled');
  const totalVolume = active.reduce((s, c) => s + c.total_quantity, 0);
  const allocatedVolume = active.reduce((s, c) => s + c.allocated_quantity, 0);
  const remainingVolume = totalVolume - allocatedVolume;
  const totalValue = active.reduce((s, c) => s + (c.total_quantity * c.price_per_kg), 0);

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" /> Sales Contracts (Contracts From Buyers)
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Contracts</p>
          <p className="text-2xl font-bold">{contracts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Contracted Volume</p>
          <p className="text-2xl font-bold">{(totalVolume / 1000).toFixed(1)}t</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-2xl font-bold text-amber-600">{(remainingVolume / 1000).toFixed(1)}t</p>
          <p className="text-xs text-muted-foreground">{totalVolume > 0 ? ((allocatedVolume / totalVolume) * 100).toFixed(0) : 0}% fulfilled</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Contract Value</p>
          <p className="text-2xl font-bold">UGX {(totalValue / 1000000).toFixed(1)}M</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by buyer, ref, or quality..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">All Buyer Contracts ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Price/Kg</TableHead>
              <TableHead>Delivery Period</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => {
                const remaining = getRemainingQuantity(c);
                const fulfillPct = c.total_quantity > 0 ? ((c.allocated_quantity / c.total_quantity) * 100) : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.contract_ref}</TableCell>
                    <TableCell className="font-medium">{c.buyer_name}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{c.quality}</TableCell>
                    <TableCell>{c.total_quantity.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {c.allocated_quantity.toLocaleString()} kg
                        <span className="text-xs text-muted-foreground">({fulfillPct.toFixed(0)}%)</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">{remaining.toLocaleString()} kg</TableCell>
                    <TableCell>UGX {c.price_per_kg.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">
                      {c.delivery_period_start && c.delivery_period_end
                        ? `${format(new Date(c.delivery_period_start), 'dd MMM')} - ${format(new Date(c.delivery_period_end), 'dd MMM yy')}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        c.status === 'active' ? 'default' :
                        c.status === 'completed' ? 'secondary' :
                        c.status === 'abandoned' || c.status === 'cancelled' ? 'destructive' : 'outline'
                      }>{c.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No buyer contracts found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Completed & Abandoned summary */}
      {(completed.length > 0 || abandoned.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completed.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Completed ({completed.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {completed.slice(0, 5).map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.contract_ref}</TableCell>
                        <TableCell>{c.buyer_name}</TableCell>
                        <TableCell>{c.total_quantity.toLocaleString()} kg</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {abandoned.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-red-500" />Abandoned/Cancelled ({abandoned.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {abandoned.slice(0, 5).map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.contract_ref}</TableCell>
                        <TableCell>{c.buyer_name}</TableCell>
                        <TableCell className="text-xs">{c.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default BuyerContractsTab;
