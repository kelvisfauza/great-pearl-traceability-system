
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Truck, MapPin, Package, Clock, Plus, Search, Eye, Navigation, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useLogistics } from "@/hooks/useLogistics";
import { AddVehicleModal } from "@/components/logistics/AddVehicleModal";

const Logistics = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const { vehicles, shipments, routes, warehouses, loading } = useLogistics();

  const filteredVehicles = useMemo(() => 
    vehicles.filter(vehicle =>
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.route.toLowerCase().includes(searchTerm.toLowerCase())
    ), [vehicles, searchTerm]
  );

  // Calculate stats from real data
  const stats = useMemo(() => ({
    activeVehicles: vehicles.length,
    onRoute: vehicles.filter(v => v.status === 'En Route').length,
    activeRoutes: routes.length,
    pendingShipments: shipments.filter(s => s.status !== 'Delivered').length,
    totalPendingBags: shipments.filter(s => s.status !== 'Delivered').reduce((sum, s) => sum + s.bags, 0)
  }), [vehicles, routes, shipments]);

  if (loading) {
    return (
      <Layout title="Logistics & Transportation" subtitle="Loading logistics data...">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Logistics & Transportation" 
      subtitle="Manage fleet, routes, and shipping operations"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
                  <p className="text-2xl font-bold">{stats.activeVehicles}</p>
                  <p className="text-xs text-green-600">{stats.onRoute} currently on routes</p>
                </div>
                <Truck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Routes</p>
                  <p className="text-2xl font-bold">{stats.activeRoutes}</p>
                  <p className="text-xs text-blue-600">Delivery routes</p>
                </div>
                <Navigation className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Shipments</p>
                  <p className="text-2xl font-bold">{stats.pendingShipments}</p>
                  <p className="text-xs text-purple-600">{stats.totalPendingBags.toLocaleString()} bags total</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Warehouses</p>
                  <p className="text-2xl font-bold">{warehouses.length}</p>
                  <p className="text-xs text-amber-600">Storage facilities</p>
                </div>
                <MapPin className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fleet Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fleet Management</CardTitle>
                  <CardDescription>Track vehicles and delivery status</CardDescription>
                </div>
                <Button onClick={() => setAddVehicleOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredVehicles.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No vehicles found</p>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{vehicle.name} ({vehicle.vehicle_type})</p>
                        <p className="text-sm text-gray-500">Driver: {vehicle.driver_name}</p>
                        <p className="text-xs text-gray-400">{vehicle.route} • {vehicle.current_load || 'No load'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right text-xs">
                          <p className="text-gray-600">ETA: {vehicle.eta || 'N/A'}</p>
                        </div>
                        <Badge variant={
                          vehicle.status === "En Route" ? "default" :
                          vehicle.status === "Loading" ? "secondary" :
                          vehicle.status === "Delivered" ? "outline" : "destructive"
                        }>
                          {vehicle.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* International Shipments */}
          <Card>
            <CardHeader>
              <CardTitle>International Shipments</CardTitle>
              <CardDescription>Track export deliveries and customs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No shipments found</p>
                ) : (
                  shipments.map((shipment) => (
                    <div key={shipment.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{shipment.destination}</h4>
                        <Badge variant={
                          shipment.status === "In Transit" ? "default" :
                          shipment.status === "Processing" ? "secondary" :
                          shipment.status === "Customs" ? "outline" : "destructive"
                        }>
                          {shipment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{shipment.customer_name}</p>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{shipment.bags.toLocaleString()} bags</span>
                        <span>ETA: {shipment.eta || 'TBD'}</span>
                      </div>
                      {shipment.vessel_name && shipment.vessel_name !== "TBD" && (
                        <p className="text-xs text-gray-400 mt-1">Vessel: {shipment.vessel_name}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Management */}
          <Card>
            <CardHeader>
              <CardTitle>Route Management</CardTitle>
              <CardDescription>Optimize delivery routes and scheduling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No routes found</p>
                ) : (
                  routes.map((route) => (
                    <div key={route.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{route.name}</h4>
                        <Badge variant="outline">{route.active_vehicles} vehicles</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {route.locations.join(" → ")}
                      </p>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{route.distance_km} km</span>
                        <span>{route.frequency}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Status */}
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Status</CardTitle>
              <CardDescription>Monitor storage capacity and utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warehouses.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No warehouses found</p>
                ) : (
                  warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{warehouse.location}</h4>
                        <Badge variant="default">{warehouse.status}</Badge>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>{warehouse.current_bags.toLocaleString()} / {warehouse.capacity_bags.toLocaleString()} bags</span>
                        <span>{warehouse.utilization_percentage}% utilized</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            warehouse.utilization_percentage > 80 ? 'bg-red-500' :
                            warehouse.utilization_percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${warehouse.utilization_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddVehicleModal open={addVehicleOpen} onOpenChange={setAddVehicleOpen} />
    </Layout>
  );
};

export default Logistics;
