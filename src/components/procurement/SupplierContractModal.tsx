
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SupplierContractModalProps {
  open: boolean;
  onClose: () => void;
}

interface Contract {
  id: string;
  supplierName: string;
  supplierId: string;
  contractType: string;
  date: string;
  kilogramsExpected: number;
  pricePerKg: number;
  advanceGiven: number;
  status: string;
  created_at: string;
}

const SupplierContractModal: React.FC<SupplierContractModalProps> = ({ open, onClose }) => {
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    supplierId: '',
    contractType: '',
    date: '',
    kilogramsExpected: '',
    pricePerKg: '',
    advanceGiven: ''
  });

  useEffect(() => {
    if (open) {
      fetchContracts();
    }
  }, [open]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const contractsQuery = query(
        collection(db, 'supplier_contracts'),
        orderBy('created_at', 'desc')
      );
      
      const contractsSnapshot = await getDocs(contractsQuery);
      const contractsData = contractsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contract[];

      setContracts(contractsData);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierId || !formData.contractType || !formData.date || 
        !formData.kilogramsExpected || !formData.pricePerKg) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
      if (!selectedSupplier) return;

      const contractData = {
        supplierName: selectedSupplier.name,
        supplierId: formData.supplierId,
        contractType: formData.contractType,
        date: formData.date,
        kilogramsExpected: Number(formData.kilogramsExpected),
        pricePerKg: Number(formData.pricePerKg),
        advanceGiven: Number(formData.advanceGiven) || 0,
        status: 'Active',
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'supplier_contracts'), contractData);
      
      toast({
        title: "Success",
        description: "Contract created successfully"
      });

      // Reset form
      setFormData({
        supplierId: '',
        contractType: '',
        date: '',
        kilogramsExpected: '',
        pricePerKg: '',
        advanceGiven: ''
      });

      // Refresh contracts
      fetchContracts();
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive"
      });
    }
  };

  const handlePrintContract = (contract: Contract) => {
    const contractContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>SUPPLIER CONTRACT</h1>
          <p><strong>Great Pearl Coffee Factory</strong></p>
          <p>+256781121639 / +256778536681</p>
          <p>greatpearlcoffee@gmail.com</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2>Contract Details</h2>
          <p><strong>Contract ID:</strong> ${contract.id}</p>
          <p><strong>Date:</strong> ${new Date(contract.date).toLocaleDateString()}</p>
          <p><strong>Supplier:</strong> ${contract.supplierName}</p>
          <p><strong>Contract Type:</strong> ${contract.contractType}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2>Terms & Conditions</h2>
          <p><strong>Expected Kilograms:</strong> ${contract.kilogramsExpected.toLocaleString()} KG</p>
          <p><strong>Price per KG:</strong> UGX ${contract.pricePerKg.toLocaleString()}</p>
          <p><strong>Total Contract Value:</strong> UGX ${(contract.kilogramsExpected * contract.pricePerKg).toLocaleString()}</p>
          ${contract.advanceGiven > 0 ? `<p><strong>Advance Given:</strong> UGX ${contract.advanceGiven.toLocaleString()}</p>` : ''}
        </div>
        
        <div style="margin-top: 40px;">
          <p>This contract is valid from ${new Date(contract.date).toLocaleDateString()} and supersedes all previous agreements.</p>
          <br/>
          <div style="display: flex; justify-content: space-between; margin-top: 60px;">
            <div style="text-align: center;">
              <p>_________________________</p>
              <p>Supplier Signature</p>
              <p>${contract.supplierName}</p>
            </div>
            <div style="text-align: center;">
              <p>_________________________</p>
              <p>Company Representative</p>
              <p>Great Pearl Coffee Factory</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Contract - ${contract.supplierName}</title>
          </head>
          <body>
            ${contractContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Contract Management</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Contract</TabsTrigger>
            <TabsTrigger value="view">View Contracts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select 
                    value={formData.supplierId} 
                    onValueChange={(value) => setFormData({...formData, supplierId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} - {supplier.origin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="contractType">Contract Type *</Label>
                  <Select 
                    value={formData.contractType} 
                    onValueChange={(value) => setFormData({...formData, contractType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fixed Price">Fixed Price</SelectItem>
                      <SelectItem value="Market Price">Market Price</SelectItem>
                      <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="date">Contract Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="kilogramsExpected">Expected Kilograms *</Label>
                  <Input
                    id="kilogramsExpected"
                    type="number"
                    value={formData.kilogramsExpected}
                    onChange={(e) => setFormData({...formData, kilogramsExpected: e.target.value})}
                    placeholder="Enter expected kilograms"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="pricePerKg">Price per KG (UGX) *</Label>
                  <Input
                    id="pricePerKg"
                    type="number"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({...formData, pricePerKg: e.target.value})}
                    placeholder="Enter price per kilogram"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="advanceGiven">Advance Given (UGX)</Label>
                  <Input
                    id="advanceGiven"
                    type="number"
                    value={formData.advanceGiven}
                    onChange={(e) => setFormData({...formData, advanceGiven: e.target.value})}
                    placeholder="Enter advance amount (optional)"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Contract
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="view" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <p>Loading contracts...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-8">
                <p>No contracts found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expected KG</TableHead>
                    <TableHead>Price/KG</TableHead>
                    <TableHead>Advance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>{contract.supplierName}</TableCell>
                      <TableCell>{contract.contractType}</TableCell>
                      <TableCell>{new Date(contract.date).toLocaleDateString()}</TableCell>
                      <TableCell>{contract.kilogramsExpected.toLocaleString()}</TableCell>
                      <TableCell>UGX {contract.pricePerKg.toLocaleString()}</TableCell>
                      <TableCell>UGX {contract.advanceGiven.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={contract.status === 'Active' ? 'default' : 'secondary'}>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintContract(contract)}
                        >
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierContractModal;
