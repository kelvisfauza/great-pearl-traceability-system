
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Users, TrendingUp, MapPin } from "lucide-react";

const Procurement = () => {
  const suppliers = [
    { id: 1, name: "Bushenyi Farmers Cooperative", location: "Bushenyi", status: "Active", lastDelivery: "2 days ago", bags: 150 },
    { id: 2, name: "Masaka Coffee Traders", location: "Masaka", status: "Active", lastDelivery: "1 week ago", bags: 200 },
    { id: 3, name: "Ntungamo Growers Union", location: "Ntungamo", status: "Pending", lastDelivery: "2 weeks ago", bags: 80 },
  ];

  const recentDeliveries = [
    { id: 1, supplier: "Bushenyi Farmers Cooperative", bags: 50, date: "Today", status: "In Progress" },
    { id: 2, supplier: "Masaka Coffee Traders", bags: 120, date: "Yesterday", status: "Completed" },
    { id: 3, supplier: "Mbarara Coffee Ltd", bags: 75, date: "2 days ago", status: "Quality Check" },
  ];

  return (
    <Layout 
      title="Procurement Management" 
      subtitle="Manage coffee sourcing, suppliers, and field operations"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
                  <p className="text-2xl font-bold">124</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold">2,847 bags</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Price</p>
                  <p className="text-2xl font-bold">UGX 7,200</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Field Stations</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suppliers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Suppliers</CardTitle>
                  <CardDescription>Manage your coffee suppliers</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-sm text-gray-500">{supplier.location} • {supplier.bags} bags total</p>
                      <p className="text-xs text-gray-400">Last delivery: {supplier.lastDelivery}</p>
                    </div>
                    <Badge variant={supplier.status === "Active" ? "default" : "secondary"}>
                      {supplier.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
              <CardDescription>Track incoming coffee deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{delivery.bags} bags</p>
                      <p className="text-sm text-gray-500">{delivery.supplier}</p>
                      <p className="text-xs text-gray-400">{delivery.date}</p>
                    </div>
                    <Badge variant={
                      delivery.status === "Completed" ? "default" : 
                      delivery.status === "In Progress" ? "secondary" : "outline"
                    }>
                      {delivery.status}
                    </Badge>
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

export default Procurement;
