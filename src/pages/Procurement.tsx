import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Plus, 
  Users, 
  TrendingUp, 
  FileText, 
  DollarSign,
  Eye,
  CheckCircle,
  AlertTriangle,
  Download,
  Filter,
  Search,
  Star,
  MapPin
} from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useDeliveries } from "@/hooks/useDeliveries";

const Procurement = () => {
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { purchaseOrders, loading: ordersLoading } = usePurchaseOrders();
  const { deliveries, loading: deliveriesLoading } = useDeliveries();

  // Reference prices - these could also come from database in the future
  const referencePrices = [
    { grade: "Drugar", currentPrice: 7200, previousPrice: 7000, change: "+2.9%" },
    { grade: "Wugar", currentPrice: 7500, previousPrice: 7300, change: "+2.7%" },
    { grade: "Robusta", currentPrice: 6800, previousPrice: 6900, change: "-1.4%" }
  ];

  return (
    <Layout 
      title="Procurement Management" 
      subtitle="Comprehensive coffee sourcing, supplier management, and procurement operations"
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                  <p className="text-xs text-green-600">Real-time data</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold">{purchaseOrders.length}</p>
                  <p className="text-xs text-blue-600">From database</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Deliveries</p>
                  <p className="text-2xl font-bold">{deliveries.length}</p>
                  <p className="text-xs text-amber-600">Live data</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-red-600">No pending items</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="pricing">Price Management</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          </TabsList>

          {/* Supplier Overview */}
          <TabsContent value="suppliers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Supplier Overview</CardTitle>
                    <CardDescription>Manage registered suppliers and their performance</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Supplier
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input placeholder="Search suppliers..." className="pl-10" />
                  </div>
                </div>
                
                {suppliersLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading suppliers...</p>
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No suppliers found</p>
                    <p className="text-sm text-gray-400">Add your first supplier to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Coffee Types</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Total Bags</TableHead>
                        <TableHead>Avg Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              {supplier.location}
                            </div>
                          </TableCell>
                          <TableCell>{supplier.contact}</TableCell>
                          <TableCell>{supplier.coffeeTypes}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              {supplier.rating}
                            </div>
                          </TableCell>
                          <TableCell>{supplier.totalBags.toLocaleString()}</TableCell>
                          <TableCell>UGX {supplier.averagePrice.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={supplier.status === "Active" ? "default" : "secondary"}>
                              {supplier.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Orders */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Purchase Orders & Contracts</CardTitle>
                    <CardDescription>Monitor and manage coffee purchase orders</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Order
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading purchase orders...</p>
                  </div>
                ) : purchaseOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No purchase orders found</p>
                    <p className="text-sm text-gray-400">Create your first purchase order to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Quantity (Bags)</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{order.supplier}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.coffeeType}</Badge>
                          </TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>UGX {order.unitPrice.toLocaleString()}</TableCell>
                          <TableCell>UGX {order.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>{order.deliveryDate}</TableCell>
                          <TableCell>{order.received}/{order.quantity}</TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === "Completed" ? "default" : 
                              order.status === "Active" ? "secondary" : "outline"
                            }>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coffee Deliveries */}
          <TabsContent value="deliveries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Coffee Deliveries</CardTitle>
                <CardDescription>Track and approve incoming coffee deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                {deliveriesLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading deliveries...</p>
                  </div>
                ) : deliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No deliveries found</p>
                    <p className="text-sm text-gray-400">Deliveries will appear here when they arrive</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Weight (Bags)</TableHead>
                        <TableHead>Moisture %</TableHead>
                        <TableHead>Defects</TableHead>
                        <TableHead>Price/Bag</TableHead>
                        <TableHead>GRN</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell className="font-medium">{delivery.id}</TableCell>
                          <TableCell>{delivery.supplier}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{delivery.coffeeType}</Badge>
                          </TableCell>
                          <TableCell>{delivery.weight}</TableCell>
                          <TableCell>{delivery.moistureContent}%</TableCell>
                          <TableCell>{delivery.defects}</TableCell>
                          <TableCell>UGX {delivery.pricePerBag.toLocaleString()}</TableCell>
                          <TableCell>{delivery.grn}</TableCell>
                          <TableCell>
                            <Badge variant={
                              delivery.status === "Approved" ? "default" : 
                              delivery.status === "Quality Check" ? "secondary" : "outline"
                            }>
                              {delivery.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Procurement Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Procurement Summary</CardTitle>
                  <CardDescription>Coffee purchases by type and grade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <p>No procurement data available yet</p>
                    <p className="text-sm">Data will appear when purchases are made</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Price Analysis</CardTitle>
                  <CardDescription>Average procurement prices and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {referencePrices.map((price, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">{price.grade}</p>
                          <p className="text-sm text-gray-500">Current: UGX {price.currentPrice.toLocaleString()}</p>
                        </div>
                        <Badge variant={price.change.startsWith('+') ? 'default' : 'destructive'}>
                          {price.change}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documentation</CardTitle>
                <CardDescription>Access GRNs, delivery notes, and contracts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <FileText className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-medium">GRNs & Delivery Notes</h3>
                    <p className="text-sm text-gray-500 mb-3">0 documents</p>
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                  <div className="border rounded-lg p-4">
                    <FileText className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-medium">Supplier Contracts</h3>
                    <p className="text-sm text-gray-500 mb-3">0 contracts</p>
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                  <div className="border rounded-lg p-4">
                    <FileText className="h-8 w-8 text-amber-600 mb-2" />
                    <h3 className="font-medium">Quality Reports</h3>
                    <p className="text-sm text-gray-500 mb-3">0 reports</p>
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Management */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Management & Forecasting</CardTitle>
                <CardDescription>Set reference prices and manage pricing controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4">Daily Reference Prices</h3>
                    <div className="space-y-3">
                      {referencePrices.map((price, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{price.grade}</p>
                            <p className="text-sm text-gray-500">Last updated: Today</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">UGX {price.currentPrice.toLocaleString()}</p>
                            <Button variant="ghost" size="sm">Update</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-4">Price Controls</h3>
                    <div className="space-y-3">
                      <div className="p-3 border rounded">
                        <p className="font-medium">Maximum Price Variance</p>
                        <p className="text-sm text-gray-500">±5% from reference price</p>
                        <Button variant="outline" size="sm" className="mt-2">Adjust</Button>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="font-medium">Daily Procurement Cap</p>
                        <p className="text-sm text-gray-500">UGX 25,000,000</p>
                        <Button variant="outline" size="sm" className="mt-2">Modify</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals & Controls */}
          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Approvals & Controls</CardTitle>
                <CardDescription>Manage exceptions and authorization controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending approvals</p>
                  <p className="text-sm">Exception requests will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Procurement;
