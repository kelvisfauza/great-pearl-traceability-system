import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, Eye, CheckCircle, XCircle, Clock, Pause } from "lucide-react";
import { BuyerContract } from '@/hooks/useBuyerContracts';
import { useToast } from '@/hooks/use-toast';

interface BuyerContractsListProps {
  contracts: BuyerContract[];
  loading: boolean;
  onCreateContract: (data: any) => Promise<any>;
  onUpdateContract: (id: string, updates: Partial<BuyerContract>) => Promise<void>;
  onSelectContract: (contract: BuyerContract) => void;
  getRemainingQuantity: (contract: BuyerContract) => number;
}

export const BuyerContractsList = ({
  contracts,
  loading,
  onCreateContract,
  onUpdateContract,
  onSelectContract,
  getRemainingQuantity
}: BuyerContractsListProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    buyer_ref: '',
    buyer_name: '',
    buyer_address: '',
    buyer_phone: '',
    quality: '',
    quality_terms: '',
    total_quantity: '',
    packaging: '',
    price_per_kg: '',
    delivery_period_start: '',
    delivery_period_end: '',
    delivery_terms: '',
    seller_name: 'Great Pearl Coffee',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.buyer_name || !formData.total_quantity || !formData.price_per_kg || !formData.quality) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await onCreateContract({
        buyer_ref: formData.buyer_ref || null,
        buyer_name: formData.buyer_name,
        buyer_address: formData.buyer_address || null,
        buyer_phone: formData.buyer_phone || null,
        quality: formData.quality,
        quality_terms: formData.quality_terms || null,
        total_quantity: parseFloat(formData.total_quantity),
        packaging: formData.packaging || null,
        price_per_kg: parseFloat(formData.price_per_kg),
        delivery_period_start: formData.delivery_period_start || null,
        delivery_period_end: formData.delivery_period_end || null,
        delivery_terms: formData.delivery_terms || null,
        seller_name: formData.seller_name,
        notes: formData.notes || null,
        status: 'active',
        created_by: null
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const resetForm = () => {
    setFormData({
      buyer_ref: '',
      buyer_name: '',
      buyer_address: '',
      buyer_phone: '',
      quality: '',
      quality_terms: '',
      total_quantity: '',
      packaging: '',
      price_per_kg: '',
      delivery_period_start: '',
      delivery_period_end: '',
      delivery_terms: '',
      seller_name: 'Great Pearl Coffee',
      notes: ''
    });
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active: { color: 'bg-green-100 text-green-800', icon: <Clock className="h-3 w-3" />, label: 'Active' },
    completed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
    suspended: { color: 'bg-yellow-100 text-yellow-800', icon: <Pause className="h-3 w-3" />, label: 'Suspended' }
  };

  if (loading) {
    return <div className="p-4">Loading buyer contracts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Buyer Contracts
            </CardTitle>
            <CardDescription>Main purchase contracts from buyers (e.g., Kyagalanyi). Click on a contract to manage subcontracts.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Buyer Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Buyer Contract</DialogTitle>
                <DialogDescription>Enter the contract details received from the buyer</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buyer_name">Buyer Name *</Label>
                    <Input
                      id="buyer_name"
                      value={formData.buyer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyer_name: e.target.value }))}
                      placeholder="e.g., Kyagalanyi Coffee Limited"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyer_ref">Buyer Reference</Label>
                    <Input
                      id="buyer_ref"
                      value={formData.buyer_ref}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyer_ref: e.target.value }))}
                      placeholder="e.g., P065660"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="buyer_address">Buyer Address</Label>
                    <Input
                      id="buyer_address"
                      value={formData.buyer_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyer_address: e.target.value }))}
                      placeholder="e.g., Kampala Industrial Business Park"
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyer_phone">Buyer Phone</Label>
                    <Input
                      id="buyer_phone"
                      value={formData.buyer_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyer_phone: e.target.value }))}
                      placeholder="e.g., +256 312 265251"
                    />
                  </div>

                  <div>
                    <Label htmlFor="seller_name">Seller Name</Label>
                    <Input
                      id="seller_name"
                      value={formData.seller_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, seller_name: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="quality">Quality / Coffee Type *</Label>
                    <Input
                      id="quality"
                      value={formData.quality}
                      onChange={(e) => setFormData(prev => ({ ...prev, quality: e.target.value }))}
                      placeholder="e.g., Arabica Uganda FAQ Rwenzori African Moon Wet"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="quality_terms">Quality/Price Terms</Label>
                    <Input
                      id="quality_terms"
                      value={formData.quality_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, quality_terms: e.target.value }))}
                      placeholder="e.g., Subject to quality appraisal, cuttings & reweight"
                    />
                  </div>

                  <div>
                    <Label htmlFor="total_quantity">Total Quantity (kg) *</Label>
                    <Input
                      id="total_quantity"
                      type="number"
                      value={formData.total_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: e.target.value }))}
                      placeholder="e.g., 50000"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="packaging">Packaging</Label>
                    <Input
                      id="packaging"
                      value={formData.packaging}
                      onChange={(e) => setFormData(prev => ({ ...prev, packaging: e.target.value }))}
                      placeholder="e.g., 833 Bags of 60 kg each"
                    />
                  </div>

                  <div>
                    <Label htmlFor="price_per_kg">Price per Kg (UGX) *</Label>
                    <Input
                      id="price_per_kg"
                      type="number"
                      value={formData.price_per_kg}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_per_kg: e.target.value }))}
                      placeholder="e.g., 16500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="delivery_terms">Delivery Terms</Label>
                    <Input
                      id="delivery_terms"
                      value={formData.delivery_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_terms: e.target.value }))}
                      placeholder="e.g., Net Delivered Weight"
                    />
                  </div>

                  <div>
                    <Label htmlFor="delivery_period_start">Delivery Period Start</Label>
                    <Input
                      id="delivery_period_start"
                      type="date"
                      value={formData.delivery_period_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_period_start: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="delivery_period_end">Delivery Period End</Label>
                    <Input
                      id="delivery_period_end"
                      type="date"
                      value={formData.delivery_period_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_period_end: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this contract..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Contract</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No buyer contracts yet. Create your first buyer contract to start adding subcontracts.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Our Ref</TableHead>
                <TableHead>Buyer Ref</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Total Qty</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Price/kg</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map(contract => {
                const remaining = getRemainingQuantity(contract);
                const allocationPercent = (contract.allocated_quantity / contract.total_quantity) * 100;
                
                return (
                  <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{contract.contract_ref}</TableCell>
                    <TableCell>{contract.buyer_ref || '-'}</TableCell>
                    <TableCell>{contract.buyer_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{contract.quality}</TableCell>
                    <TableCell>{contract.total_quantity.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={allocationPercent} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {contract.allocated_quantity.toLocaleString()} / {contract.total_quantity.toLocaleString()} kg
                          <span className="ml-1 text-green-600">({remaining.toLocaleString()} remaining)</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>UGX {contract.price_per_kg.toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Badge className={`${statusConfig[contract.status]?.color || 'bg-gray-100'} flex items-center gap-1 cursor-pointer`}>
                              {statusConfig[contract.status]?.icon}
                              {statusConfig[contract.status]?.label || contract.status}
                            </Badge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onUpdateContract(contract.id, { status: 'active' })}>
                            <Clock className="h-4 w-4 mr-2 text-green-600" /> Active
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateContract(contract.id, { status: 'completed' })}>
                            <CheckCircle className="h-4 w-4 mr-2 text-blue-600" /> Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateContract(contract.id, { status: 'suspended' })}>
                            <Pause className="h-4 w-4 mr-2 text-yellow-600" /> Suspended
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateContract(contract.id, { status: 'cancelled' })}>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" /> Cancelled
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => onSelectContract(contract)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View & Subcontracts
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
