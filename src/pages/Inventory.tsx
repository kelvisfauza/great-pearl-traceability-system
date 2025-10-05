
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Package, AlertTriangle, TrendingDown, Warehouse, MapPin, RefreshCw } from "lucide-react";
import { useInventoryManagement } from "@/hooks/useInventoryManagement";

const Inventory = () => {
  const { inventoryItems, storageLocations, loading, summary, fetchInventoryData } = useInventoryManagement();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: 'Available', variant: 'default' as const },
      low_stock: { label: 'Low Stock', variant: 'secondary' as const },
      out_of_stock: { label: 'Out of Stock', variant: 'destructive' as const }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  };

  if (loading) {
    return (
      <Layout 
        title="Inventory Management" 
        subtitle="Track stock levels, storage, and inventory movements"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading inventory data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Inventory Management" 
      subtitle="Track stock levels, storage, and inventory movements - Real-time updates"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button 
            onClick={fetchInventoryData} 
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Inventory
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Stock</p>
                  <p className="text-2xl font-bold">{summary.totalStock.toLocaleString()} bags</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Space</p>
                  <p className="text-2xl font-bold">{summary.availableSpacePercentage}%</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold">{summary.lowStockItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Turnover</p>
                  <p className="text-2xl font-bold">{summary.monthlyTurnover}x</p>
                </div>
                <TrendingDown className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Items */}
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
            <CardDescription>
              {inventoryItems.length > 0 
                ? `${inventoryItems.length} coffee types in inventory` 
                : "No items currently in inventory. Items will appear here once coffee records reach inventory status."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coffee Type</TableHead>
                    <TableHead>Total Bags</TableHead>
                    <TableHead>Total Weight (kg)</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Batch Numbers</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.coffeeType}</TableCell>
                      <TableCell>{item.totalBags}</TableCell>
                      <TableCell>{item.totalKilograms.toLocaleString()} kg</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                          {item.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(item.status).variant}>
                          {getStatusBadge(item.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.batchNumbers.slice(0, 3).join(', ')}
                        {item.batchNumbers.length > 3 && ` +${item.batchNumbers.length - 3} more`}
                      </TableCell>
                      <TableCell>{item.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No inventory items found</p>
                <p className="text-sm">Items will appear here once coffee records reach inventory status in Store Management</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Locations</CardTitle>
            <CardDescription>Warehouse capacity and occupancy overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storageLocations.map((location) => (
                <Card key={location.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <Warehouse className="h-4 w-4 mr-2 text-gray-500" />
                        {location.name}
                      </h4>
                      <Badge variant="outline">{location.occupancyPercentage}% Full</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Occupied:</span>
                        <span>{location.currentOccupancy.toLocaleString()} kgs</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Capacity:</span>
                        <span>{location.capacity.toLocaleString()} kgs</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${location.occupancyPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Inventory;
