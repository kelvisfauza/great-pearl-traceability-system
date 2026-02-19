import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUp, ArrowDown, ArrowLeftRight, AlertCircle, Printer, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { getStandardPrintFooter } from "@/components/print/PrintFooter";

const MovementsLog = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("");

  const { data: movements, isLoading } = useQuery({
    queryKey: ['v2-inventory-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data;
    }
  });

  const filteredMovements = movements?.filter((m) => {
    if (typeFilter !== "all" && m.movement_type !== typeFilter) return false;
    if (createdByFilter && !m.created_by?.toLowerCase().includes(createdByFilter.toLowerCase())) return false;
    if (dateFrom && new Date(m.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(m.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
    setCreatedByFilter("");
  };

  const hasFilters = dateFrom || dateTo || typeFilter !== "all" || createdByFilter;

  const handlePrint = () => {
    const rows = filteredMovements || [];
    const totalQty = rows.reduce((s, m) => s + Number(m.quantity_kg), 0);

    const filterDesc = [
      dateFrom && `From: ${dateFrom}`,
      dateTo && `To: ${dateTo}`,
      typeFilter !== "all" && `Type: ${typeFilter}`,
      createdByFilter && `Created by: ${createdByFilter}`,
    ].filter(Boolean).join(" | ") || "All records";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Inventory Movement Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin: 4px 0; }
        .header p { font-size: 12px; color: #666; margin: 2px 0; }
        .filter-info { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; font-size: 11px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #0d3d1f; color: white; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #fafafa; }
        .text-right { text-align: right; }
        .summary { margin-top: 16px; padding: 10px; background: #f0f0f0; border-radius: 4px; font-size: 12px; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      <div class="header">
        <h1>GREAT PEARL COFFEE FACTORY</h1>
        <p>Inventory Movement Report</p>
        <p>Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}</p>
      </div>
      <div class="filter-info">Filters: ${filterDesc}</div>
      <table>
        <thead><tr>
          <th>Date</th><th>Type</th><th>Coffee Record</th><th class="text-right">Qty (kg)</th><th>Reference</th><th>Created By</th><th>Notes</th>
        </tr></thead>
        <tbody>
          ${rows.map(m => `<tr>
            <td>${format(new Date(m.created_at), 'PP p')}</td>
            <td>${m.movement_type}</td>
            <td style="font-size:10px">${m.coffee_record_id}</td>
            <td class="text-right" style="font-weight:600">${Number(m.quantity_kg).toLocaleString()}</td>
            <td style="font-size:10px">${m.reference_type && m.reference_id ? `${m.reference_type}: ${m.reference_id}` : ''}</td>
            <td>${m.created_by || ''}</td>
            <td>${m.notes || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="summary">
        <strong>Summary:</strong> ${rows.length} movements | Total quantity: ${totalQty.toLocaleString()} kg
      </div>
      ${getStandardPrintFooter()}
      <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No inventory movements recorded yet.
      </div>
    );
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'RECEIPT':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'SALE':
      case 'DISPATCH':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'TRANSFER':
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      case 'ADJUSTMENT':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'RECEIPT':
        return 'default';
      case 'SALE':
      case 'DISPATCH':
        return 'destructive';
      case 'TRANSFER':
        return 'secondary';
      case 'ADJUSTMENT':
      default:
        return 'outline';
    }
  };

  const movementTypes = [...new Set(movements.map(m => m.movement_type))];

  return (
    <div className="space-y-4">
      {/* Filters & Print */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {movementTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Created By</label>
          <Input placeholder="Search..." value={createdByFilter} onChange={e => setCreatedByFilter(e.target.value)} className="h-9" />
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9">
            <Printer className="h-4 w-4 mr-1" /> Print Report
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground">
        Showing {filteredMovements?.length || 0} of {movements.length} movements
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Coffee Record</TableHead>
              <TableHead className="text-right">Quantity (kg)</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements && filteredMovements.length > 0 ? (
              filteredMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{format(new Date(movement.created_at), 'PP p')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getMovementIcon(movement.movement_type)}
                      <Badge variant={getMovementColor(movement.movement_type)}>
                        {movement.movement_type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{movement.coffee_record_id}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {movement.quantity_kg.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {movement.reference_type && movement.reference_id && (
                      <span>{movement.reference_type}: {movement.reference_id}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{movement.created_by}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {movement.notes || '-'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No movements match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MovementsLog;
