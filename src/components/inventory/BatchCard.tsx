import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Package, TrendingDown, Users, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { BatchWithDetails, BatchSource } from "@/hooks/useInventoryBatches";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatSupplierDisplay, SupplierRef } from "@/utils/supplierDisplay";
interface BatchCardProps {
  batch: BatchWithDetails;
}

const BatchCard = ({ batch }: BatchCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [supplierMap, setSupplierMap] = useState<Record<string, SupplierRef>>({});
  
  // Fetch supplier codes for sources
  useEffect(() => {
    const fetchSupplierCodes = async () => {
      if (batch.sources.length === 0) return;
      
      // Get coffee record IDs to look up supplier_ids
      const recordIds = batch.sources.map(s => s.coffee_record_id);
      
      const { data: records } = await supabase
        .from('coffee_records')
        .select('id, supplier_id')
        .in('id', recordIds);
      
      if (!records || records.length === 0) return;
      
      const supplierIds = records.map(r => r.supplier_id).filter(Boolean);
      if (supplierIds.length === 0) return;
      
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .in('id', supplierIds);
      
      if (!suppliers) return;
      
      // Create lookup: coffee_record_id -> supplier
      const recordToSupplier: Record<string, SupplierRef> = {};
      for (const record of records) {
        if (record.supplier_id) {
          const supplier = suppliers.find(s => s.id === record.supplier_id);
          if (supplier) {
            recordToSupplier[record.id] = { id: supplier.id, name: supplier.name, code: supplier.code || '' };
          }
        }
      }
      setSupplierMap(recordToSupplier);
    };
    
    if (isOpen) {
      fetchSupplierCodes();
    }
  }, [isOpen, batch.sources]);
  
  const getSupplierDisplay = (source: BatchSource) => {
    const supplier = supplierMap[source.coffee_record_id];
    return formatSupplierDisplay({ supplier, fallbackName: source.supplier_name });
  };
  
  const percentRemaining = (batch.remaining_kilograms / batch.target_capacity) * 100;
  const percentSold = batch.total_kilograms > 0 
    ? ((batch.total_kilograms - batch.remaining_kilograms) / batch.total_kilograms) * 100 
    : 0;
  const soldKg = batch.total_kilograms - batch.remaining_kilograms;
  const isDepleted = batch.remaining_kilograms === 0 || batch.status === 'sold_out';
  const isLowStock = percentRemaining < 20 && !isDepleted;

  const getStatusBadge = () => {
    if (isDepleted) {
      return (
        <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Depleted
        </Badge>
      );
    }
    if (isLowStock) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
          <AlertCircle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    }
    switch (batch.status) {
      case 'filling':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Filling ({batch.total_kilograms.toLocaleString()}/5,000 kg)</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>;
      case 'selling':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">Selling</Badge>;
      case 'sold_out':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">Sold Out</Badge>;
      default:
        return <Badge variant="outline">{batch.status}</Badge>;
    }
  };

  const getCoffeeTypeBadge = () => {
    const isArabica = batch.coffee_type.toLowerCase().includes('arabica');
    const isRobusta = batch.coffee_type.toLowerCase().includes('robusta');
    return (
      <Badge 
        variant="outline" 
        className={isArabica 
          ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
          : isRobusta
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          : "bg-purple-500/10 text-purple-400 border-purple-500/30"
        }
      >
        {batch.coffee_type}
      </Badge>
    );
  };

  return (
    <Card className={`transition-all duration-200 ${isDepleted ? 'opacity-60 border-red-500/30' : isLowStock ? 'border-yellow-500/30' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDepleted ? 'bg-red-500/10' : 
                  isLowStock ? 'bg-yellow-500/10' : 
                  'bg-primary/10'
                }`}>
                  <Package className={`h-5 w-5 ${
                    isDepleted ? 'text-red-400' : 
                    isLowStock ? 'text-yellow-400' : 
                    'text-primary'
                  }`} />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{batch.batch_code}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getCoffeeTypeBadge()}
                    {getStatusBadge()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <p className={`text-lg font-bold ${isDepleted ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-green-400'}`}>
                      {batch.remaining_kilograms.toLocaleString()} kg
                    </p>
                    <span className="text-muted-foreground text-sm">remaining</span>
                  </div>
                  {soldKg > 0 && (
                    <p className="text-xs text-red-400">
                      {soldKg.toLocaleString()} kg sold
                    </p>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            <div className="mt-3 space-y-2">
              {/* Remaining bar (green) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">Remaining: {batch.remaining_kilograms.toLocaleString()} kg ({percentRemaining.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      isDepleted ? 'bg-red-500' : 
                      isLowStock ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.max(percentRemaining, 0)}%` }}
                  />
                </div>
              </div>
              
              {/* Sold bar (red) - only show if something was sold */}
              {soldKg > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400">Sold: {soldKg.toLocaleString()} kg ({percentSold.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${Math.max(percentSold, 0)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Batch Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Batch Date</p>
                  <p className="text-sm font-medium">{format(new Date(batch.batch_date), 'PP')}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Received</p>
                <p className="text-sm font-medium">{batch.total_kilograms.toLocaleString()} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sold</p>
                <p className="text-sm font-medium">{(batch.total_kilograms - batch.remaining_kilograms).toLocaleString()} kg</p>
              </div>
              {batch.sold_out_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Sold Out On</p>
                  <p className="text-sm font-medium">{format(new Date(batch.sold_out_at), 'PP')}</p>
                </div>
              )}
            </div>

            {/* Source Purchases */}
            {batch.sources.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  Source Purchases ({batch.sources.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {batch.sources.map((source) => {
                    const display = getSupplierDisplay(source);
                    return (
                      <div 
                        key={source.id} 
                        className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                      >
                        <div>
                          <p className="font-medium">{display.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(source.purchase_date), 'PP')}
                          </p>
                        </div>
                        <span className="font-semibold text-green-500">
                          +{source.kilograms.toLocaleString()} kg
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sales History */}
            {batch.sales.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  Sales History ({batch.sales.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {batch.sales.map((sale) => (
                    <div 
                      key={sale.id} 
                      className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                    >
                      <div>
                        <p className="font-medium">{sale.customer_name || 'Unknown Customer'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.sale_date), 'PP')}
                        </p>
                      </div>
                      <span className="font-semibold text-red-500">
                        -{sale.kilograms_deducted.toLocaleString()} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default BatchCard;
