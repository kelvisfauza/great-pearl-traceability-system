import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ShoppingCart,
  FileText,
  Package,
  Leaf,
  Truck,
  User,
  Calendar,
  DollarSign,
  Printer,
  Shield,
  Layers,
} from "lucide-react";
import { format } from "date-fns";

interface SaleFullViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
}

const SaleFullViewDialog = ({ open, onOpenChange, saleId }: SaleFullViewDialogProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["sale-full-view", saleId],
    queryFn: async () => {
      // Fetch sale details
      const { data: sale, error: saleError } = await supabase
        .from("sales_transactions")
        .select("*")
        .eq("id", saleId)
        .single();
      if (saleError) throw saleError;

      // Fetch contract allocations for this sale
      const { data: contractAllocations } = await supabase
        .from("contract_allocations")
        .select("*, buyer_contracts:contract_id(contract_ref, buyer_name, quality, price_per_kg, total_quantity, allocated_quantity, status)")
        .eq("sale_id", saleId);

      // Fetch EUDR batch links for this sale
      const { data: eudrLinks } = await supabase
        .from("eudr_batch_sales")
        .select("*, eudr_batches:batch_id(batch_identifier, kilograms, available_kilograms, status, document_id)")
        .eq("sale_transaction_id", saleId);

      // Get EUDR document details if any
      let eudrDocuments: any[] = [];
      if (eudrLinks && eudrLinks.length > 0) {
        const docIds = [...new Set(eudrLinks.map((l: any) => l.eudr_batches?.document_id).filter(Boolean))];
        if (docIds.length > 0) {
          const { data: docs } = await supabase
            .from("eudr_documents")
            .select("id, coffee_type, total_kilograms, batch_number, date, status, total_receipts")
            .in("id", docIds);
          eudrDocuments = docs || [];
        }
      }

      // Fetch inventory batch sales for this sale
      const { data: inventorySales } = await supabase
        .from("inventory_batch_sales")
        .select("*, inventory_batches:batch_id(batch_number, coffee_type, total_kg, available_kg, status, purchase_date)")
        .eq("sale_transaction_id", saleId);

      return {
        sale,
        contractAllocations: contractAllocations || [],
        eudrLinks: eudrLinks || [],
        eudrDocuments,
        inventorySales: inventorySales || [],
      };
    },
    enabled: open && !!saleId,
  });

  const handlePrint = () => {
    const printContent = document.getElementById("sale-full-view-print");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Sale Report</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #1a1a1a; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; border-bottom: 2px solid #16a34a; padding-bottom: 4px; color: #16a34a; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .field { margin-bottom: 6px; }
        .field-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .field-value { font-weight: 600; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; font-size: 12px; }
        th { background: #f9fafb; font-weight: 600; }
        .section-empty { color: #9ca3af; font-style: italic; padding: 12px; text-align: center; }
        .total-row { font-weight: 700; background: #f0fdf4; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>${printContent.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data?.sale) return null;

  const { sale, contractAllocations, eudrLinks, eudrDocuments, inventorySales } = data;
  const totalEudrKg = eudrLinks.reduce((sum: number, l: any) => sum + (l.kilograms_allocated || 0), 0);
  const totalInventoryKg = inventorySales.reduce((sum: number, l: any) => sum + (l.kilograms_sold || 0), 0);
  const totalContractKg = contractAllocations.reduce((sum: number, l: any) => sum + (l.allocated_kg || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Sale Full View
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </DialogHeader>

        <div id="sale-full-view-print" className="space-y-4">
          {/* Sale Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Sale Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Customer</p>
                  <p className="font-semibold flex items-center gap-1"><User className="h-3.5 w-3.5" /> {sale.customer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-semibold flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(new Date(sale.date), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                    {sale.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Coffee Type</p>
                  <p className="font-semibold flex items-center gap-1"><Leaf className="h-3.5 w-3.5 text-green-600" /> {sale.coffee_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Weight</p>
                  <p className="font-semibold">{Number(sale.weight).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Unit Price</p>
                  <p className="font-semibold">{Number(sale.unit_price).toLocaleString()} UGX/kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Amount</p>
                  <p className="font-bold text-primary text-base">{Number(sale.total_amount).toLocaleString()} UGX</p>
                </div>
                {sale.moisture && (
                  <div>
                    <p className="text-muted-foreground text-xs">Moisture</p>
                    <p className="font-semibold">{sale.moisture}</p>
                  </div>
                )}
              </div>
              {(sale.truck_details || sale.driver_details) && (
                <>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {sale.truck_details && (
                      <div>
                        <p className="text-muted-foreground text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> Truck</p>
                        <p className="font-semibold">{sale.truck_details}</p>
                      </div>
                    )}
                    {sale.driver_details && (
                      <div>
                        <p className="text-muted-foreground text-xs">Driver</p>
                        <p className="font-semibold">{sale.driver_details}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contract Allocations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Contract Allocation
                <Badge variant="outline" className="ml-auto">{contractAllocations.length} contract(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contractAllocations.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-3 italic">No contract allocated to this sale</p>
              ) : (
                <div className="space-y-3">
                  {contractAllocations.map((alloc: any) => (
                    <div key={alloc.id} className="border rounded-lg p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{alloc.buyer_contracts?.contract_ref || "N/A"}</p>
                        <Badge variant={alloc.buyer_contracts?.status === "active" ? "default" : "secondary"}>
                          {alloc.buyer_contracts?.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Buyer:</span>{" "}
                          <span className="font-medium">{alloc.buyer_contracts?.buyer_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quality:</span>{" "}
                          <span className="font-medium">{alloc.buyer_contracts?.quality}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Contract Price:</span>{" "}
                          <span className="font-medium">{Number(alloc.buyer_contracts?.price_per_kg || 0).toLocaleString()} UGX/kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Allocated:</span>{" "}
                          <span className="font-bold text-blue-600">{Number(alloc.allocated_kg).toLocaleString()} kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-sm font-bold text-blue-600">
                    Total Allocated: {totalContractKg.toLocaleString()} kg
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EUDR Traceability */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                EUDR Traceability
                <Badge variant="outline" className="ml-auto">{eudrLinks.length} batch(es)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eudrLinks.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-3 italic">No EUDR batches attached to this sale</p>
              ) : (
                <div className="space-y-3">
                  {eudrLinks.map((link: any) => (
                    <div key={link.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs font-semibold">{link.eudr_batches?.batch_identifier}</p>
                        <Badge variant={link.eudr_batches?.status === "sold_out" ? "default" : "secondary"}>
                          {link.eudr_batches?.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                        <div>
                          <span className="text-muted-foreground">Batch Total:</span>{" "}
                          <span className="font-medium">{Number(link.eudr_batches?.kilograms || 0).toLocaleString()} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Allocated to Sale:</span>{" "}
                          <span className="font-bold text-green-600">{Number(link.kilograms_allocated).toLocaleString()} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Remaining:</span>{" "}
                          <span className="font-medium">{Number(link.eudr_batches?.available_kilograms || 0).toLocaleString()} kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {eudrDocuments.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Source EUDR Documents:</p>
                      {eudrDocuments.map((doc: any) => (
                        <div key={doc.id} className="text-xs flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          <span className="font-mono">{doc.batch_number}</span>
                          <span>— {doc.coffee_type} — {Number(doc.total_kilograms).toLocaleString()} kg — {doc.total_receipts} receipts</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-right text-sm font-bold text-green-600">
                    Total EUDR Traced: {totalEudrKg.toLocaleString()} kg
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Batches */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-600" />
                Inventory Batches Used
                <Badge variant="outline" className="ml-auto">{inventorySales.length} batch(es)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventorySales.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-3 italic">No inventory batches linked to this sale</p>
              ) : (
                <div className="space-y-3">
                  {inventorySales.map((inv: any) => (
                    <div key={inv.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs font-semibold">{inv.inventory_batches?.batch_number || "N/A"}</p>
                        <Badge variant="secondary">{inv.inventory_batches?.coffee_type}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                        <div>
                          <span className="text-muted-foreground">Batch Total:</span>{" "}
                          <span className="font-medium">{Number(inv.inventory_batches?.total_kg || 0).toLocaleString()} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sold from Batch:</span>{" "}
                          <span className="font-bold text-amber-600">{Number(inv.kilograms_sold || 0).toLocaleString()} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Purchase Date:</span>{" "}
                          <span className="font-medium">{inv.inventory_batches?.purchase_date ? format(new Date(inv.inventory_batches.purchase_date), "dd MMM yyyy") : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-sm font-bold text-amber-600">
                    Total from Inventory: {totalInventoryKg.toLocaleString()} kg
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coverage Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-2">Coverage Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Sale Weight</p>
                  <p className="font-bold">{Number(sale.weight).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Contract Covered</p>
                  <p className="font-bold text-blue-600">{totalContractKg.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">EUDR Traced</p>
                  <p className="font-bold text-green-600">{totalEudrKg.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Inventory Sourced</p>
                  <p className="font-bold text-amber-600">{totalInventoryKg.toLocaleString()} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleFullViewDialog;
