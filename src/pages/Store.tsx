
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Users, Scale, Send, Truck, ShoppingCart } from "lucide-react";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { toast } from "sonner";

const Store = () => {
  const {
    suppliers,
    coffeeRecords,
    loading,
    addSupplier,
    addCoffeeRecord,
    updateCoffeeRecordStatus,
    todaysSummary,
    pendingActions
  } = useStoreManagement();

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    origin: '',
    opening_balance: 0
  });

  const [newRecord, setNewRecord] = useState({
    coffee_type: '',
    date: new Date().toISOString().split('T')[0],
    kilograms: 0,
    bags: 0,
    supplier_name: ''
  });

  const [submittingSupplier, setSubmittingSupplier] = useState(false);
  const [submittingRecord, setSubmittingRecord] = useState(false);

  const handleSaveSupplier = async () => {
    if (!newSupplier.name || !newSupplier.origin) {
      toast.error("Please fill in required fields");
      return;
    }

    setSubmittingSupplier(true);
    try {
      await addSupplier(newSupplier);
      setNewSupplier({ name: '', phone: '', origin: '', opening_balance: 0 });
      toast.success("Supplier registered successfully");
    } catch (error) {
      toast.error("Failed to register supplier");
    } finally {
      setSubmittingSupplier(false);
    }
  };

  const handleSubmitRecord = async () => {
    if (!newRecord.coffee_type || !newRecord.supplier_name || newRecord.kilograms <= 0 || newRecord.bags <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmittingRecord(true);
    try {
      await addCoffeeRecord(newRecord);
      setNewRecord({ 
        coffee_type: '', 
        date: new Date().toISOString().split('T')[0], 
        kilograms: 0, 
        bags: 0, 
        supplier_name: '' 
      });
      toast.success("Coffee record submitted successfully");
    } catch (error) {
      toast.error("Failed to submit coffee record");
    } finally {
      setSubmittingRecord(false);
    }
  };

  const handleStatusUpdate = async (recordId: string, newStatus: any) => {
    try {
      await updateCoffeeRecordStatus(recordId, newStatus);
      toast.success("Status updated successfully");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: any) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      quality_review: { label: 'Quality Review', variant: 'default' as const },
      pricing: { label: 'Pricing', variant: 'default' as const },
      batched: { label: 'Batched', variant: 'default' as const },
      drying: { label: 'Drying', variant: 'default' as const },
      sales: { label: 'Sales Ready', variant: 'default' as const },
      inventory: { label: 'In Inventory', variant: 'default' as const }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  if (loading) {
    return (
      <Layout title="Store Management" subtitle="Manage suppliers and coffee inventory records">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading store data...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
                      value={newSupplier.opening_balance}
                      onChange={(e) => setNewSupplier({...newSupplier, opening_balance: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveSupplier} 
                  className="w-full md:w-auto"
                  disabled={submittingSupplier}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {submittingSupplier ? "Saving..." : "Save Supplier"}
                </Button>
              </CardContent>
            </Card>

            {/* Suppliers List */}
            <Card>
              <CardHeader>
                <CardTitle>Registered Suppliers</CardTitle>
                <CardDescription>
                  {suppliers.length > 0 
                    ? `${suppliers.length} suppliers registered in the system` 
                    : "No suppliers registered yet. Add your first supplier above."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suppliers.length > 0 ? (
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
                          <TableCell>UGX {Number(supplier.opening_balance).toLocaleString()}</TableCell>
                          <TableCell>{supplier.date_registered}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No suppliers registered yet</p>
                    <p className="text-sm">Add your first supplier using the form above</p>
                  </div>
                )}
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
                    <Select value={newRecord.coffee_type} onValueChange={(value) => setNewRecord({...newRecord, coffee_type: value})}>
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
                    <Select value={newRecord.supplier_name} onValueChange={(value) => setNewRecord({...newRecord, supplier_name: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.length > 0 ? (
                          suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.name}>
                              {supplier.name} ({supplier.code})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>No suppliers available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={handleSubmitRecord} 
                  className="w-full md:w-auto"
                  disabled={suppliers.length === 0 || submittingRecord}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {submittingRecord ? "Submitting..." : "Submit Record"}
                </Button>
                {suppliers.length === 0 && (
                  <p className="text-sm text-amber-600">Please register a supplier first before recording deliveries.</p>
                )}
              </CardContent>
            </Card>

            {/* Coffee Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>Coffee Records</CardTitle>
                <CardDescription>
                  {coffeeRecords.length > 0 
                    ? `${coffeeRecords.length} coffee delivery records` 
                    : "No coffee records yet. Record your first delivery above."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {coffeeRecords.length > 0 ? (
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
                          <TableCell className="font-mono">{record.batch_number}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.coffee_type}</TableCell>
                          <TableCell>{record.supplier_name}</TableCell>
                          <TableCell>{Number(record.kilograms).toLocaleString()} kg</TableCell>
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No coffee records yet</p>
                    <p className="text-sm">Record your first delivery using the form above</p>
                  </div>
                )}
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
                      <span className="font-medium">{todaysSummary.totalReceived} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Bags:</span>
                      <span className="font-medium">{todaysSummary.totalBags}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Suppliers:</span>
                      <span className="font-medium">{todaysSummary.activeSuppliers}</span>
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
                      <Badge variant="secondary">{pendingActions.qualityReview}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Awaiting Pricing:</span>
                      <Badge variant="secondary">{pendingActions.awaitingPricing}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ready for Dispatch:</span>
                      <Badge variant="secondary">{pendingActions.readyForDispatch}</Badge>
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
