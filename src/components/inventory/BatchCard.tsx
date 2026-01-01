import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Package, TrendingDown, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { BatchWithDetails } from "@/hooks/useInventoryBatches";
import { useState } from "react";

interface BatchCardProps {
  batch: BatchWithDetails;
}

const BatchCard = ({ batch }: BatchCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const percentRemaining = (batch.remaining_kilograms / batch.target_capacity) * 100;
  const percentSold = ((batch.total_kilograms - batch.remaining_kilograms) / batch.total_kilograms) * 100;

  const getStatusBadge = () => {
    switch (batch.status) {
      case 'filling':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Filling</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
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
    return (
      <Badge 
        variant="outline" 
        className={isArabica 
          ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        }
      >
        {batch.coffee_type}
      </Badge>
    );
  };

  return (
    <Card className={`transition-all duration-200 ${batch.status === 'sold_out' ? 'opacity-60' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${batch.status === 'sold_out' ? 'bg-muted' : 'bg-primary/10'}`}>
                  <Package className={`h-5 w-5 ${batch.status === 'sold_out' ? 'text-muted-foreground' : 'text-primary'}`} />
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
                  <p className="text-lg font-bold">
                    {batch.remaining_kilograms.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of {batch.target_capacity.toLocaleString()} kg capacity
                  </p>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Remaining: {percentRemaining.toFixed(1)}%</span>
                <span>Sold: {percentSold.toFixed(1)}%</span>
              </div>
              <Progress 
                value={percentRemaining} 
                className="h-2"
              />
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
                  {batch.sources.map((source) => (
                    <div 
                      key={source.id} 
                      className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                    >
                      <div>
                        <p className="font-medium">{source.supplier_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(source.purchase_date), 'PP')}
                        </p>
                      </div>
                      <span className="font-semibold text-green-500">
                        +{source.kilograms.toLocaleString()} kg
                      </span>
                    </div>
                  ))}
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
