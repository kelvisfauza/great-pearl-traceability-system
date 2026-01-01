import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, Archive, Search, Filter } from "lucide-react";
import { useInventoryBatches } from "@/hooks/useInventoryBatches";
import BatchCard from "./BatchCard";

const InventoryBatchView = () => {
  const { batches, loading, getSummary } = useInventoryBatches();
  const [searchTerm, setSearchTerm] = useState("");
  const [coffeeTypeFilter, setCoffeeTypeFilter] = useState<string>("all");
  
  const summary = getSummary();
  
  const activeBatches = batches.filter(b => b.status !== 'sold_out');
  const soldOutBatches = batches.filter(b => b.status === 'sold_out');

  // Get unique coffee types for filter
  const coffeeTypes = [...new Set(batches.map(b => b.coffee_type))];

  // Filter batches
  const filterBatches = (batchList: typeof batches) => {
    return batchList.filter(batch => {
      const matchesSearch = batch.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.coffee_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.sources.some(s => s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCoffeeType = coffeeTypeFilter === "all" || batch.coffee_type === coffeeTypeFilter;
      
      return matchesSearch && matchesCoffeeType;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.activeBatches}</p>
                <p className="text-xs text-muted-foreground">Active Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Archive className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.soldOutBatches}</p>
                <p className="text-xs text-muted-foreground">Sold Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-2xl font-bold">{summary.totalRemaining.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total kg Available</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-2xl font-bold">{summary.utilizationPercent.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Capacity Used</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches, suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={coffeeTypeFilter} onValueChange={setCoffeeTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coffee Types</SelectItem>
            {coffeeTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Batch Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Package className="h-4 w-4" />
            Active ({activeBatches.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Archive className="h-4 w-4" />
            History ({soldOutBatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filterBatches(activeBatches).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active batches found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Batches will appear here when coffee purchases are made
                </p>
              </CardContent>
            </Card>
          ) : (
            filterBatches(activeBatches).map(batch => (
              <BatchCard key={batch.id} batch={batch} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {filterBatches(soldOutBatches).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No sold out batches yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Completed batches will appear here for historical reference
                </p>
              </CardContent>
            </Card>
          ) : (
            filterBatches(soldOutBatches).map(batch => (
              <BatchCard key={batch.id} batch={batch} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryBatchView;
