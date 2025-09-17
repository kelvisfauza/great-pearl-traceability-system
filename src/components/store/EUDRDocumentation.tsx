import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, DollarSign, Package, AlertTriangle, CheckCircle, Clock, Layers, BarChart3, Calendar, Printer, Download, Eye } from 'lucide-react';
import { useEUDRDocumentation } from '@/hooks/useEUDRDocumentation';
import { toast } from 'sonner';
import EUDRReportPrint from './EUDRReportPrint';

const EUDRDocumentation = () => {
  const {
    eudrDocuments,
    eudrBatches,
    eudrSales,
    loading,
    addEUDRDocument,
    updateBatchReceipts,
    createEUDRSale,
    getTotalAvailableKilograms,
    getTotalDocumentedKilograms,
    getTotalSoldKilograms,
    getDocumentsByStatus,
    getBatchesForDocument,
    getSalesForBatch,
    getAvailableBatches
  } = useEUDRDocumentation();

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [submittingDocument, setSubmittingDocument] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [reportType, setReportType] = useState('daily');
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const [newDocument, setNewDocument] = useState({
    coffee_type: '',
    total_kilograms: 0,
    total_bulked_coffee: 0,
    total_receipts: 0,
    batch_number: '',
    documentation_notes: ''
  });

  const [newSale, setNewSale] = useState({
    kilograms: 0,
    sold_to: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_price: 0,
    coffee_type: ''
  });

  const [receiptData, setReceiptData] = useState({
    receipts: ['']
  });

  const handleAddReceipt = () => {
    setReceiptData({
      receipts: [...(receiptData.receipts || []), '']
    });
  };

  const handleRemoveReceipt = (index: number) => {
    const updatedReceipts = (receiptData.receipts || []).filter((_, i) => i !== index);
    setReceiptData({
      receipts: updatedReceipts.length > 0 ? updatedReceipts : ['']
    });
  };

  const handleReceiptChange = (index: number, value: string) => {
    const updatedReceipts = [...(receiptData.receipts || [])];
    updatedReceipts[index] = value;
    setReceiptData({
      receipts: updatedReceipts
    });
  };

  const handleSubmitDocument = async () => {
    if (!newDocument.coffee_type || newDocument.total_kilograms <= 0 || newDocument.total_bulked_coffee <= 0 || newDocument.total_receipts <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingDocument(true);
    try {
      await addEUDRDocument({
        ...newDocument,
        batch_number: newDocument.batch_number || `EUDR${Date.now()}`
      });

      setNewDocument({
        coffee_type: '',
        total_kilograms: 0,
        total_bulked_coffee: 0,
        total_receipts: 0,
        batch_number: '',
        documentation_notes: ''
      });
      setShowDocumentModal(false);
    } catch (error) {
      console.error('Error submitting document:', error);
    } finally {
      setSubmittingDocument(false);
    }
  };

  const handleSubmitSale = async () => {
    if (newSale.kilograms <= 0 || !newSale.sold_to || newSale.sale_price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const totalAvailable = getTotalAvailableKilograms();
    if (newSale.kilograms > totalAvailable) {
      toast.error(`Only ${totalAvailable}kg available for sale`);
      return;
    }

    setSubmittingSale(true);
    try {
      await createEUDRSale(newSale);
      setNewSale({
        kilograms: 0,
        sold_to: '',
        sale_date: new Date().toISOString().split('T')[0],
        sale_price: 0,
        coffee_type: ''
      });
      setShowSaleModal(false);
    } catch (error) {
      console.error('Error submitting sale:', error);
    } finally {
      setSubmittingSale(false);
    }
  };

  const handleUpdateReceipts = async () => {
    if (!selectedBatch) return;
    
    const validReceipts = (receiptData.receipts || []).filter(receipt => receipt.trim() !== '');
    if (validReceipts.length === 0) {
      toast.error('Please add at least one receipt reference');
      return;
    }

    try {
      await updateBatchReceipts(selectedBatch.id, validReceipts);
      setShowReceiptModal(false);
      setSelectedBatch(null);
      setReceiptData({ receipts: [''] });
    } catch (error) {
      console.error('Error updating receipts:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'documented':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Documented</Badge>;
      case 'partially_sold':
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Partially Sold</Badge>;
      case 'sold_out':
        return <Badge variant="outline"><Package className="h-3 w-3 mr-1" />Sold Out</Badge>;
      case 'available':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openSaleModal = () => {
    setShowSaleModal(true);
  };

  const openReceiptModal = (batch: any) => {
    setSelectedBatch(batch);
    setReceiptData({
      receipts: (batch.receipts && batch.receipts.length > 0) ? batch.receipts : ['']
    });
    setShowReceiptModal(true);
  };

  const generateReport = () => {
    setGeneratingReport(true);
    
    // Set date range based on report type
    const today = new Date();
    let startDate = reportStartDate;
    let endDate = reportEndDate;
    
    switch (reportType) {
      case 'daily':
        startDate = today.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
    }
    
    setReportStartDate(startDate);
    setReportEndDate(endDate);
    
    // Simulate report generation
    setTimeout(() => {
      setGeneratingReport(false);
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully`);
    }, 1000);
  };

  const exportToCSV = () => {
    const csvData = [
      ['EUDR Documentation Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Report Type:', reportType],
      ['Date Range:', `${reportStartDate} to ${reportEndDate}`],
      [''],
      ['Summary Metrics'],
      ['Total Documented (kg)', getTotalDocumentedKilograms()],
      ['Available Stock (kg)', getTotalAvailableKilograms()],
      ['Total Sold (kg)', getTotalSoldKilograms()],
      ['Active Batches', getAvailableBatches().length],
      [''],
      ['Documentation Details'],
      ['Date', 'Batch Number', 'Coffee Type', 'Total KG', 'Bulked KG', 'Receipts', 'Status'],
      ...eudrDocuments.map(doc => [
        doc.date,
        doc.batch_number,
        doc.coffee_type,
        doc.total_kilograms,
        doc.total_bulked_coffee || 0,
        doc.total_receipts,
        doc.status
      ]),
      [''],
      ['Sales Details'],
      ['Sale Date', 'Customer', 'Batch', 'Coffee Type', 'Kilograms', 'Price (UGX)', 'Total Value'],
      ...eudrSales.map(sale => [
        sale.sale_date,
        sale.sold_to,
        sale.batch_identifier,
        sale.coffee_type,
        sale.kilograms,
        sale.sale_price,
        sale.kilograms * sale.sale_price
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EUDR_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Report exported to CSV successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading EUDR documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documented</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalDocumentedKilograms().toLocaleString()}kg</div>
            <p className="text-xs text-muted-foreground">
              {eudrDocuments.length} document{eudrDocuments.length !== 1 ? 's' : ''} • {eudrBatches.length} batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalAvailableKilograms().toLocaleString()}kg</div>
            <p className="text-xs text-muted-foreground">
              {(getAvailableBatches() || []).length} batches available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalSoldKilograms().toLocaleString()}kg</div>
            <p className="text-xs text-muted-foreground">
              {eudrSales.length} sale{eudrSales.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentation Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eudrDocuments.length > 0 ? Math.round((getTotalDocumentedKilograms() / (getTotalDocumentedKilograms() + getTotalSoldKilograms() || 1)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Compliance rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add EUDR Documentation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add EUDR Documentation</DialogTitle>
              <DialogDescription>
                Document coffee with proper EUDR compliance. Batches of 5 tonnes will be created automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coffee-type">Coffee Type *</Label>
                  <Select value={newDocument.coffee_type} onValueChange={(value) => setNewDocument({...newDocument, coffee_type: value})}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-kg">Total Kilograms *</Label>
                  <Input
                    id="total-kg"
                    type="number"
                    value={newDocument.total_kilograms}
                    onChange={(e) => setNewDocument({...newDocument, total_kilograms: Number(e.target.value)})}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will create {Math.ceil(newDocument.total_kilograms / 5000)} batch{Math.ceil(newDocument.total_kilograms / 5000) !== 1 ? 'es' : ''} of 5 tonnes each
                  </p>
                </div>
                <div>
                  <Label htmlFor="total-bulked">Total Bulked Coffee (kg) *</Label>
                  <Input
                    id="total-bulked"
                    type="number"
                    value={newDocument.total_bulked_coffee}
                    onChange={(e) => setNewDocument({...newDocument, total_bulked_coffee: Number(e.target.value)})}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Weight after hulling/processing
                  </p>
                </div>
              </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-receipts">Total Traceable Receipts *</Label>
                  <Input
                    id="total-receipts"
                    type="number"
                    value={newDocument.total_receipts}
                    onChange={(e) => setNewDocument({...newDocument, total_receipts: Number(e.target.value)})}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of receipts (actual receipt references added per batch later)
                  </p>
                </div>
                <div>
                  <Label htmlFor="batch">Batch Number</Label>
                  <Input
                    id="batch"
                    value={newDocument.batch_number}
                    onChange={(e) => setNewDocument({...newDocument, batch_number: e.target.value})}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Documentation Notes</Label>
                <Textarea
                  id="notes"
                  value={newDocument.documentation_notes}
                  onChange={(e) => setNewDocument({...newDocument, documentation_notes: e.target.value})}
                  placeholder="Additional notes about documentation..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDocumentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitDocument} disabled={submittingDocument}>
                {submittingDocument ? 'Adding...' : 'Add Documentation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={getTotalAvailableKilograms() <= 0}>
              <DollarSign className="h-4 w-4 mr-2" />
              Create Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Sale</DialogTitle>
              <DialogDescription>
                Sale will be automatically allocated from available batches in order.
                Available: {getTotalAvailableKilograms().toLocaleString()}kg
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sale-kg">Kilograms to Sell *</Label>
                  <Input
                    id="sale-kg"
                    type="number"
                    value={newSale.kilograms}
                    onChange={(e) => setNewSale({...newSale, kilograms: Number(e.target.value)})}
                    placeholder="0"
                    max={getTotalAvailableKilograms()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {getTotalAvailableKilograms().toLocaleString()}kg available
                  </p>
                </div>
                <div>
                  <Label htmlFor="sale-price">Price per KG (UGX) *</Label>
                  <Input
                    id="sale-price"
                    type="number"
                    value={newSale.sale_price}
                    onChange={(e) => setNewSale({...newSale, sale_price: Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sold-to">Sold To *</Label>
                  <Input
                    id="sold-to"
                    value={newSale.sold_to}
                    onChange={(e) => setNewSale({...newSale, sold_to: e.target.value})}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="sale-date">Sale Date *</Label>
                  <Input
                    id="sale-date"
                    type="date"
                    value={newSale.sale_date}
                    onChange={(e) => setNewSale({...newSale, sale_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="coffee-type-filter">Coffee Type (Optional)</Label>
                <Select value={newSale.coffee_type} onValueChange={(value) => setNewSale({...newSale, coffee_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any coffee type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arabica">Arabica Only</SelectItem>
                    <SelectItem value="robusta">Robusta Only</SelectItem>
                    <SelectItem value="mixed">Mixed Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to auto-allocate from any available batches
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaleModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitSale} disabled={submittingSale}>
                {submittingSale ? 'Creating Sale...' : 'Create Sale'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batch Management Tabs */}
      <Tabs defaultValue="batches" className="w-full">
        <TabsList>
          <TabsTrigger value="batches">
            <Layers className="h-4 w-4 mr-2" />
            Batch Management
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Document Overview
          </TabsTrigger>
          <TabsTrigger value="sales">
            <DollarSign className="h-4 w-4 mr-2" />
            Sales History
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EUDR Coffee Batches (5 Tonnes Each)</CardTitle>
              <CardDescription>
                Manage individual batches and their receipt documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eudrBatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Coffee Type</TableHead>
                      <TableHead>Total KG</TableHead>
                      <TableHead>Available KG</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipts</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eudrBatches.map((batch) => {
                      const document = eudrDocuments.find(doc => doc.id === batch.document_id);
                      const sales = getSalesForBatch(batch.id);
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono">{batch.batch_identifier}</TableCell>
                          <TableCell className="capitalize">{document?.coffee_type}</TableCell>
                          <TableCell>{batch.kilograms.toLocaleString()}kg</TableCell>
                          <TableCell className="font-semibold">{batch.available_kilograms.toLocaleString()}kg</TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {(batch.receipts && batch.receipts.length > 0) ? (
                                <div>
                                  {batch.receipts.slice(0, 2).map((receipt, i) => (
                                    <div key={i} className="truncate max-w-[100px]">{receipt}</div>
                                  ))}
                                  {batch.receipts.length > 2 && (
                                    <div className="text-muted-foreground">+{batch.receipts.length - 2} more</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No receipts</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReceiptModal(batch)}
                              >
                                Add Receipts
                              </Button>
                            </div>
                            {(sales || []).length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {sales.length} sale{sales.length !== 1 ? 's' : ''} recorded
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No batches yet</p>
                  <p className="text-sm">Add EUDR documentation to create batches</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EUDR Document Overview</CardTitle>
              <CardDescription>
                Overall document status and batch breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eudrDocuments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Coffee Type</TableHead>
                      <TableHead>Total KG</TableHead>
                      <TableHead>Available KG</TableHead>
                      <TableHead>Batches</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eudrDocuments.map((doc) => {
                      const batches = getBatchesForDocument(doc.id) || [];
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-mono">{doc.batch_number}</TableCell>
                          <TableCell className="capitalize">{doc.coffee_type}</TableCell>
                          <TableCell>{doc.total_kilograms.toLocaleString()}kg</TableCell>
                          <TableCell className="font-semibold">{doc.available_kilograms.toLocaleString()}kg</TableCell>
                          <TableCell>{batches.length} batches</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No EUDR documentation yet</p>
                  <p className="text-sm">Add your first EUDR documentation using the button above</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>
                All sales from EUDR documented batches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eudrSales.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Kilograms</TableHead>
                      <TableHead>Price (UGX)</TableHead>
                      <TableHead>Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eudrSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.sale_date}</TableCell>
                        <TableCell className="font-mono">{sale.batch_identifier}</TableCell>
                        <TableCell>{sale.sold_to}</TableCell>
                        <TableCell>{sale.kilograms.toLocaleString()}kg</TableCell>
                        <TableCell>{sale.sale_price.toLocaleString()}</TableCell>
                        <TableCell>{sale.remaining_batch_kilograms.toLocaleString()}kg</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sales recorded yet</p>
                  <p className="text-sm">Create sales from available batches</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EUDR Compliance Reports</CardTitle>
              <CardDescription>
                Generate detailed reports on EUDR documentation, traceability, and sales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Report</SelectItem>
                      <SelectItem value="weekly">Weekly Report</SelectItem>
                      <SelectItem value="monthly">Monthly Report</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    disabled={reportType !== 'custom'}
                  />
                </div>

                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    disabled={reportType !== 'custom'}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => generateReport()}
                    disabled={generatingReport}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {generatingReport ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              </div>

              {/* Report Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Documented</p>
                        <p className="text-2xl font-bold text-blue-900">{getTotalDocumentedKilograms().toLocaleString()}kg</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Available Stock</p>
                        <p className="text-2xl font-bold text-green-900">{getTotalAvailableKilograms().toLocaleString()}kg</p>
                      </div>
                      <Package className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Total Sold</p>
                        <p className="text-2xl font-bold text-purple-900">{getTotalSoldKilograms().toLocaleString()}kg</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Active Batches</p>
                        <p className="text-2xl font-bold text-orange-900">{getAvailableBatches().length}</p>
                      </div>
                      <Layers className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Report Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Detailed Report Data</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPrintPreview(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview & Print Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportToCSV()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {/* Documentation Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Documentation Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Batch Number</TableHead>
                          <TableHead>Coffee Type</TableHead>
                          <TableHead>Total KG</TableHead>
                          <TableHead>Bulked KG</TableHead>
                          <TableHead>Receipts</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eudrDocuments.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>{doc.date}</TableCell>
                            <TableCell className="font-mono">{doc.batch_number}</TableCell>
                            <TableCell className="capitalize">{doc.coffee_type}</TableCell>
                            <TableCell>{doc.total_kilograms?.toLocaleString() || 0}kg</TableCell>
                            <TableCell>{doc.total_bulked_coffee?.toLocaleString() || 0}kg</TableCell>
                            <TableCell>{doc.total_receipts}</TableCell>
                            <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Sales Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sales Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sale Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Coffee Type</TableHead>
                          <TableHead>Kilograms</TableHead>
                          <TableHead>Price (UGX)</TableHead>
                          <TableHead>Total Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eudrSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>{sale.sale_date}</TableCell>
                            <TableCell>{sale.sold_to}</TableCell>
                            <TableCell className="font-mono">{sale.batch_identifier}</TableCell>
                            <TableCell className="capitalize">{sale.coffee_type}</TableCell>
                            <TableCell>{sale.kilograms.toLocaleString()}kg</TableCell>
                            <TableCell>{sale.sale_price.toLocaleString()}</TableCell>
                            <TableCell>{(sale.kilograms * sale.sale_price).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Compliance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">EUDR Compliance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Traceability Rate</h4>
                        <div className="text-2xl font-bold text-green-600">
                          {eudrDocuments.length > 0 ? '100%' : '0%'}
                        </div>
                        <p className="text-xs text-muted-foreground">All batches have EUDR documentation</p>
                      </div>
                      
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Documentation Coverage</h4>
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round((getTotalDocumentedKilograms() / Math.max(getTotalDocumentedKilograms() + getTotalSoldKilograms(), 1)) * 100)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Coffee with proper documentation</p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Sales Efficiency</h4>
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round((getTotalSoldKilograms() / Math.max(getTotalDocumentedKilograms(), 1)) * 100)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Documented coffee sold</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print Component */}
      <EUDRReportPrint
        reportType={reportType}
        startDate={reportStartDate}
        endDate={reportEndDate}
        totalDocumented={getTotalDocumentedKilograms()}
        availableStock={getTotalAvailableKilograms()}
        totalSold={getTotalSoldKilograms()}
        activeBatches={getAvailableBatches().length}
        documents={eudrDocuments}
        sales={eudrSales}
      />

      {/* Sale Modal */}
      <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create EUDR Sale</DialogTitle>
            <DialogDescription>
              Record a sale from documented EUDR coffee batch
              {selectedBatch && (
                <div className="mt-2 text-sm bg-muted p-2 rounded">
                  <strong>Batch:</strong> {selectedBatch.batch_identifier} | 
                  <strong> Available:</strong> {selectedBatch.available_kilograms}kg
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sale-kg">Kilograms to Sell *</Label>
                <Input
                  id="sale-kg"
                  type="number"
                  value={newSale.kilograms}
                  onChange={(e) => setNewSale({...newSale, kilograms: Number(e.target.value)})}
                  placeholder="0"
                  max={selectedBatch?.available_kilograms || 0}
                />
              </div>
              <div>
                <Label htmlFor="sale-price">Sale Price (UGX) *</Label>
                <Input
                  id="sale-price"
                  type="number"
                  value={newSale.sale_price}
                  onChange={(e) => setNewSale({...newSale, sale_price: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <Input
                  id="customer"
                  value={newSale.sold_to}
                  onChange={(e) => setNewSale({...newSale, sold_to: e.target.value})}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="sale-date">Sale Date *</Label>
                <Input
                  id="sale-date"
                  type="date"
                  value={newSale.sale_date}
                  onChange={(e) => setNewSale({...newSale, sale_date: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitSale} disabled={submittingSale}>
              {submittingSale ? 'Recording...' : 'Record Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Batch Receipts</DialogTitle>
            <DialogDescription>
              Add or update receipt references for this batch
              {selectedBatch && (
                <div className="mt-2 text-sm bg-muted p-2 rounded">
                  <strong>Batch:</strong> {selectedBatch.batch_identifier}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Receipt References</Label>
            {(receiptData.receipts || []).map((receipt, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={receipt}
                  onChange={(e) => handleReceiptChange(index, e.target.value)}
                  placeholder={`Receipt reference ${index + 1}`}
                />
                {(receiptData.receipts || []).length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveReceipt(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddReceipt}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateReceipts}>
              Update Receipts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EUDR Report Preview</DialogTitle>
            <DialogDescription>
              Preview the EUDR compliance report before printing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  window.print();
                  setShowPrintPreview(false);
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowPrintPreview(false)}
              >
                Close
              </Button>
            </div>
            
            {/* Render the print component */}
            <div className="border rounded-lg bg-white">
              <EUDRReportPrint
                reportType={reportType}
                startDate={reportStartDate}
                endDate={reportEndDate}
                totalDocumented={getTotalDocumentedKilograms()}
                availableStock={getTotalAvailableKilograms()}
                totalSold={getTotalSoldKilograms()}
                activeBatches={eudrBatches.length}
                documents={eudrDocuments}
                sales={eudrSales}
                isPreview={true}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EUDRDocumentation;