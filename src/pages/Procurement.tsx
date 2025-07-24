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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import GRNGenerator from "@/components/procurement/GRNGenerator";
import QualityReportsModal from "@/components/procurement/QualityReportsModal";
import SupplierContractModal from "@/components/procurement/SupplierContractModal";

const Procurement = () => {
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { purchaseOrders, loading: ordersLoading } = usePurchaseOrders();
  const { deliveries, loading: deliveriesLoading } = useDeliveries();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);

  // Modal states
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [qualityReportsOpen, setQualityReportsOpen] = useState(false);
  const [contractsModalOpen, setContractsModalOpen] = useState(false);

  // Fetch market data for reference prices
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const { data, error } = await supabase
          .from('market_data')
          .select('*')
          .order('date_recorded', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching market data:', error);
        } else {
          setMarketData(data || []);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setMarketLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  // Calculate derived metrics
  const activeOrders = purchaseOrders.filter(order => order.status === 'Active').length;
  const pendingDeliveries = deliveries.filter(delivery => delivery.status === 'Pending').length;
  const totalOrderValue = purchaseOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Reference prices from market data or fallback
  const referencePrices = marketData.length > 0 ? marketData.slice(0, 3).map(data => ({
    grade: data.coffee_type,
    currentPrice: data.price_ugx,
    previousPrice: data.price_ugx * 0.97, // Simulated previous price
    change: data.change_percentage ? `${data.change_percentage > 0 ? '+' : ''}${data.change_percentage.toFixed(1)}%` : '+2.5%'
  })) : [
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
                  <p className="text-2xl font-bold">{suppliersLoading ? '...' : suppliers.length}</p>
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
                  <p className="text-2xl font-bold">{ordersLoading ? '...' : activeOrders}</p>
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
                  <p className="text-2xl font-bold">{deliveriesLoading ? '...' : pendingDeliveries}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Order Value</p>
                  <p className="text-2xl font-bold">UGX {totalOrderValue.toLocaleString()}</p>
                  <p className="text-xs text-green-600">Current month</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
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
                        <TableHead>Code</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Opening Balance</TableHead>
                        <TableHead>Date Registered</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell><Badge variant="outline">{supplier.code}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              {supplier.origin}
                            </div>
                          </TableCell>
                          <TableCell>{supplier.phone || 'N/A'}</TableCell>
                          <TableCell>UGX {supplier.opening_balance.toLocaleString()}</TableCell>
                          <TableCell>{supplier.date_registered}</TableCell>
                          <TableCell>
                            <Badge variant="default">Active</Badge>
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
                        <TableHead>Order ID</TableHead>
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
                          <TableCell className="font-medium">{order.id.slice(0, 8)}...</TableCell>
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
                          <TableCell className="font-medium">{delivery.id.slice(0, 8)}...</TableCell>
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
                  {ordersLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading procurement data...</p>
                    </div>
                  ) : purchaseOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No procurement data available yet</p>
                      <p className="text-sm">Data will appear when purchases are made</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 border rounded">
                          <p className="text-2xl font-bold">{purchaseOrders.length}</p>
                          <p className="text-sm text-gray-600">Total Orders</p>
                        </div>
                        <div className="text-center p-4 border rounded">
                          <p className="text-2xl font-bold">{purchaseOrders.reduce((sum, order) => sum + order.quantity, 0)}</p>
                          <p className="text-sm text-gray-600">Total Bags</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Price Analysis</CardTitle>
                  <CardDescription>Average procurement prices and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {marketLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading market data...</p>
                    </div>
                  ) : (
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
                  )}
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
                    <p className="text-sm text-gray-500 mb-3">Generate from existing records</p>
                    <Button variant="outline" size="sm" onClick={() => setGrnModalOpen(true)}>
                      Generate GRN
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4">
                    <FileText className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-medium">Supplier Contracts</h3>
                    <p className="text-sm text-gray-500 mb-3">Manage supplier agreements</p>
                    <Button variant="outline" size="sm" onClick={() => setContractsModalOpen(true)}>
                      View Contracts
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4">
                    <FileText className="h-8 w-8 text-amber-600 mb-2" />
                    <h3 className="font-medium">Quality Reports</h3>
                    <p className="text-sm text-gray-500 mb-3">Stock quality averages</p>
                    <Button variant="outline" size="sm" onClick={() => setQualityReportsOpen(true)}>
                      View Reports
                    </Button>
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

        {/* Modals */}
        <GRNGenerator 
          open={grnModalOpen} 
          onClose={() => setGrnModalOpen(false)} 
        />
        
        <QualityReportsModal 
          open={qualityReportsOpen} 
          onClose={() => setQualityReportsOpen(false)} 
        />
        
        <SupplierContractModal 
          open={contractsModalOpen} 
          onClose={() => setContractsModalOpen(false)} 
        />
      </div>
    </Layout>
  );
};

export default Procurement;
