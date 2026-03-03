import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { Package } from "lucide-react";

const InventorySummarySection = ({ data }: { data: WholeBusinessData["inventory"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Package className="h-5 w-5 text-indigo-600" /> Inventory & Store
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Coffee Records</p>
          <p className="text-xl font-bold">{data.totalCoffeeRecords}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Kilograms</p>
          <p className="text-xl font-bold">{data.totalKilograms.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Bags</p>
          <p className="text-xl font-bold">{data.totalBags.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-yellow-500/10">
          <p className="text-sm text-muted-foreground">Pending Records</p>
          <p className="text-xl font-bold text-yellow-600">{data.pendingRecords}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Inventory Batches</p>
          <p className="text-xl font-bold">{data.totalBatches}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-sm text-muted-foreground">Available Stock (kg)</p>
          <p className="text-xl font-bold text-green-600">{data.availableBatchKg.toLocaleString()}</p>
        </div>
      </div>

      {data.storageLocations.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Storage Utilization</h4>
          <div className="space-y-2">
            {data.storageLocations.map(loc => {
              const pct = loc.capacity > 0 ? (loc.occupancy / loc.capacity) * 100 : 0;
              return (
                <div key={loc.name} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>{loc.name}</span>
                    <span>{loc.occupancy.toLocaleString()} / {loc.capacity.toLocaleString()} kg ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 85 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default InventorySummarySection;
