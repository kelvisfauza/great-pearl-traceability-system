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
import { FileText, Plus, DollarSign, Package, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useEUDRDocumentation } from '@/hooks/useEUDRDocumentation';
import { useStoreManagement } from '@/hooks/useStoreManagement';
import { toast } from 'sonner';

const EUDRDocumentation = () => {
  const {
    eudrDocuments,
    eudrSales,
    loading,
    addEUDRDocument,
    createEUDRSale,
    getTotalAvailableKilograms,
    getTotalDocumentedKilograms,
    getTotalSoldKilograms,
    getDocumentsByStatus,
    getSalesForDocument
  } = useEUDRDocumentation();

  const { storeRecords } = useStoreManagement();

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [submittingDocument, setSubmittingDocument] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);

  const [newDocument, setNewDocument] = useState({
    coffeeType: '',
    totalKilograms: 0,
    receipts: [''],
    supplierName: '',
    batchNumber: '',
    documentationNotes: ''
  });

  const [newSale, setNewSale] = useState({
    eudrDocumentId: '',
    kilograms: 0,
    soldTo: '',
    saleDate: new Date().toISOString().split('T')[0],
    salePrice: 0
  });

  const handleAddReceipt = () => {
    setNewDocument({
      ...newDocument,
      receipts: [...newDocument.receipts, '']
    });
  };

  const handleRemoveReceipt = (index: number) => {
    const updatedReceipts = newDocument.receipts.filter((_, i) => i !== index);
    setNewDocument({
      ...newDocument,
      receipts: updatedReceipts.length > 0 ? updatedReceipts : ['']
    });
  };

  const handleReceiptChange = (index: number, value: string) => {
    const updatedReceipts = [...newDocument.receipts];
    updatedReceipts[index] = value;
    setNewDocument({
      ...newDocument,
      receipts: updatedReceipts
    });
  };

  const handleSubmitDocument = async () => {
    if (!newDocument.coffeeType || !newDocument.supplierName || newDocument.totalKilograms <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const validReceipts = newDocument.receipts.filter(receipt => receipt.trim() !== '');
    if (validReceipts.length === 0) {
      toast.error('Please add at least one receipt reference');
      return;
    }

    setSubmittingDocument(true);
    try {
      await addEUDRDocument({
        ...newDocument,
        receipts: validReceipts,
        date: new Date().toISOString().split('T')[0],
        batchNumber: newDocument.batchNumber || `EUDR${Date.now()}`
      });

      setNewDocument({
        coffeeType: '',
        totalKilograms: 0,
        receipts: [''],
        supplierName: '',
        batchNumber: '',
        documentationNotes: ''
      });
      setShowDocumentModal(false);
    } catch (error) {
      console.error('Error submitting document:', error);
    } finally {
      setSubmittingDocument(false);
    }
  };

  const handleSubmitSale = async () => {
    if (!newSale.eudrDocumentId || newSale.kilograms <= 0 || !newSale.soldTo || newSale.salePrice <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingSale(true);
    try {
      await createEUDRSale({
        ...newSale,
        coffeeType: selectedDocument.coffeeType,
        batchNumber: selectedDocument.batchNumber
      });
      setNewSale({
        eudrDocumentId: '',
        kilograms: 0,
        soldTo: '',
        saleDate: new Date().toISOString().split('T')[0],
        salePrice: 0
      });
      setShowSaleModal(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error submitting sale:', error);
    } finally {
      setSubmittingSale(false);
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
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openSaleModal = (document: any) => {
    setSelectedDocument(document);
    setNewSale({
      ...newSale,
      eudrDocumentId: document.id
    });
    setShowSaleModal(true);
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
              {eudrDocuments.length} document{eudrDocuments.length !== 1 ? 's' : ''}
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
              Ready for sale
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add EUDR Documentation</DialogTitle>
              <DialogDescription>
                Document coffee with proper EUDR compliance receipts and information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coffee-type">Coffee Type *</Label>
                  <Select value={newDocument.coffeeType} onValueChange={(value) => setNewDocument({...newDocument, coffeeType: value})}>
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
                  <Label htmlFor="total-kg">Total Kilograms *</Label>
                  <Input
                    id="total-kg"
                    type="number"
                    value={newDocument.totalKilograms}
                    onChange={(e) => setNewDocument({...newDocument, totalKilograms: Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier Name *</Label>
                  <Input
                    id="supplier"
                    value={newDocument.supplierName}
                    onChange={(e) => setNewDocument({...newDocument, supplierName: e.target.value})}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <Label htmlFor="batch">Batch Number</Label>
                  <Input
                    id="batch"
                    value={newDocument.batchNumber}
                    onChange={(e) => setNewDocument({...newDocument, batchNumber: e.target.value})}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div>
                <Label>Documentation Receipts *</Label>
                {newDocument.receipts.map((receipt, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Input
                      value={receipt}
                      onChange={(e) => handleReceiptChange(index, e.target.value)}
                      placeholder={`Receipt reference ${index + 1}`}
                    />
                    {newDocument.receipts.length > 1 && (
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
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Receipt
                </Button>
              </div>

              <div>
                <Label htmlFor="notes">Documentation Notes</Label>
                <Textarea
                  id="notes"
                  value={newDocument.documentationNotes}
                  onChange={(e) => setNewDocument({...newDocument, documentationNotes: e.target.value})}
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
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>EUDR Documented Coffee</CardTitle>
          <CardDescription>
            All coffee with proper EUDR documentation and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eudrDocuments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Coffee Type</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total KG</TableHead>
                  <TableHead>Available KG</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eudrDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono">{doc.batchNumber}</TableCell>
                    <TableCell className="capitalize">{doc.coffeeType}</TableCell>
                    <TableCell>{doc.supplierName}</TableCell>
                    <TableCell>{doc.totalKilograms.toLocaleString()}kg</TableCell>
                    <TableCell className="font-semibold">{doc.availableKilograms.toLocaleString()}kg</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {doc.receipts.slice(0, 2).map((receipt, i) => (
                          <div key={i} className="truncate max-w-[100px]">{receipt}</div>
                        ))}
                        {doc.receipts.length > 2 && (
                          <div className="text-muted-foreground">+{doc.receipts.length - 2} more</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.availableKilograms > 0 && (
                        <Button
                          size="sm"
                          onClick={() => openSaleModal(doc)}
                        >
                          Create Sale
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Sale Modal */}
      <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create EUDR Sale</DialogTitle>
            <DialogDescription>
              Record a sale from documented EUDR coffee stock
              {selectedDocument && (
                <div className="mt-2 text-sm bg-muted p-2 rounded">
                  <strong>Batch:</strong> {selectedDocument.batchNumber} | 
                  <strong> Available:</strong> {selectedDocument.availableKilograms}kg
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
                  max={selectedDocument?.availableKilograms || 0}
                />
              </div>
              <div>
                <Label htmlFor="sale-price">Sale Price (UGX) *</Label>
                <Input
                  id="sale-price"
                  type="number"
                  value={newSale.salePrice}
                  onChange={(e) => setNewSale({...newSale, salePrice: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sold-to">Sold To *</Label>
                <Input
                  id="sold-to"
                  value={newSale.soldTo}
                  onChange={(e) => setNewSale({...newSale, soldTo: e.target.value})}
                  placeholder="Customer/Company name"
                />
              </div>
              <div>
                <Label htmlFor="sale-date">Sale Date *</Label>
                <Input
                  id="sale-date"
                  type="date"
                  value={newSale.saleDate}
                  onChange={(e) => setNewSale({...newSale, saleDate: e.target.value})}
                />
              </div>
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
  );
};

export default EUDRDocumentation;