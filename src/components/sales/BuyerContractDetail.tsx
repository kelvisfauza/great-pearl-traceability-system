import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, Printer, FileText, CheckCircle, XCircle, Clock, Pause, AlertTriangle } from "lucide-react";
import { BuyerContract } from '@/hooks/useBuyerContracts';
import { useSupplierSubcontracts, SupplierSubcontract } from '@/hooks/useSupplierSubcontracts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BuyerContractDetailProps {
  contract: BuyerContract;
  onBack: () => void;
  remainingQuantity: number;
}

export const BuyerContractDetail = ({ contract, onBack, remainingQuantity: initialRemaining }: BuyerContractDetailProps) => {
  const { createSubcontract, updateSubcontract } = useSupplierSubcontracts();
  const { suppliers } = useSuppliers();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subcontracts, setSubcontracts] = useState<SupplierSubcontract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<SupplierSubcontract | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_name: '',
    contract_size: '',
    delivery_station: '',
    net_weight: '',
    price_per_kg: '',
    price_subject_to_uprisal: false,
    cuttings: '',
    terms: '',
    outturn: '',
    moisture: '',
    total_fm: '',
    duration: ''
  });

  // Calculate remaining quantity dynamically
  const allocatedFromSubs = subcontracts
    .filter(s => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.net_weight, 0);
  const remainingQuantity = contract.total_quantity - allocatedFromSubs;

  const fetchSubcontracts = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_subcontracts')
        .select('*')
        .eq('buyer_contract_id', contract.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubcontracts(data || []);
    } catch (error: any) {
      console.error('Error fetching subcontracts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcontracts();
  }, [contract.id]);

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId,
      supplier_name: supplier?.name || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id || !formData.net_weight || !formData.price_per_kg) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const requestedWeight = parseFloat(formData.net_weight);
    if (requestedWeight > remainingQuantity) {
      toast({
        title: "Weight Exceeds Available",
        description: `You can only allocate up to ${remainingQuantity.toLocaleString()} kg. The main contract has ${contract.total_quantity.toLocaleString()} kg total with ${allocatedFromSubs.toLocaleString()} kg already allocated.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate contract ref
      const { data: refData } = await supabase
        .from('supplier_subcontracts')
        .select('contract_ref')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (refData && refData.length > 0) {
        const match = refData[0].contract_ref.match(/GPC\s*(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const contract_ref = `GPC ${nextNum.toString().padStart(4, '0')}`;

      const { data: newSubcontract, error } = await supabase
        .from('supplier_subcontracts')
        .insert([{
          contract_ref,
          buyer_contract_id: contract.id,
          supplier_id: formData.supplier_id,
          supplier_name: formData.supplier_name,
          contract_size: formData.contract_size,
          delivery_station: formData.delivery_station,
          net_weight: requestedWeight,
          price_per_kg: parseFloat(formData.price_per_kg),
          price_subject_to_uprisal: formData.price_subject_to_uprisal,
          cuttings: formData.cuttings || null,
          terms: formData.terms || null,
          outturn: formData.outturn ? parseFloat(formData.outturn) : null,
          moisture: formData.moisture ? parseFloat(formData.moisture) : null,
          total_fm: formData.total_fm ? parseFloat(formData.total_fm) : null,
          duration: formData.duration || null,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Subcontract ${contract_ref} created successfully`
      });

      setSubcontracts(prev => [newSubcontract, ...prev]);
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating subcontract:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create subcontract",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (subcontract: SupplierSubcontract, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('supplier_subcontracts')
        .update({ status: newStatus })
        .eq('id', subcontract.id);

      if (error) throw error;

      setSubcontracts(prev => 
        prev.map(sc => sc.id === subcontract.id ? { ...sc, status: newStatus } : sc)
      );

      toast({
        title: "Success",
        description: "Subcontract status updated"
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      supplier_name: '',
      contract_size: '',
      delivery_station: '',
      net_weight: '',
      price_per_kg: '',
      price_subject_to_uprisal: false,
      cuttings: '',
      terms: '',
      outturn: '',
      moisture: '',
      total_fm: '',
      duration: ''
    });
  };

  const handlePrint = (subcontract: SupplierSubcontract) => {
    setSelectedContract(subcontract);
    setIsPrintPreviewOpen(true);
  };

  const printContract = () => {
    if (!selectedContract) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier Subcontract - ${selectedContract.contract_ref}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #1a472a; font-size: 24px; }
          .header h2 { margin: 5px 0; font-size: 18px; font-weight: normal; }
          .contract-ref { font-size: 20px; font-weight: bold; color: #333; margin: 20px 0; text-align: center; }
          .parent-contract { background: #e8f5e9; padding: 10px 15px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; color: #1a472a; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          .row { display: flex; margin: 8px 0; }
          .label { font-weight: bold; width: 200px; }
          .value { flex: 1; }
          .quality-notice { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .quality-notice-title { font-weight: bold; color: #856404; margin-bottom: 8px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .signature-box { width: 45%; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GREAT PEARL COFFEE</h1>
          <h2>Supplier Subcontract Agreement</h2>
        </div>
        
        <div class="contract-ref">Subcontract Reference: ${selectedContract.contract_ref}</div>
        
        <div class="parent-contract">
          <strong>Under Buyer Contract:</strong> ${contract.contract_ref} | 
          <strong>Buyer:</strong> ${contract.buyer_name} | 
          <strong>Buyer Ref:</strong> ${contract.buyer_ref || 'N/A'}
        </div>
        
        <div class="section">
          <div class="section-title">Supplier Information</div>
          <div class="row"><span class="label">Supplier Name:</span><span class="value">${selectedContract.supplier_name}</span></div>
          <div class="row"><span class="label">Contract Size:</span><span class="value">${selectedContract.contract_size || 'N/A'}</span></div>
          <div class="row"><span class="label">Delivery Station:</span><span class="value">${selectedContract.delivery_station}</span></div>
          <div class="row"><span class="label">Contract Duration:</span><span class="value">${selectedContract.duration || 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Contract Details</div>
          <div class="row"><span class="label">Net Weight:</span><span class="value">${selectedContract.net_weight.toLocaleString()} kg</span></div>
          <div class="row"><span class="label">Price per Kg:</span><span class="value">UGX ${selectedContract.price_per_kg.toLocaleString()}</span></div>
          <div class="row"><span class="label">Total Contract Value:</span><span class="value">UGX ${(selectedContract.net_weight * selectedContract.price_per_kg).toLocaleString()}</span></div>
          <div class="row"><span class="label">Price Subject to Uprisal:</span><span class="value">${selectedContract.price_subject_to_uprisal ? 'Yes' : 'No'}</span></div>
          ${selectedContract.cuttings ? `<div class="row"><span class="label">Cuttings:</span><span class="value">${selectedContract.cuttings}</span></div>` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">Quality Parameters</div>
          <div class="row"><span class="label">Outturn:</span><span class="value">${selectedContract.outturn || 'N/A'}%</span></div>
          <div class="row"><span class="label">Moisture:</span><span class="value">${selectedContract.moisture || 'N/A'}%</span></div>
          <div class="row"><span class="label">Total FM:</span><span class="value">${selectedContract.total_fm || 'N/A'}%</span></div>
        </div>

        <div class="quality-notice">
          <div class="quality-notice-title">⚠️ Important Notice</div>
          <p style="margin: 0;">All deliveries under this contract are subjected to quality checks, uprisal adjustments, and cuttings as per Great Pearl Coffee's quality standards and market conditions at the time of delivery.</p>
        </div>
        
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Great Pearl Coffee Representative</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Supplier Representative</div>
          </div>
        </div>
        
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Great Pearl Coffee - www.greatpearlcoffeesystem.site</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    setIsPrintPreviewOpen(false);
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active: { color: 'bg-green-100 text-green-800', icon: <Clock className="h-3 w-3" />, label: 'Active' },
    completed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
    suspended: { color: 'bg-yellow-100 text-yellow-800', icon: <Pause className="h-3 w-3" />, label: 'Suspended' }
  };

  const allocationPercent = (allocatedFromSubs / contract.total_quantity) * 100;

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{contract.contract_ref}</h2>
          <p className="text-sm text-muted-foreground">{contract.buyer_name} - {contract.buyer_ref || 'No buyer ref'}</p>
        </div>
      </div>

      {/* Contract Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Contract Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Quality</p>
              <p className="font-medium">{contract.quality}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price/kg</p>
              <p className="font-medium">UGX {contract.price_per_kg.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivery Period</p>
              <p className="font-medium">
                {contract.delivery_period_start && contract.delivery_period_end
                  ? `${new Date(contract.delivery_period_start).toLocaleDateString()} - ${new Date(contract.delivery_period_end).toLocaleDateString()}`
                  : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivery Terms</p>
              <p className="font-medium">{contract.delivery_terms || 'Not specified'}</p>
            </div>
          </div>

          {/* Allocation Progress */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Quantity Allocation</span>
              <span className="text-sm">
                {allocatedFromSubs.toLocaleString()} / {contract.total_quantity.toLocaleString()} kg
              </span>
            </div>
            <Progress value={allocationPercent} className="h-3" />
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Allocated: {allocatedFromSubs.toLocaleString()} kg</span>
              <span className={remainingQuantity > 0 ? "text-green-600 font-medium" : "text-amber-600"}>
                Remaining: {remainingQuantity.toLocaleString()} kg
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subcontracts Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Supplier Subcontracts
              </CardTitle>
              <CardDescription>Subcontracts under this buyer contract</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={remainingQuantity <= 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Subcontract
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Supplier Subcontract</DialogTitle>
                  <DialogDescription>
                    For: {contract.contract_ref} ({contract.buyer_name})
                  </DialogDescription>
                </DialogHeader>
                
                {/* Available Weight Warning */}
                <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${remainingQuantity < 5000 ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                  {remainingQuantity < 5000 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  <span>
                    <strong>Available for allocation:</strong> {remainingQuantity.toLocaleString()} kg 
                    (Total: {contract.total_quantity.toLocaleString()} kg, Already allocated: {allocatedFromSubs.toLocaleString()} kg)
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="supplier">Supplier *</Label>
                      <Select value={formData.supplier_id} onValueChange={handleSupplierChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="contract_size">Contract Size</Label>
                      <Input
                        id="contract_size"
                        value={formData.contract_size}
                        onChange={(e) => setFormData(prev => ({ ...prev, contract_size: e.target.value }))}
                        placeholder="e.g., 10 tonnes"
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="e.g., 2 weeks"
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery_station">Delivery Station *</Label>
                      <Input
                        id="delivery_station"
                        value={formData.delivery_station}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_station: e.target.value }))}
                        placeholder="e.g., Kampala Warehouse"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="net_weight">Net Weight (kg) * <span className="text-xs text-muted-foreground">(max: {remainingQuantity.toLocaleString()})</span></Label>
                      <Input
                        id="net_weight"
                        type="number"
                        value={formData.net_weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, net_weight: e.target.value }))}
                        placeholder="e.g., 10000"
                        max={remainingQuantity}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="price_per_kg">Price per Kg (UGX) *</Label>
                      <Input
                        id="price_per_kg"
                        type="number"
                        value={formData.price_per_kg}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_per_kg: e.target.value }))}
                        placeholder="e.g., 8500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="cuttings">Cuttings</Label>
                      <Input
                        id="cuttings"
                        value={formData.cuttings}
                        onChange={(e) => setFormData(prev => ({ ...prev, cuttings: e.target.value }))}
                        placeholder="e.g., 2%"
                      />
                    </div>

                    <div className="flex items-center space-x-2 col-span-2">
                      <Checkbox
                        id="price_subject_to_uprisal"
                        checked={formData.price_subject_to_uprisal}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, price_subject_to_uprisal: checked as boolean }))
                        }
                      />
                      <Label htmlFor="price_subject_to_uprisal">Price Subject to Uprisal</Label>
                    </div>

                    <div>
                      <Label htmlFor="outturn">Outturn (%)</Label>
                      <Input
                        id="outturn"
                        type="number"
                        step="0.1"
                        value={formData.outturn}
                        onChange={(e) => setFormData(prev => ({ ...prev, outturn: e.target.value }))}
                        placeholder="e.g., 80"
                      />
                    </div>

                    <div>
                      <Label htmlFor="moisture">Moisture (%)</Label>
                      <Input
                        id="moisture"
                        type="number"
                        step="0.1"
                        value={formData.moisture}
                        onChange={(e) => setFormData(prev => ({ ...prev, moisture: e.target.value }))}
                        placeholder="e.g., 12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="total_fm">Total FM (%)</Label>
                      <Input
                        id="total_fm"
                        type="number"
                        step="0.1"
                        value={formData.total_fm}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_fm: e.target.value }))}
                        placeholder="e.g., 3"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="terms">Terms & Conditions</Label>
                      <Textarea
                        id="terms"
                        value={formData.terms}
                        onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                        placeholder="Enter contract terms and conditions..."
                        rows={3}
                      />
                    </div>

                    <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                      <strong>Note:</strong> All deliveries are subjected to quality checks, uprisal adjustments, and cuttings as per company standards.
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Subcontract</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading subcontracts...</div>
          ) : subcontracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subcontracts yet. Create your first subcontract to allocate quantity to suppliers.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Price/kg</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontracts.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.contract_ref}</TableCell>
                    <TableCell>{sub.supplier_name}</TableCell>
                    <TableCell>{sub.net_weight.toLocaleString()} kg</TableCell>
                    <TableCell>UGX {sub.price_per_kg.toLocaleString()}</TableCell>
                    <TableCell>{sub.duration || '-'}</TableCell>
                    <TableCell>{sub.delivery_station}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Badge className={`${statusConfig[sub.status]?.color || 'bg-gray-100'} flex items-center gap-1 cursor-pointer`}>
                              {statusConfig[sub.status]?.icon}
                              {statusConfig[sub.status]?.label || sub.status}
                            </Badge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStatusChange(sub, 'active')}>
                            <Clock className="h-4 w-4 mr-2 text-green-600" /> Active
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(sub, 'completed')}>
                            <CheckCircle className="h-4 w-4 mr-2 text-blue-600" /> Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(sub, 'suspended')}>
                            <Pause className="h-4 w-4 mr-2 text-yellow-600" /> Suspended
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(sub, 'cancelled')}>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" /> Cancelled
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handlePrint(sub)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Print Preview Dialog */}
      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Subcontract</DialogTitle>
            <DialogDescription>
              Print contract {selectedContract?.contract_ref} for {selectedContract?.supplier_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>Cancel</Button>
            <Button onClick={printContract}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
