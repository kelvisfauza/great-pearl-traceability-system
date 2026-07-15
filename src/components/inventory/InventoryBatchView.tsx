import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, Archive, Search, Filter, Coffee } from "lucide-react";
import { useInventoryBatches } from "@/hooks/useInventoryBatches";
import BatchCard from "./BatchCard";
import MigrationButton from "./MigrationButton";
import ResyncButton from "./ResyncButton";

const isRobusta = (type: string) => type?.toLowerCase().includes('robusta');
const isArabica = (type: string) => type?.toLowerCase().includes('arabica');

const InventoryBatchView = () => {
  const { batches, loading, getSummary, fetchBatches } = useInventoryBatches();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || searchParams.get("highlight") || "";
  const highlightTarget = (searchParams.get("highlight") || searchParams.get("search") || "").toLowerCase();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [coffeeTypeFilter, setCoffeeTypeFilter] = useState<string>("all");

  // Which tab to open initially based on which pool the highlighted batch lives in
  const initialTab = useMemo(() => {
    if (!highlightTarget) return "active";
    const inSoldOut = batches.some(
      (b) => b.status === "sold_out" && b.batch_code?.toLowerCase().includes(highlightTarget)
    );
    return inSoldOut ? "soldout" : "active";
  }, [batches, highlightTarget]);

  // Scroll + pulse the matched batch card once batches are loaded
  useEffect(() => {
    if (!highlightTarget || loading) return;
    const match = batches.find((b) => b.batch_code?.toLowerCase().includes(highlightTarget));
    if (!match) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`batch-${match.batch_code}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("animate-highlight-pulse", "ring-2", "ring-primary", "rounded-lg");
        setTimeout(() => {
          el.classList.remove("animate-highlight-pulse", "ring-2", "ring-primary", "rounded-lg");
          // Clean URL after highlight expires
          const next = new URLSearchParams(searchParams);
          next.delete("highlight");
          next.delete("type");
          next.delete("search");
          setSearchParams(next, { replace: true });
        }, 4000);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [batches, loading, highlightTarget]);
  
  const summary = getSummary();
  
  const activeBatches = batches.filter(b => b.status !== 'sold_out');
  const soldOutBatches = batches.filter(b => b.status === 'sold_out');

  // Calculate Robusta and Arabica totals
  const robustaKg = activeBatches
    .filter(b => isRobusta(b.coffee_type))
    .reduce((sum, b) => sum + (b.remaining_kilograms || 0), 0);
  const arabicaKg = activeBatches
    .filter(b => isArabica(b.coffee_type))
    .reduce((sum, b) => sum + (b.remaining_kilograms || 0), 0);

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
      {/* Migration Button - Show when no batches */}
      {!loading && batches.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Inventory Batches Yet</h3>
            <p className="text-muted-foreground mb-4">
              Import your existing coffee inventory records to create 20,000kg batches
            </p>
            <MigrationButton onMigrationComplete={fetchBatches} />
          </CardContent>
        </Card>
      )}

      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stock Overview</h2>
          <p className="text-sm text-muted-foreground">Coffee in store, grouped into daily batches per coffee type (FIFO)</p>
        </div>
        <div className="flex items-center gap-2">
          <MigrationButton onMigrationComplete={fetchBatches} />
          <ResyncButton onResyncComplete={fetchBatches} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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

        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{robustaKg.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Robusta kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Coffee className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{arabicaKg.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Arabica kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-2xl font-bold">{summary.utilizationPercent.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Stock Remaining</p>
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
      <Tabs value={initialTab} defaultValue={initialTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Package className="h-4 w-4" />
            Active ({activeBatches.length})
          </TabsTrigger>
          <TabsTrigger value="soldout" className="gap-2">
            <Archive className="h-4 w-4" />
            Sold Out ({soldOutBatches.length})
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
              <div key={batch.id} id={`batch-${batch.batch_code}`}>
                <BatchCard batch={batch} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="soldout" className="space-y-4">
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
              <div key={batch.id} id={`batch-${batch.batch_code}`}>
                <BatchCard batch={batch} />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryBatchView;
