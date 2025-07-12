import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Users, Scale, Send, Truck, ShoppingCart, Factory, DollarSign } from "lucide-react";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useQualityControl } from "@/hooks/useQualityControl";
import { toast } from "sonner";
import PriceTicker from "@/components/PriceTicker";
import PricingGuidance from "@/components/PricingGuidance";

const Store = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'suppliers';
  
  const {
    coffeeRecords,
    loading: storeLoading,
    addCoffeeRecord,
    updateCoffeeRecordStatus,
    todaysSummary,
    pendingActions
  } = useStoreManagement();

  const {
    suppliers,
    loading: suppliersLoading,
    addSupplier
  } = useSuppliers();

  const {
    qualityAssessments,
    loading: qualityLoading
  } = useQualityControl();

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    origin: '',
    opening_balance: 0
  });

  const [newRecord, setNewRecord] = useState({
    coffeeType: '',
    date: new Date().toISOString().split('T')[0],
    kilograms: 0,
    bags: 0,
    supplierName: '',
    batchNumber: `BATCH${Date.now()}`,
    status: 'pending'
  });

  const [transferData, setTransferData] = useState({
    batchNumber: '',
    destination: 'Drying Facility A',
    transferredBy: '',
    notes: ''
  });

  const [dispatchData, setDispatchData] = useState({
    batchNumber: '',
    weight: 0,
    truckNumber: '',
    approvedByQuality: '',
    approvedByManager: '',
    destination: '',
    notes: ''
  });

  const [submittingSupplier, setSubmittingSupplier] = useState(false);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  const [activeTab, setActiveTab] = useState(initialTab);

  const loading = storeLoading || suppliersLoading || qualityLoading;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['suppliers', 'records', 'operations', 'pricing'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
    if (!newRecord.coffeeType || !newRecord.supplierName || newRecord.kilograms <= 0 || newRecord.bags <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmittingRecord(true);
    try {
      await addCoffeeRecord({
        ...newRecord,
        batchNumber: `BATCH${Date.now()}`
      });
      setNewRecord({ 
        coffeeType: '', 
        date: new Date().toISOString().split('T')[0], 
        kilograms: 0, 
        bags: 0, 
        supplierName: '',
        batchNumber: '',
        status: 'pending'
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

  const handleTransferToDrier = async () => {
    if (!transferData.batchNumber || !transferData.transferredBy) {
      toast.error("Please fill in required fields");
      return;
    }

    setSubmittingTransfer(true);
    try {
      const record = coffeeRecords.find(r => r.batchNumber === transferData.batchNumber);
      if (!record) {
        toast.error("Batch not found");
        return;
      }

      // Check if batch has quality assessment
      const hasQualityAssessment = qualityAssessments.some(qa => qa.batch_number === transferData.batchNumber);
      if (!hasQualityAssessment) {
        toast.error("Batch must have quality assessment before transfer to drier");
        return;
      }

      await updateCoffeeRecordStatus(record.id, 'drying');
      setTransferData({ batchNumber: '', destination: 'Drying Facility A', transferredBy: '', notes: '' });
      toast.success("Coffee transferred to drier successfully");
    } catch (error) {
      toast.error("Failed to transfer coffee to drier");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleDispatchForSale = async () => {
    if (!dispatchData.batchNumber || !dispatchData.weight || !dispatchData.truckNumber || 
        !dispatchData.approvedByQuality || !dispatchData.approvedByManager) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmittingDispatch(true);
    try {
      const record = coffeeRecords.find(r => r.batchNumber === dispatchData.batchNumber);
      if (!record) {
        toast.error("Batch not found");
        return;
      }

      // Check if batch has quality assessment and pricing
      const qualityAssessment = qualityAssessments.find(qa => qa.batch_number === dispatchData.batchNumber);
      if (!qualityAssessment) {
        toast.error("Batch must have quality assessment and pricing before dispatch");
        return;
      }

      await updateCoffeeRecordStatus(record.id, 'sales');
      setDispatchData({ 
        batchNumber: '', weight: 0, truckNumber: '', approvedByQuality: '', 
        approvedByManager: '', destination: '', notes: '' 
      });
      toast.success("Coffee dispatched for sale successfully");
    } catch (error) {
      toast.error("Failed to dispatch coffee for sale");
    } finally {
      setSubmittingDispatch(false);
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

  const getAssessedRecords = () => {
    return coffeeRecords.filter(record => 
      qualityAssessments.some(qa => qa.batch_number === record.batchNumber)
    );
  };

  const getQualityApprovedRecords = () => {
    return coffeeRecords.filter(record => 
      qualityAssessments.some(qa => qa.batch_number === record.batchNumber && qa.status === 'approved')
    );
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
        <PriceTicker />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suppliers">
              <Users className="h-4 w-4 mr-2" />
              Supplier Management
            </TabsTrigger>
            <TabsTrigger value="records">
              <Package className="h-4 w-4 mr-2" />
              Coffee Records
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing & Assessment
            </TabsTrigger>
            <TabsTrigger value="operations">
              <Scale className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-6">
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
                    <Select value={newRecord.supplierName} onValueChange={(value) => setNewRecord({...newRecord, supplierName: value})}>
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
                          <SelectItem value="no-suppliers" disabled>No suppliers available</SelectItem>
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
                          <TableCell className="font-mono">{record.batchNumber}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.coffeeType}</TableCell>
                          <TableCell>{record.supplierName}</TableCell>
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

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Quality Assessment View</CardTitle>
                <CardDescription>View pricing information for assessed coffee batches</CardDescription>
              </CardHeader>
              <CardContent>
                {getAssessedRecords().length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Suggested Price (UGX/kg)</TableHead>
                        <TableHead>Total Value (UGX)</TableHead>
                        <TableHead>Quality Status</TableHead>
                        <TableHead>Assessment Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getAssessedRecords().map((record) => {
                        const assessment = qualityAssessments.find(qa => qa.batch_number === record.batchNumber);
                        const totalValue = assessment ? (assessment.suggested_price * record.kilograms) : 0;
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-mono">{record.batchNumber}</TableCell>
                            <TableCell>{record.coffeeType}</TableCell>
                            <TableCell>{record.supplierName}</TableCell>
                            <TableCell>{Number(record.kilograms).toLocaleString()} kg</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              UGX {assessment ? Number(assessment.suggested_price).toLocaleString() : 'N/A'}
                            </TableCell>
                            <TableCell className="font-semibold">
                              UGX {totalValue.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={assessment?.status === 'approved' ? 'default' : 'secondary'}>
                                {assessment?.status === 'approved' ? 'Approved' : 'Assessed'}
                              </Badge>
                            </TableCell>
                            <TableCell>{assessment?.date_assessed}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No assessed batches with pricing yet</p>
                    <p className="text-sm">Batches will appear here after quality assessment and pricing</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {getAssessedRecords().length > 0 && (
              <PricingGuidance 
                coffeeType={getAssessedRecords()[0]?.coffeeType || 'Drugar'}
                suggestedPrice={qualityAssessments.find(qa => qa.batch_number === getAssessedRecords()[0]?.batchNumber)?.suggested_price || 0}
              />
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transfer to Drier */}
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Coffee to Drier</CardTitle>
                  <CardDescription>Transfer quality-approved batches to drying facility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="transfer-batch">Select Batch *</Label>
                    <Select value={transferData.batchNumber} onValueChange={(value) => setTransferData({...transferData, batchNumber: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch for transfer" />
                      </SelectTrigger>
                      <SelectContent>
                        {getQualityApprovedRecords().map((record) => (
                          <SelectItem key={record.id} value={record.batchNumber}>
                            {record.batchNumber} - {record.coffeeType} ({record.kilograms}kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="drying-destination">Destination *</Label>
                    <Select value={transferData.destination} onValueChange={(value) => setTransferData({...transferData, destination: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select drying facility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Drying Facility A">Drying Facility A</SelectItem>
                        <SelectItem value="Drying Facility B">Drying Facility B</SelectItem>
                        <SelectItem value="Main Drying Unit">Main Drying Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="transferred-by">Transferred By *</Label>
                    <Input
                      id="transferred-by"
                      value={transferData.transferredBy}
                      onChange={(e) => setTransferData({...transferData, transferredBy: e.target.value})}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transfer-notes">Notes (Optional)</Label>
                    <Input
                      id="transfer-notes"
                      value={transferData.notes}
                      onChange={(e) => setTransferData({...transferData, notes: e.target.value})}
                      placeholder="Additional notes"
                    />
                  </div>
                  <Button 
                    onClick={handleTransferToDrier}
                    className="w-full"
                    disabled={submittingTransfer}
                  >
                    <Factory className="h-4 w-4 mr-2" />
                    {submittingTransfer ? "Transferring..." : "Transfer to Drier"}
                  </Button>
                </CardContent>
              </Card>

              {/* Dispatch for Sale */}
              <Card>
                <CardHeader>
                  <CardTitle>Dispatch for Sale</CardTitle>
                  <CardDescription>Dispatch processed coffee for sale with approvals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dispatch-batch">Select Batch *</Label>
                    <Select value={dispatchData.batchNumber} onValueChange={(value) => setDispatchData({...dispatchData, batchNumber: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch for dispatch" />
                      </SelectTrigger>
                      <SelectContent>
                        {getQualityApprovedRecords().map((record) => (
                          <SelectItem key={record.id} value={record.batchNumber}>
                            {record.batchNumber} - {record.coffeeType} ({record.kilograms}kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dispatch-weight">Weight (kg) *</Label>
                      <Input
                        id="dispatch-weight"
                        type="number"
                        value={dispatchData.weight}
                        onChange={(e) => setDispatchData({...dispatchData, weight: Number(e.target.value)})}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="truck-number">Truck Number *</Label>
                      <Input
                        id="truck-number"
                        value={dispatchData.truckNumber}
                        onChange={(e) => setDispatchData({...dispatchData, truckNumber: e.target.value})}
                        placeholder="e.g., UBE 001A"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="quality-approval">Approved by Quality *</Label>
                    <Input
                      id="quality-approval"
                      value={dispatchData.approvedByQuality}
                      onChange={(e) => setDispatchData({...dispatchData, approvedByQuality: e.target.value})}
                      placeholder="Quality control officer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manager-approval">Approved by Manager *</Label>
                    <Input
                      id="manager-approval"
                      value={dispatchData.approvedByManager}
                      onChange={(e) => setDispatchData({...dispatchData, approvedByManager: e.target.value})}
                      placeholder="Manager name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dispatch-destination">Destination</Label>
                    <Input
                      id="dispatch-destination"
                      value={dispatchData.destination}
                      onChange={(e) => setDispatchData({...dispatchData, destination: e.target.value})}
                      placeholder="Destination location"
                    />
                  </div>
                  <Button 
                    onClick={handleDispatchForSale}
                    className="w-full"
                    disabled={submittingDispatch}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {submittingDispatch ? "Dispatching..." : "Dispatch for Sale"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
