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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, Users, Scale, Send, Truck, ShoppingCart, Factory, DollarSign, Edit, Trash2, AlertTriangle, FileText, Printer } from "lucide-react";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useQualityControl } from "@/hooks/useQualityControl";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import PriceTicker from "@/components/PriceTicker";
import PricingGuidance from "@/components/PricingGuidance";
import EUDRDocumentation from "@/components/store/EUDRDocumentation";
import GRNPrintModal from "@/components/quality/GRNPrintModal";

const Store = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'records';
  
  const {
    coffeeRecords,
    loading: storeLoading,
    addCoffeeRecord,
    updateCoffeeRecordStatus,
    updateCoffeeRecord,
    deleteCoffeeRecord
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
  const { hasPermission } = useAuth();

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    origin: '',
    opening_balance: 0
  });

  const [newRecord, setNewRecord] = useState({
    coffeeType: '',
    date: new Date().toISOString().split('T')[0],
    kilograms: '',
    bags: '',
    supplierName: '',
    batchNumber: `BATCH${Date.now()}`,
    status: 'pending'
  });

  const [submittingSupplier, setSubmittingSupplier] = useState(false);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    coffeeType: '',
    date: '',
    kilograms: '',
    bags: '',
    supplierName: '',
    batchNumber: ''
  });

  // Modal states
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [selectedGRNData, setSelectedGRNData] = useState(null);

  const loading = storeLoading || suppliersLoading || qualityLoading;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['records', 'eudr', 'pricing', 'operations', 'suppliers'].includes(tab)) {
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
    if (!newRecord.coffeeType || !newRecord.supplierName || !newRecord.kilograms || !newRecord.bags || 
        Number(newRecord.kilograms) <= 0 || Number(newRecord.bags) <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmittingRecord(true);
    try {
      await addCoffeeRecord({
        ...newRecord,
        kilograms: Number(newRecord.kilograms),
        bags: Number(newRecord.bags),
        batchNumber: `BATCH${Date.now()}`
      });
      setNewRecord({ 
        coffeeType: '', 
        date: new Date().toISOString().split('T')[0], 
        kilograms: '', 
        bags: '', 
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

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setEditFormData({
      coffeeType: record.coffeeType,
      date: record.date,
      kilograms: record.kilograms.toString(),
      bags: record.bags.toString(),
      supplierName: record.supplierName,
      batchNumber: record.batchNumber
    });
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;

    try {
      await updateCoffeeRecord(editingRecord.id, {
        ...editFormData,
        kilograms: Number(editFormData.kilograms),
        bags: Number(editFormData.bags)
      });
      setEditingRecord(null);
      toast.success("Record updated successfully");
    } catch (error) {
      toast.error("Failed to update record");
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await deleteCoffeeRecord(recordId);
      toast.success("Record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  const canEditOrDelete = (record) => {
    return record.status !== 'sales' && record.status !== 'paid';
  };

  const handlePrintGRN = (record) => {
    // Find quality assessment for this record
    const qualityAssessment = qualityAssessments.find(qa => qa.batch_number === record.batchNumber);
    
    const grnData = {
      grnNumber: record.batchNumber,
      supplierName: record.supplierName,
      coffeeType: record.coffeeType,
      qualityAssessment: qualityAssessment ? 'Assessed' : 'Pending Assessment',
      numberOfBags: record.bags,
      totalKgs: record.kilograms,
      unitPrice: qualityAssessment?.suggested_price || 0,
      assessedBy: qualityAssessment?.assessed_by || 'N/A',
      createdAt: record.date,
      moisture: qualityAssessment?.moisture,
      group1_defects: qualityAssessment?.group1_defects,
      group2_defects: qualityAssessment?.group2_defects,
      below12: qualityAssessment?.below12,
      pods: qualityAssessment?.pods,
      husks: qualityAssessment?.husks,
      stones: qualityAssessment?.stones
    };
    
    setSelectedGRNData(grnData);
    setShowGRNModal(true);
  };

  const handlePrintAllRecords = () => {
    const printContent = coffeeRecords.map(record => {
      const qualityAssessment = qualityAssessments.find(qa => qa.batch_number === record.batchNumber);
      return {
        ...record,
        qualityAssessment,
        unitPrice: qualityAssessment?.suggested_price || 0,
        totalAmount: (qualityAssessment?.suggested_price || 0) * record.kilograms
      };
    });

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Coffee Records - Great Pearl Coffee Factory</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">GREAT PEARL COFFEE FACTORY</div>
            <div>Coffee Records Report - ${new Date().toLocaleDateString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Date</th>
                <th>Coffee Type</th>
                <th>Supplier</th>
                <th>Bags</th>
                <th>Kilograms</th>
                <th>Unit Price (UGX)</th>
                <th>Total Amount (UGX)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${printContent.map(record => `
                <tr>
                  <td>${record.batchNumber}</td>
                  <td>${record.date}</td>
                  <td>${record.coffeeType}</td>
                  <td>${record.supplierName}</td>
                  <td>${record.bags}</td>
                  <td>${record.kilograms.toLocaleString()}kg</td>
                  <td>${record.unitPrice.toLocaleString()}</td>
                  <td>${record.totalAmount.toLocaleString()}</td>
                  <td>${record.status}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">TOTALS</td>
                <td>${printContent.reduce((sum, r) => sum + r.bags, 0)}</td>
                <td>${printContent.reduce((sum, r) => sum + r.kilograms, 0).toLocaleString()}kg</td>
                <td>-</td>
                <td>${printContent.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!hasPermission('Store Management')) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Package className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access Store Management.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="records">
              <Package className="h-4 w-4 mr-2" />
              Coffee Records
            </TabsTrigger>
            <TabsTrigger value="eudr">
              <FileText className="h-4 w-4 mr-2" />
              EUDR Documentation
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing & Assessment
            </TabsTrigger>
            <TabsTrigger value="operations">
              <Scale className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              <Users className="h-4 w-4 mr-2" />
              Supplier Management
            </TabsTrigger>
          </TabsList>

          {/* Coffee Records Tab */}
          <TabsContent value="records" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Coffee Records</CardTitle>
                    <CardDescription>
                      {coffeeRecords.length > 0 
                        ? `${coffeeRecords.length} coffee delivery records in the system` 
                        : "No coffee records yet. Add your first delivery record below."
                      }
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowAddRecordModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Coffee Delivery Record
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handlePrintAllRecords}
                      disabled={coffeeRecords.length === 0}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print All Records
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {coffeeRecords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Coffee Type</TableHead>
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
                          <TableCell className="capitalize">{record.coffeeType}</TableCell>
                          <TableCell>{record.supplierName}</TableCell>
                          <TableCell>{Number(record.kilograms).toLocaleString()}kg</TableCell>
                          <TableCell>{record.bags}</TableCell>
                          <TableCell>
                            <Badge {...getStatusBadge(record.status)}>
                              {getStatusBadge(record.status).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintGRN(record)}
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                GRN
                              </Button>
                              {canEditOrDelete(record) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditRecord(record)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Coffee Record</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this coffee record? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteRecord(record.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
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
                    <p className="text-sm">Add your first coffee delivery record below</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          {/* EUDR Documentation Tab */}
          <TabsContent value="eudr" className="space-y-6">
            <EUDRDocumentation />
          </TabsContent>

          {/* Pricing & Assessment Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <PricingGuidance coffeeType="arabica" suggestedPrice={0} />
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Operations Management</CardTitle>
                <CardDescription>Transfer and dispatch operations for coffee processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Operations features coming soon</p>
                  <p className="text-sm">Transfer to drying, dispatch for sales, and more</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supplier Management Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Supplier Management</CardTitle>
                    <CardDescription>
                      {suppliers.length > 0 
                        ? `${suppliers.length} suppliers registered in the system` 
                        : "No suppliers registered yet. Add your first supplier below."
                      }
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Supplier
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Register New Supplier</DialogTitle>
                        <DialogDescription>
                          Add a new coffee supplier to the system
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
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
                            <Label htmlFor="supplier-phone">Phone Number</Label>
                            <Input
                              id="supplier-phone"
                              value={newSupplier.phone}
                              onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                              placeholder="+256..."
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleSaveSupplier} 
                          disabled={submittingSupplier}
                        >
                          {submittingSupplier ? "Saving..." : "Save Supplier"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
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
                    <p className="text-sm">Click "Add Supplier" to register your first supplier</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Record Modal */}
        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Coffee Record</DialogTitle>
              <DialogDescription>
                Update the coffee delivery record details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-coffee-type">Coffee Type</Label>
                  <Select value={editFormData.coffeeType} onValueChange={(value) => setEditFormData({...editFormData, coffeeType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arabica">Arabica</SelectItem>
                      <SelectItem value="robusta">Robusta</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-kilograms">Kilograms</Label>
                  <Input
                    id="edit-kilograms"
                    type="number"
                    value={editFormData.kilograms}
                    onChange={(e) => setEditFormData({...editFormData, kilograms: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-bags">Bags</Label>
                  <Input
                    id="edit-bags"
                    type="number"
                    value={editFormData.bags}
                    onChange={(e) => setEditFormData({...editFormData, bags: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-supplier">Supplier</Label>
                <Select value={editFormData.supplierName} onValueChange={(value) => setEditFormData({...editFormData, supplierName: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRecord}>
                Update Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Coffee Delivery Record Modal */}
        <Dialog open={showAddRecordModal} onOpenChange={setShowAddRecordModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Coffee Delivery Record</DialogTitle>
              <DialogDescription>
                Record new coffee delivery from suppliers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coffee-type">Coffee Type *</Label>
                  <Select value={newRecord.coffeeType} onValueChange={(value) => setNewRecord({...newRecord, coffeeType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coffee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arabica">Arabica</SelectItem>
                      <SelectItem value="robusta">Robusta</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplier-name">Supplier Name *</Label>
                  <Select value={newRecord.supplierName} onValueChange={(value) => setNewRecord({...newRecord, supplierName: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="delivery-date">Delivery Date *</Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={newRecord.date}
                    onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="kilograms">Kilograms *</Label>
                  <Input
                    id="kilograms"
                    type="number"
                    value={newRecord.kilograms}
                    onChange={(e) => setNewRecord({...newRecord, kilograms: e.target.value})}
                    placeholder="Enter weight in kg"
                  />
                </div>
                <div>
                  <Label htmlFor="bags">Number of Bags *</Label>
                  <Input
                    id="bags"
                    type="number"
                    value={newRecord.bags}
                    onChange={(e) => setNewRecord({...newRecord, bags: e.target.value})}
                    placeholder="Enter number of bags"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddRecordModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  await handleSubmitRecord();
                  if (!submittingRecord) {
                    setShowAddRecordModal(false);
                  }
                }}
                disabled={submittingRecord}
              >
                <Plus className="h-4 w-4 mr-2" />
                {submittingRecord ? "Saving..." : "Add Coffee Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GRN Print Modal */}
        <GRNPrintModal 
          open={showGRNModal}
          onClose={() => setShowGRNModal(false)}
          grnData={selectedGRNData}
        />
      </div>
    </Layout>
  );
};

export default Store;