import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Package, Calendar, User, MapPin, AlertTriangle } from 'lucide-react';
import { generateBatchNumber, validateBatchWeight, getMinimumBatchWeight, checkBatchAccumulation, batchAccumulatedDeliveries } from '@/utils/batchUtils';
import { PendingBatchSummary } from '@/components/PendingBatchSummary';

interface StoreRecord {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  quantity_bags: number;
  quantity_kg: number;
  batch_number?: string;
  supplier_name?: string;
  buyer_name?: string;
  price_per_kg?: number;
  total_value?: number;
  transaction_date: string;
  from_location?: string;
  to_location?: string;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
}

interface InventoryItem {
  id: string;
  coffee_type: string;
  location: string;
}

export const StoreRecordsManager = () => {
  const [records, setRecords] = useState<StoreRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [availableQuantities, setAvailableQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StoreRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    inventory_item_id: '',
    transaction_type: 'received',
    quantity_bags: 0,
    quantity_kg: 0,
    batch_number: '',
    supplier_name: '',
    buyer_name: '',
    price_per_kg: 0,
    total_value: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    from_location: '',
    to_location: '',
    reference_number: '',
    notes: ''
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchRecords();
    fetchInventoryItems();
  }, []);

  // Fetch available quantities considering inventory movements
  useEffect(() => {
    if (records.length > 0) {
      calculateAvailableQuantities();
    }
  }, [records]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('store_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching store records:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch store records',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, coffee_type, location')
        .eq('status', 'available');

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  const calculateAvailableQuantities = async () => {
    try {
      // Get all inventory movements
      const { data: movements, error } = await supabase
        .from('inventory_movements')
        .select('coffee_record_id, quantity_kg');

      if (error) throw error;

      console.log('📦 Inventory movements:', movements);

      // Calculate net movements per record
      const movementsByRecord: Record<string, number> = {};
      movements?.forEach(m => {
        movementsByRecord[m.coffee_record_id] = 
          (movementsByRecord[m.coffee_record_id] || 0) + Number(m.quantity_kg);
      });

      console.log('📊 Movements by record:', movementsByRecord);

      // Calculate available = original + movements (movements are negative for sales)
      const available: Record<string, number> = {};
      records.forEach(record => {
        const movements = movementsByRecord[record.id] || 0;
        const availableQty = Math.max(0, Number(record.quantity_kg) + movements);
        available[record.id] = availableQty;
        console.log(`Record ${record.batch_number}: original=${record.quantity_kg}, movements=${movements}, available=${availableQty}`);
      });

      setAvailableQuantities(available);
    } catch (error) {
      console.error('Error calculating available quantities:', error);
    }
  };

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit called!', { editMode, selectedRecord, formData });
    try {
      const { checkBatchAccumulation, batchAccumulatedDeliveries } = await import('@/utils/batchUtils');
      
      let recordData: any;
      let shouldCreateBatch = false;
      let batchInfo: any = {};

      if (!editMode && formData.transaction_type === 'received' && formData.supplier_name) {
        // Check if this delivery should be accumulated with others
        batchInfo = await checkBatchAccumulation(formData.supplier_name, formData.quantity_kg);
        
        if (batchInfo.shouldBatch) {
          // This delivery will complete a batch
          shouldCreateBatch = true;
          recordData = {
            ...formData,
            batch_number: batchInfo.batchNumber,
            status: 'active',
            created_by: user?.email || 'Unknown',
            total_value: formData.quantity_kg * formData.price_per_kg
          };
        } else {
          // This delivery will remain pending until batch is complete
          recordData = {
            ...formData,
            batch_number: null,
            status: 'pending_batch',
            created_by: user?.email || 'Unknown',
            total_value: formData.quantity_kg * formData.price_per_kg
          };
        }
      } else if (!editMode) {
        // For non-received transactions or no supplier, handle normally
        if (formData.quantity_kg >= getMinimumBatchWeight()) {
          const batchNumber = await generateBatchNumber();
          recordData = {
            ...formData,
            batch_number: batchNumber,
            status: 'active',
            created_by: user?.email || 'Unknown',
            total_value: formData.quantity_kg * formData.price_per_kg
          };
        } else {
          toast({
            title: 'Invalid Batch Weight',
            description: `Single deliveries must be at least ${getMinimumBatchWeight()}kg. Current weight: ${formData.quantity_kg}kg`,
            variant: 'destructive'
          });
          return;
        }
      } else {
        // Edit mode
        recordData = {
          ...formData,
          created_by: user?.email || 'Unknown',
          total_value: formData.quantity_kg * formData.price_per_kg
        };
      }

      if (editMode && selectedRecord) {
        console.log('🔄 Starting update process...', { selectedRecord, recordData });
        
        // Direct update to store_records
        const { data: updateData, error: updateError } = await supabase
          .from('store_records')
          .update(recordData)
          .eq('id', selectedRecord.id)
          .select();

        if (updateError) {
          console.error('❌ Store records update error:', updateError);
          throw updateError;
        }
        
        console.log('✅ Store records updated:', updateData);

        // Also update coffee_records if it exists
        const { data: coffeeData, error: coffeeUpdateError } = await supabase
          .from('coffee_records')
          .update({
            supplier_name: formData.supplier_name || 'Unknown',
            kilograms: formData.quantity_kg,
            bags: Math.ceil(formData.quantity_kg / 60),
            date: formData.transaction_date,
            batch_number: recordData.batch_number || 'N/A'
          })
          .eq('id', selectedRecord.id)
          .select();

        if (coffeeUpdateError) {
          console.error('⚠️ Coffee records update error:', coffeeUpdateError);
        } else {
          console.log('✅ Coffee records updated:', coffeeData);
        }

        toast({
          title: 'Record Updated',
          description: 'Store record updated successfully',
        });
        
        fetchRecords();
      } else {
        // Insert into store_records
        const { data: storeRecord, error } = await supabase
          .from('store_records')
          .insert(recordData)
          .select()
          .single();

        if (error) throw error;

        // Get coffee type from inventory item
        const inventoryItem = inventoryItems.find(item => item.id === formData.inventory_item_id);
        const coffeeType = inventoryItem?.coffee_type || 'Arabica';

        // Also add to coffee_records for legacy system compatibility
        const { error: coffeeError } = await supabase
          .from('coffee_records')
          .insert({
            id: storeRecord.id,
            supplier_name: formData.supplier_name || 'Unknown',
            coffee_type: coffeeType,
            bags: Math.ceil(formData.quantity_kg / 60), // Estimate bags
            kilograms: formData.quantity_kg,
            date: formData.transaction_date,
            batch_number: recordData.batch_number || 'N/A',
            status: recordData.status || 'pending',
            supplier_id: null
          });

        if (coffeeError) {
          console.error('Error adding to coffee_records:', coffeeError);
        }

        // Immediately add to finance_coffee_lots for parallel workflow
        // Only add if it has a batch number (completed batches only)
        if (formData.transaction_type === 'received' && recordData.batch_number) {
          const unitPrice = formData.price_per_kg || 7000;
          console.log('🏦 Creating finance record for batch:', recordData.batch_number);
          
          const { error: financeError } = await supabase
            .from('finance_coffee_lots')
            .insert({
              coffee_record_id: storeRecord.id,
              supplier_id: null,
              assessed_by: user?.email || 'Store Department',
              quality_json: {
                batch_number: recordData.batch_number,
                coffee_type: coffeeType,
                status: 'pending_assessment',
                supplier_name: formData.supplier_name,
                note: 'Awaiting quality assessment - available for finance processing'
              },
              unit_price_ugx: unitPrice,
              quantity_kg: formData.quantity_kg,
              finance_status: 'READY_FOR_FINANCE'
            });

          if (financeError) {
            console.error('❌ Error adding to finance_coffee_lots:', financeError);
          } else {
            console.log('✅ Successfully added to finance_coffee_lots - ready for payment');
          }
        } else {
          console.log('⏳ Transaction is pending batch accumulation, not yet sent to finance');
        }

        // If this delivery completes a batch, update all pending deliveries
        if (shouldCreateBatch && batchInfo.pendingDeliveries) {
          await batchAccumulatedDeliveries(
            formData.supplier_name!, 
            batchInfo.batchNumber!, 
            batchInfo.pendingDeliveries
          );
          
          toast({
            title: 'Batch Created',
            description: `Delivery added and batch ${batchInfo.batchNumber} created. Sent to Quality & Finance.`,
          });
        } else if (recordData.status === 'pending_batch') {
          toast({
            title: 'Delivery Pending',
            description: `Delivery added to pending batch. Current total: ${batchInfo.totalWeight || formData.quantity_kg}kg (${getMinimumBatchWeight()}kg needed)`,
          });
        } else {
          toast({
            title: 'Record Created',
            description: 'Store record created and sent to Quality & Finance for processing.',
          });
        }
        
        fetchRecords();
        setRefreshTrigger(prev => prev + 1); // Trigger pending batch summary refresh
      }

      setFormOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting record:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit record',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (record: StoreRecord) => {
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .insert({
          table_name: 'store_records',
          record_id: record.id,
          record_data: JSON.parse(JSON.stringify(record)),
          reason: 'Store record deletion requested',
          requested_by: user?.email || 'Unknown',
          requested_by_department: 'Store'
        });

      if (error) throw error;

      toast({
        title: 'Deletion Request Submitted',
        description: 'Your deletion request has been submitted for admin approval',
      });
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deletion request',
        variant: 'destructive'
      });
    }
  };

  const openEditForm = (record: StoreRecord) => {
    setSelectedRecord(record);
    setFormData({
      inventory_item_id: record.inventory_item_id || '',
      transaction_type: record.transaction_type,
      quantity_bags: record.quantity_bags,
      quantity_kg: record.quantity_kg,
      batch_number: record.batch_number || '',
      supplier_name: record.supplier_name || '',
      buyer_name: record.buyer_name || '',
      price_per_kg: record.price_per_kg || 0,
      total_value: record.total_value || 0,
      transaction_date: record.transaction_date,
      from_location: record.from_location || '',
      to_location: record.to_location || '',
      reference_number: record.reference_number || '',
      notes: record.notes || ''
    });
    setEditMode(true);
    setFormOpen(true);
  };

  const resetForm = () => {
    setFormData({
      inventory_item_id: '',
      transaction_type: 'received',
      quantity_bags: 0,
      quantity_kg: 0,
      batch_number: '',
      supplier_name: '',
      buyer_name: '',
      price_per_kg: 0,
      total_value: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      from_location: '',
      to_location: '',
      reference_number: '',
      notes: ''
    });
    setEditMode(false);
    setSelectedRecord(null);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'received': return '📥';
      case 'dispatched': return '📤';
      case 'transferred': return '🔄';
      case 'adjusted': return '⚖️';
      default: return '📦';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending_batch': return 'bg-blue-100 text-blue-800';
      case 'pending_deletion': return 'bg-red-100 text-red-800';
      case 'pending_edit': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter records by selected date
  const filteredRecords = records.filter(record => 
    record.transaction_date === selectedDate
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Store Records Management</h2>
          <p className="text-muted-foreground">
            Manage inventory transactions. Deliveries under 1,000kg will be accumulated into batches.
          </p>
        </div>
        
        <Dialog open={formOpen} onOpenChange={(open) => {
          console.log('Dialog state changing:', open);
          setFormOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? 'Edit Store Record' : 'Add New Store Record'}
              </DialogTitle>
              {editMode && (
                <p className="text-sm text-muted-foreground">
                  Update the record details below. Changes will be saved immediately.
                </p>
              )}
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Supplier Name - Key field for editing */}
              <div className="col-span-2">
                <Label htmlFor="supplier_name" className="text-base font-semibold">
                  Supplier Name *
                </Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                  placeholder="Enter supplier name"
                  className="mt-1"
                />
              </div>

              {/* Quantity Fields */}
              <div>
                <Label htmlFor="quantity_kg" className="text-base font-semibold">
                  Quantity (KG) *
                </Label>
                <Input
                  id="quantity_kg"
                  type="number"
                  step="0.01"
                  value={formData.quantity_kg}
                  onChange={(e) => setFormData({...formData, quantity_kg: parseFloat(e.target.value) || 0})}
                  placeholder="Enter weight"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="quantity_bags" className="text-base font-semibold">
                  Number of Bags *
                </Label>
                <Input
                  id="quantity_bags"
                  type="number"
                  value={formData.quantity_bags}
                  onChange={(e) => setFormData({...formData, quantity_bags: parseInt(e.target.value) || 0})}
                  placeholder="Enter number of bags"
                  className="mt-1"
                />
              </div>

              {/* Transaction Date */}
              <div className="col-span-2">
                <Label htmlFor="transaction_date" className="text-base font-semibold">
                  Transaction Date *
                </Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                  className="mt-1"
                />
              </div>

              {!editMode && (
                <>
                  {/* These fields only show for new records */}
                  <div>
                    <Label htmlFor="inventory_item">Inventory Item</Label>
                    <Select value={formData.inventory_item_id} onValueChange={(value) => 
                      setFormData({...formData, inventory_item_id: value})
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inventory item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.coffee_type} - {item.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="transaction_type">Transaction Type</Label>
                    <Select value={formData.transaction_type} onValueChange={(value) => 
                      setFormData({...formData, transaction_type: value})
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="transferred">Transferred</SelectItem>
                        <SelectItem value="adjusted">Adjusted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Additional Optional Fields */}
              <div>
                <Label htmlFor="price_per_kg">Price per KG</Label>
                <Input
                  id="price_per_kg"
                  type="number"
                  step="0.01"
                  value={formData.price_per_kg}
                  onChange={(e) => setFormData({...formData, price_per_kg: parseFloat(e.target.value) || 0})}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  placeholder="Optional notes about this transaction"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log('❌ Cancel clicked');
                  setFormOpen(false);
                }}
                type="button"
              >
                Cancel
              </Button>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔘 Submit button clicked!', { 
                    editMode, 
                    selectedRecord,
                    formData,
                    hasSupplierName: !!formData.supplier_name,
                    hasQuantity: formData.quantity_kg > 0
                  });
                  handleSubmit();
                }}
                className="min-w-[140px]"
                type="button"
              >
                {editMode ? '✓ Update Record' : '+ Create Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <PendingBatchSummary refreshTrigger={refreshTrigger} />

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter by Date</CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {records.filter(record => record.transaction_date === selectedDate).length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No records found for {new Date(selectedDate).toLocaleDateString()}</p>
                <p className="text-sm mt-2">Select a different date to view other records</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          records.filter(record => record.transaction_date === selectedDate).map((record) => (
          <Card key={record.id} className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{getTransactionIcon(record.transaction_type)}</span>
                    {record.transaction_type.toUpperCase()} - {record.batch_number || (record.status === 'pending_batch' ? 'Pending Batch' : 'No Batch')}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {record.quantity_bags} bags / {record.quantity_kg} kg
                        </span>
                        {availableQuantities[record.id] !== undefined && (
                          <span className={`text-xs font-medium ${
                            availableQuantities[record.id] < record.quantity_kg 
                              ? 'text-amber-600' 
                              : 'text-green-600'
                          }`}>
                            Available: {availableQuantities[record.id].toFixed(2)} kg
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {record.transaction_date}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {record.created_by}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(record.status)}>
                    {record.status.replace('_', ' ')}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(record)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(record)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {record.supplier_name && (
                  <div>
                    <span className="font-medium">Supplier:</span>
                    <p>{record.supplier_name}</p>
                  </div>
                )}
                {record.buyer_name && (
                  <div>
                    <span className="font-medium">Buyer:</span>
                    <p>{record.buyer_name}</p>
                  </div>
                )}
                {record.price_per_kg && (
                  <div>
                    <span className="font-medium">Price/KG:</span>
                    <p>UGX {record.price_per_kg.toLocaleString()}</p>
                  </div>
                )}
                {record.total_value && (
                  <div>
                    <span className="font-medium">Total Value:</span>
                    <p>UGX {record.total_value.toLocaleString()}</p>
                  </div>
                )}
                {(record.from_location || record.to_location) && (
                  <div className="col-span-2">
                    <span className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location:
                    </span>
                    <p>
                      {record.from_location && `From: ${record.from_location}`}
                      {record.from_location && record.to_location && ' → '}
                      {record.to_location && `To: ${record.to_location}`}
                    </p>
                  </div>
                )}
                {record.notes && (
                  <div className="col-span-2">
                    <span className="font-medium">Notes:</span>
                    <p>{record.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )))}
      </div>
    </div>
  );
};