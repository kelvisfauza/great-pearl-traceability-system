
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Users, Scale, Send, Truck, ShoppingCart } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  code: string;
  phone?: string;
  origin: string;
  openingBalance: number;
  dateRegistered: string;
}

interface CoffeeRecord {
  id: string;
  coffeeType: string;
  date: string;
  kilograms: number;
  bags: number;
  supplier: string;
  status: 'pending' | 'quality_review' | 'pricing' | 'batched' | 'drying' | 'sales' | 'inventory';
  batchNumber?: string;
}

const Store = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: '1',
      name: 'Mbale Coffee Growers',
      code: 'GPCS0001',
      phone: '+256701234567',
      origin: 'Mount Elgon',
      openingBalance: 2500,
      dateRegistered: '2024-01-15'
    }
  ]);

  const [coffeeRecords, setCoffeeRecords] = useState<CoffeeRecord[]>([
    {
      id: '1',
      coffeeType: 'Drugar',
      date: '2024-07-12',
      kilograms: 500,
      bags: 10,
      supplier: 'Mbale Coffee Growers',
      status: 'quality_review',
      batchNumber: 'B2024071201'
    }
  ]);

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    origin: '',
    openingBalance: 0
  });

  const [newRecord, setNewRecord] = useState({
    coffeeType: '',
    date: new Date().toISOString().split('T')[0],
    kilograms: 0,
    bags: 0,
    supplier: ''
  });

  const generateSupplierCode = () => {
    const nextNumber = suppliers.length + 1;
    return `GPCS${nextNumber.toString().padStart(4, '0')}`;
  };

  const handleSaveSupplier = () => {
    if (!newSupplier.name || !newSupplier.origin) return;

    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplier.name,
      code: generateSupplierCode(),
      phone: newSupplier.phone || undefined,
      origin: newSupplier.origin,
      openingBalance: newSupplier.openingBalance,
      dateRegistered: new Date().toISOString().split('T')[0]
    };

    setSuppliers([...suppliers, supplier]);
    setNewSupplier({ name: '', phone: '', origin: '', openingBalance: 0 });
  };

  const handleSubmitRecord = () => {
    if (!newRecord.coffeeType || !newRecord.supplier || newRecord.kilograms <= 0 || newRecord.bags <= 0) return;

    const record: CoffeeRecord = {
      id: Date.now().toString(),
      coffeeType: newRecord.coffeeType,
      date: newRecord.date,
      kilograms: newRecord.kilograms,
      bags: newRecord.bags,
      supplier: newRecord.supplier,
      status: 'pending',
      batchNumber: `B${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${(coffeeRecords.length + 1).toString().padStart(2, '0')}`
    };

    setCoffeeRecords([...coffeeRecords, record]);
    setNewRecord({ coffeeType: '', date: new Date().toISOString().split('T')[0], kilograms: 0, bags: 0, supplier: '' });
  };

  const handleStatusUpdate = (recordId: string, newStatus: CoffeeRecord['status']) => {
    setCoffeeRecords(coffeeRecords.map(record => 
      record.id === recordId ? { ...record, status: newStatus } : record
    ));
  };

  const getStatusBadge = (status: CoffeeRecord['status']) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      quality_review: { label: 'Quality Review', variant: 'default' as const },
      pricing: { label: 'Pricing', variant: 'default' as const },
      batched: { label: 'Batched', variant: 'default' as const },
      drying: { label: 'Drying', variant: 'default' as const },
      sales: { label: 'Sales Ready', variant: 'default' as const },
      inventory: { label: 'In Inventory', variant: 'default' as const }
    };
    return statusConfig[status];
  };

  return (
    <Layout 
      title="Store Management" 
      subtitle="Manage suppliers and coffee inventory records"
    >
      <div className="space-y-6">
        <Tabs defaultValue="suppliers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suppliers">
              <Users className="h-4 w-4 mr-2" />
              Supplier Management
            </TabsTrigger>
            <TabsTrigger value="records">
              <Package className="h-4 w-4 mr-2" />
              Coffee Records
            </TabsTrigger>
            <TabsTrigger value="operations">
              <Scale className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-6">
            {/* Supplier Registration */}
            <Card>
              <CardHeader>
                <CardTitle>Register New Supplier</CardTitle>
                <CardDescription>Add a new coffee supplier to the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="supplier-name">Supplier Name *</Label>
                    <Input
                      id="supplier-name"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                      placeholder="Enter supplier name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier-code">Supplier Code (Auto)</Label>
                    <Input
                      id="supplier-code"
                      value={generateSupplierCode()}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier-phone">Phone Number (Optional)</Label>
                    <Input
                      id="supplier-phone"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                      placeholder="+256..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier-origin">Origin *</Label>
                    <Input
                      id="supplier-origin"
                      value={newSupplier.origin}
                      onChange={(e) => setNewSupplier({...newSupplier, origin: e.target.value})}
                      placeholder="e.g., Mount Elgon"
                    />
                  </div>
                  <div>
                    <Label htmlFor="opening-balance">Opening Balance (UGX)</Label>
                    <Input
                      id="opening-balance"
                      type="number"
                      value={newSupplier.openingBalance}
                      onChange={(e) => setNewSupplier({...newSupplier, openingBalance: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveSupplier} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Save Supplier
                </Button>
              </CardContent>
            </Card>

            {/* Suppliers List */}
            <Card>
              <CardHeader>
                <CardTitle>Registered Suppliers</CardTitle>
                <CardDescription>All suppliers registered in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Opening Balance</TableHead>
                      <TableHead>Date Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-mono">{supplier.code}</TableCell>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.origin}</TableCell>
                        <TableCell>{supplier.phone || 'N/A'}</TableCell>
                        <TableCell>UGX {supplier.openingBalance.toLocaleString()}</TableCell>
                        <TableCell>{supplier.dateRegistered}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            {/* Coffee Record Entry */}
            <Card>
              <CardHeader>
                <CardTitle>Record Coffee Delivery</CardTitle>
                <CardDescription>Register new coffee deliveries from suppliers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="coffee-type">Coffee Type *</Label>
                    <Select value={newRecord.coffeeType} onValueChange={(value) => setNewRecord({...newRecord, coffeeType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select coffee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Drugar">Drugar</SelectItem>
                        <SelectItem value="Wugar">Wugar</SelectItem>
                        <SelectItem value="Robusta">Robusta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="delivery-date">Date *</Label>
                    <Input
                      id="delivery-date"
                      type="date"
                      value={newRecord.date}
                      onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kilograms">Kilograms Weighed *</Label>
                    <Input
                      id="kilograms"
                      type="number"
                      value={newRecord.kilograms}
                      onChange={(e) => setNewRecord({...newRecord, kilograms: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bags">Number of Bags *</Label>
                    <Input
                      id="bags"
                      type="number"
                      value={newRecord.bags}
                      onChange={(e) => setNewRecord({...newRecord, bags: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="record-supplier">Select Supplier *</Label>
                    <Select value={newRecord.supplier} onValueChange={(value) => setNewRecord({...newRecord, supplier: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name} ({supplier.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSubmitRecord} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Record
                </Button>
              </CardContent>
            </Card>

            {/* Coffee Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>Coffee Records</CardTitle>
                <CardDescription>All coffee deliveries and their processing status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Kilograms</TableHead>
                      <TableHead>Bags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coffeeRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono">{record.batchNumber}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.coffeeType}</TableCell>
                        <TableCell>{record.supplier}</TableCell>
                        <TableCell>{record.kilograms.toLocaleString()} kg</TableCell>
                        <TableCell>{record.bags}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(record.status).variant}>
                            {getStatusBadge(record.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {record.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusUpdate(record.id, 'quality_review')}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                To Quality
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Truck className="h-4 w-4 mr-2" />
                    Dispatch to Dryers
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Dispatch to Sales
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    Update Inventory
                  </Button>
                </CardContent>
              </Card>

              {/* Today's Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Today's Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Received:</span>
                      <span className="font-medium">500 kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Bags:</span>
                      <span className="font-medium">10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Suppliers:</span>
                      <span className="font-medium">1</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Quality Review:</span>
                      <Badge variant="secondary">1</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Awaiting Pricing:</span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ready for Dispatch:</span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Store;
