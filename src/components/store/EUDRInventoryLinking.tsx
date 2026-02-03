import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Search, Link2, Package, Calendar, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatSupplierDisplay, SupplierRef } from '@/utils/supplierDisplay';

interface InventorySource {
  id: string;
  batch_id: string;
  coffee_record_id: string;
  supplier_name: string;
  supplier_id?: string;
  kilograms: number;
  purchase_date: string;
  eudr_traced: boolean;
  eudr_traced_at: string | null;
  eudr_document_id: string | null;
  created_at: string;
}

const EUDRInventoryLinking = () => {
  const [sources, setSources] = useState<InventorySource[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, SupplierRef>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTraced, setFilterTraced] = useState<'all' | 'traced' | 'untraced'>('untraced');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linking, setLinking] = useState(false);
  const [documentNotes, setDocumentNotes] = useState('');

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code');
      
      if (error) throw error;
      
      const supplierMap: Record<string, SupplierRef> = {};
      (data || []).forEach(s => {
        supplierMap[s.id] = { id: s.id, name: s.name, code: s.code || '' };
      });
      setSuppliers(supplierMap);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchSources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_batch_sources')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error fetching inventory sources:', error);
      toast.error('Failed to load inventory sources');
    } finally {
      setLoading(false);
    }
  };

  const getSupplierDisplay = (source: InventorySource) => {
    const supplier = source.supplier_id ? suppliers[source.supplier_id] : null;
    return formatSupplierDisplay({ supplier, fallbackName: source.supplier_name });
  };

  useEffect(() => {
    fetchSuppliers();
    fetchSources();

    // Real-time subscription
    const channel = supabase
      .channel('inventory-sources-eudr')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_batch_sources' },
        () => fetchSources()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getFilteredSources = () => {
    let filtered = sources;

    // Search filter - also search supplier codes
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const display = getSupplierDisplay(s).displayName.toLowerCase();
        return display.includes(term) ||
               s.supplier_name.toLowerCase().includes(term) ||
               s.coffee_record_id.toLowerCase().includes(term);
      });
    }

    // Traced filter
    if (filterTraced === 'traced') {
      filtered = filtered.filter(s => s.eudr_traced);
    } else if (filterTraced === 'untraced') {
      filtered = filtered.filter(s => !s.eudr_traced);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = now.toISOString().split('T')[0];
      filtered = filtered.filter(s => s.purchase_date === today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      filtered = filtered.filter(s => s.purchase_date >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
      filtered = filtered.filter(s => s.purchase_date >= monthAgo);
    }

    return filtered;
  };

  const filteredSources = getFilteredSources();
  const selectedItems = sources.filter(s => selectedSources.includes(s.id));
  const totalSelectedKg = selectedItems.reduce((sum, s) => sum + s.kilograms, 0);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSources(filteredSources.filter(s => !s.eudr_traced).map(s => s.id));
    } else {
      setSelectedSources([]);
    }
  };

  const handleSelectSource = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSources([...selectedSources, id]);
    } else {
      setSelectedSources(selectedSources.filter(sId => sId !== id));
    }
  };

  const handleLinkToEUDR = async () => {
    if (selectedSources.length === 0) {
      toast.error('Please select at least one receipt to trace');
      return;
    }

    setLinking(true);
    try {
      // Get the coffee type from first selected source (get from coffee_records)
      const firstSource = sources.find(s => s.id === selectedSources[0]);
      
      // Create EUDR document for the traced receipts
      const batchNumber = `EUDR-TRACED-${Date.now()}`;
      const { data: docData, error: docError } = await supabase
        .from('eudr_documents')
        .insert({
          coffee_type: 'robusta', // Default, can be enhanced
          total_kilograms: totalSelectedKg,
          available_kilograms: totalSelectedKg,
          total_receipts: selectedSources.length,
          batch_number: batchNumber,
          total_bulked_coffee: totalSelectedKg,
          date: new Date().toISOString().split('T')[0],
          status: 'documented',
          documentation_notes: documentNotes || `Traced from ${selectedSources.length} inventory receipts`
        })
        .select()
        .single();

      if (docError) throw docError;

      // Update the inventory sources to mark as traced
      const { error: updateError } = await supabase
        .from('inventory_batch_sources')
        .update({
          eudr_traced: true,
          eudr_traced_at: new Date().toISOString(),
          eudr_document_id: docData.id
        })
        .in('id', selectedSources);

      if (updateError) throw updateError;

      toast.success(`Successfully traced ${selectedSources.length} receipts (${totalSelectedKg.toLocaleString()}kg) to EUDR document ${batchNumber}`);
      setSelectedSources([]);
      setShowLinkModal(false);
      setDocumentNotes('');
      fetchSources();
    } catch (error) {
      console.error('Error linking to EUDR:', error);
      toast.error('Failed to link receipts to EUDR');
    } finally {
      setLinking(false);
    }
  };

  const handleUntraceSource = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_batch_sources')
        .update({
          eudr_traced: false,
          eudr_traced_at: null,
          eudr_document_id: null,
          eudr_batch_id: null
        })
        .eq('id', sourceId);

      if (error) throw error;
      toast.success('Receipt untraced successfully');
      fetchSources();
    } catch (error) {
      console.error('Error untracing source:', error);
      toast.error('Failed to untrace receipt');
    }
  };

  const tracedCount = sources.filter(s => s.eudr_traced).length;
  const untracedCount = sources.filter(s => !s.eudr_traced).length;
  const totalKg = sources.reduce((sum, s) => sum + s.kilograms, 0);
  const tracedKg = sources.filter(s => s.eudr_traced).reduce((sum, s) => sum + s.kilograms, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sources.length}</div>
            <p className="text-xs text-muted-foreground">{totalKg.toLocaleString()}kg total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EUDR Traced</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tracedCount}</div>
            <p className="text-xs text-muted-foreground">{tracedKg.toLocaleString()}kg traced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tracing</CardTitle>
            <Link2 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{untracedCount}</div>
            <p className="text-xs text-muted-foreground">{(totalKg - tracedKg).toLocaleString()}kg pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracing Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sources.length > 0 ? Math.round((tracedCount / sources.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Compliance coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Inventory Receipts for EUDR Tracing</CardTitle>
              <CardDescription>
                Select receipts to link to EUDR compliance documentation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchSources}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {selectedSources.length > 0 && (
                <Button onClick={() => setShowLinkModal(true)}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Trace Selected ({selectedSources.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier or receipt ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTraced} onValueChange={(v: any) => setFilterTraced(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Receipts</SelectItem>
                <SelectItem value="untraced">Untraced Only</SelectItem>
                <SelectItem value="traced">Traced Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection Summary */}
          {selectedSources.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedSources.length} receipt{selectedSources.length !== 1 ? 's' : ''} selected
                ({totalSelectedKg.toLocaleString()}kg)
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSources([])}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Table */}
          {filteredSources.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedSources.length === filteredSources.filter(s => !s.eudr_traced).length && filteredSources.filter(s => !s.eudr_traced).length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead className="text-right">Kilograms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSources.map((source) => (
                    <TableRow key={source.id} className={source.eudr_traced ? 'bg-green-50/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSources.includes(source.id)}
                          onCheckedChange={(checked) => handleSelectSource(source.id, !!checked)}
                          disabled={source.eudr_traced}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {source.coffee_record_id.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="font-medium">{getSupplierDisplay(source).displayName}</TableCell>
                      <TableCell>{format(new Date(source.purchase_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right font-medium">
                        {source.kilograms.toLocaleString()}kg
                      </TableCell>
                      <TableCell>
                        {source.eudr_traced ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Traced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {source.eudr_traced ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUntraceSource(source.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Untrace
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSources([source.id]);
                              setShowLinkModal(true);
                            }}
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No receipts found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create EUDR Traceability Document</DialogTitle>
            <DialogDescription>
              Link {selectedSources.length} receipt{selectedSources.length !== 1 ? 's' : ''} ({totalSelectedKg.toLocaleString()}kg) to EUDR compliance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2">Selected Receipts Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Receipts: <span className="font-medium">{selectedSources.length}</span></div>
                <div>Total Weight: <span className="font-medium">{totalSelectedKg.toLocaleString()}kg</span></div>
                <div>Suppliers: <span className="font-medium">{new Set(selectedItems.map(s => s.supplier_name)).size}</span></div>
                <div>Date Range: <span className="font-medium">
                  {selectedItems.length > 0 
                    ? `${format(new Date(Math.min(...selectedItems.map(s => new Date(s.purchase_date).getTime()))), 'MMM dd')} - ${format(new Date(Math.max(...selectedItems.map(s => new Date(s.purchase_date).getTime()))), 'MMM dd, yyyy')}`
                    : '-'}
                </span></div>
              </div>
            </div>

            <div>
              <Label htmlFor="doc-notes">Documentation Notes (Optional)</Label>
              <Textarea
                id="doc-notes"
                value={documentNotes}
                onChange={(e) => setDocumentNotes(e.target.value)}
                placeholder="Add any notes about this traceability documentation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkToEUDR} disabled={linking}>
              {linking ? 'Creating...' : 'Create EUDR Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EUDRInventoryLinking;
