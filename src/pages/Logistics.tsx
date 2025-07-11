
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Truck, MapPin, Package, Clock, Plus, Search, Eye, Navigation } from "lucide-react";
import { useState } from "react";

const Logistics = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const vehicles = [
    { id: 1, name: "Truck-001", driver: "Robert Katongole", route: "Kampala-Bushenyi", status: "En Route", load: "150 bags", eta: "2 hours" },
    { id: 2, name: "Van-002", driver: "Alice Namuli", route: "Masaka-Kampala", status: "Loading", load: "80 bags", eta: "4 hours" },
    { id: 3, name: "Truck-003", driver: "James Wamala", route: "Ntungamo-Kampala", status: "Delivered", load: "200 bags", eta: "Completed" },
    { id: 4, name: "Van-004", driver: "Susan Nakato", route: "Mbarara-Kampala", status: "Maintenance", load: "0 bags", eta: "N/A" },
  ];

  const shipments = [
    { id: 1, destination: "Hamburg, Germany", customer: "Global Coffee Imports", bags: 500, status: "In Transit", vessel: "MV Coffee Express", eta: "Jan 15, 2025" },
    { id: 2, destination: "New York, USA", customer: "American Bean Co.", bags: 300, status: "Processing", vessel: "TBD", eta: "Jan 22, 2025" },
    { id: 3, destination: "Tokyo, Japan", customer: "Tokyo Coffee House", bags: 250, status: "Customs", vessel: "MV Asia Star", eta: "Jan 18, 2025" },
    { id: 4, destination: "London, UK", customer: "London Roasters", bags: 400, status: "Delivered", vessel: "MV Europa", eta: "Completed" },
  ];

  const routes = [
    { id: 1, name: "Northern Route", locations: ["Gulu", "Lira", "Kampala"], distance: "365 km", frequency: "Weekly", vehicles: 2 },
    { id: 2, name: "Western Route", locations: ["Bushenyi", "Mbarara", "Kampala"], distance: "290 km", frequency: "Daily", vehicles: 3 },
    { id: 3, name: "Central Route", locations: ["Masaka", "Mpigi", "Kampala"], distance: "140 km", frequency: "Daily", vehicles: 2 },
    { id: 4, name: "Eastern Route", locations: ["Mbale", "Jinja", "Kampala"], distance: "235 km", frequency: "Bi-weekly", vehicles: 1 },
  ];

  const warehouseData = [
    { location: "Kampala Main", capacity: "2000 bags", current: "1450 bags", utilization: 72.5, status: "Operational" },
    { location: "Bushenyi Branch", capacity: "500 bags", current: "380 bags", utilization: 76.0, status: "Operational" },
    { location: "Masaka Branch", capacity: "300 bags", current: "85 bags", utilization: 28.3, status: "Operational" },
    { location: "Export Terminal", capacity: "1000 bags", current: "750 bags", utilization: 75.0, status: "Operational" },
  ];

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.route.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-green-600">8 currently on routes</p>
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
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-xs text-blue-600">Covering 4 regions</p>
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
                  <p className="text-2xl font-bold">6</p>
                  <p className="text-xs text-purple-600">950 bags total</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Delivery Time</p>
                  <p className="text-2xl font-bold">18 days</p>
                  <p className="text-xs text-amber-600">For international shipments</p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
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
                <Button>
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
                {filteredVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{vehicle.name}</p>
                      <p className="text-sm text-gray-500">Driver: {vehicle.driver}</p>
                      <p className="text-xs text-gray-400">{vehicle.route} • {vehicle.load}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-xs">
                        <p className="text-gray-600">ETA: {vehicle.eta}</p>
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
                ))}
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
                {shipments.map((shipment) => (
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
                    <p className="text-sm text-gray-600 mb-1">{shipment.customer}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{shipment.bags} bags</span>
                      <span>ETA: {shipment.eta}</span>
                    </div>
                    {shipment.vessel !== "TBD" && (
                      <p className="text-xs text-gray-400 mt-1">Vessel: {shipment.vessel}</p>
                    )}
                  </div>
                ))}
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
                {routes.map((route) => (
                  <div key={route.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{route.name}</h4>
                      <Badge variant="outline">{route.vehicles} vehicles</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {route.locations.join(" → ")}
                    </p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{route.distance}</span>
                      <span>{route.frequency}</span>
                    </div>
                  </div>
                ))}
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
                {warehouseData.map((warehouse, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{warehouse.location}</h4>
                      <Badge variant="default">{warehouse.status}</Badge>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{warehouse.current} / {warehouse.capacity}</span>
                      <span>{warehouse.utilization}% utilized</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          warehouse.utilization > 80 ? 'bg-red-500' :
                          warehouse.utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${warehouse.utilization}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Logistics;
