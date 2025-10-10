import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Filter,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  ArrowLeft,
  Phone,
  MapPin,
  Edit
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EditSupplierModal } from "@/components/suppliers/EditSupplierModal";

interface SupplierTransaction {
  id: string;
  date: string;
  batch_number: string;
  coffee_type: string;
  kilograms: number;
  bags: number;
  status: string;
  payment_amount?: number;
  payment_status?: string;
}

const Suppliers = () => {
  const { suppliers, loading: suppliersLoading, updateSupplier } = useSuppliers();
  const { toast } = useToast();
  
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [coffeeTypeFilter, setCoffeeTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleEditSupplier = async (supplierId: string, updates: { name: string; phone: string; origin: string }) => {
    console.log('🔧 Editing supplier and reloading transactions...', { 
      supplierId, 
      oldName: selectedSupplier?.name,
      updates 
    });
    
    try {
      await updateSupplier(supplierId, updates);
      
      // Update selected supplier with new data
      if (selectedSupplier?.id === supplierId) {
        const updatedSupplier = { ...selectedSupplier, ...updates };
        console.log('📝 Updated supplier object:', updatedSupplier);
        setSelectedSupplier(updatedSupplier);
        
        // Wait a moment then reload transactions with the updated supplier info
        console.log('⏳ Waiting for database to propagate changes...');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        console.log('🔄 Reloading transactions for updated supplier...');
        await loadSupplierTransactions(supplierId);
        console.log('✅ Supplier updated and transactions reloaded');
      }
    } catch (error) {
      console.error('❌ Error in handleEditSupplier:', error);
      toast({
        title: "Error",
        description: "Failed to update supplier and reload transactions",
        variant: "destructive"
      });
    }
  };

  // Debug log
  useEffect(() => {
    console.log('📊 Suppliers page - suppliers data:', suppliers);
    console.log('📊 Suppliers page - loading state:', suppliersLoading);
    console.log('📊 Suppliers count:', suppliers?.length);
  }, [suppliers, suppliersLoading]);

  // Load transactions when supplier is selected
  useEffect(() => {
    if (selectedSupplier) {
      loadSupplierTransactions(selectedSupplier.id);
    }
  }, [selectedSupplier]);

  const loadSupplierTransactions = async (supplierId: string) => {
    setLoadingTransactions(true);
    try {
      console.log('🔍 Loading transactions for supplier:', { 
        id: supplierId, 
        name: selectedSupplier?.name,
        code: selectedSupplier?.code 
      });
      const cutoffDate = '2025-10-01';
      const currentName = selectedSupplier?.name?.toLowerCase() || '';
      
      // Strategy: Fetch ALL coffee records from Oct 1st onwards, then filter by supplier
      // This ensures we catch records regardless of how they're linked
      
      // Get ALL coffee records from Supabase (from Oct 1, 2025 onwards)
      const { data: allSupabaseCoffee, error: supabaseError } = await supabase
        .from('coffee_records')
        .select('*')
        .gte('date', cutoffDate)
        .order('date', { ascending: false });

      if (supabaseError) console.error('Supabase error:', supabaseError);
      
      // Filter to match this supplier by ID, name, or code
      // Also check for similar names (e.g., "Jelema" when viewing "Jeremiah")
      const supabaseRecords = (allSupabaseCoffee || []).filter(record => {
        const recordName = record.supplier_name?.toLowerCase() || '';
        return (
          record.supplier_id === supplierId ||
          recordName === currentName ||
          recordName.includes(currentName) ||
          currentName.includes(recordName) ||
          // Check for "Jelema" when viewing "Jeremiah" (edit case)
          (currentName === 'jeremiah' && recordName === 'jelema')
        );
      });
      
      console.log('📦 Supabase coffee records matching supplier:', supabaseRecords.length);

      // Fetch ALL Firebase records from Oct 1st onwards
      let firebaseCoffeeRecords: any[] = [];
      
      try {
        const allFirebaseQuery = query(
          collection(db, 'coffee_records')
        );
        const allFirebaseSnapshot = await getDocs(allFirebaseQuery);
        
        // Filter to match this supplier and date
        firebaseCoffeeRecords = allFirebaseSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              date: data.date || '',
              batch_number: data.batch_number || '',
              coffee_type: data.coffee_type || '',
              kilograms: Number(data.kilograms) || 0,
              bags: Number(data.bags) || 0,
              status: data.status || 'pending',
              supplier_id: data.supplier_id,
              supplier_name: data.supplier_name
            };
          })
          .filter(record => {
            const matchesDate = record.date >= cutoffDate;
            const recordName = record.supplier_name?.toLowerCase() || '';
            const matchesSupplier = 
              record.supplier_id === supplierId ||
              recordName === currentName ||
              recordName.includes(currentName) ||
              currentName.includes(recordName) ||
              // Check for "Jelema" when viewing "Jeremiah" (edit case)
              (currentName === 'jeremiah' && recordName === 'jelema');
            
            return matchesDate && matchesSupplier;
          });
        
        console.log('🔥 Firebase records matching supplier:', firebaseCoffeeRecords.length);
      } catch (firebaseError) {
        console.error('Firebase query error:', firebaseError);
      }

      // Combine all sources and remove duplicates
      const allCoffeeRecords = [
        ...supabaseRecords, 
        ...firebaseCoffeeRecords
      ];
      
      // Remove duplicates based on batch_number
      const uniqueRecords = allCoffeeRecords.filter((record, index, self) =>
        index === self.findIndex((r) => r.batch_number === record.batch_number)
      );
      
      console.log('📊 Total unique coffee records for this supplier:', uniqueRecords.length);
      if (uniqueRecords.length > 0) {
        console.log('Sample record:', uniqueRecords[0]);
      }

      // Get payment records from both sources
      const batchNumbers = uniqueRecords.map(r => r.batch_number);
      
      // Supabase payments
      const { data: supabasePayments } = await supabase
        .from('payment_records')
        .select('*')
        .in('batch_number', batchNumbers);

      // Firebase payments
      const paymentsQuery = query(
        collection(db, 'payment_records'),
        where('batch_number', 'in', batchNumbers.length > 0 ? batchNumbers : [''])
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      const firebasePayments = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          batch_number: data.batch_number,
          amount: Number(data.amount) || 0,
          status: data.status || 'Pending'
        };
      });

      const allPayments = [...(supabasePayments || []), ...firebasePayments];

      // Merge the data
      const transactionsData: SupplierTransaction[] = uniqueRecords.map(record => {
        const payment = allPayments.find(p => p.batch_number === record.batch_number);
        return {
          id: record.id,
          date: record.date,
          batch_number: record.batch_number,
          coffee_type: record.coffee_type,
          kilograms: record.kilograms,
          bags: record.bags,
          status: record.status,
          payment_amount: payment?.amount,
          payment_status: payment?.status
        };
      });

      console.log(`✅ Loaded ${transactionsData.length} transactions for supplier ${supplierId}`);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading supplier transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load supplier transactions",
        variant: "destructive"
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Filter suppliers by search query
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    
    return suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.origin.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [suppliers, searchQuery]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(t => t.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(t => t.date <= dateTo);
    }

    // Coffee type filter
    if (coffeeTypeFilter !== "all") {
      filtered = filtered.filter(t => t.coffee_type.toLowerCase().includes(coffeeTypeFilter.toLowerCase()));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    return filtered;
  }, [transactions, dateFrom, dateTo, coffeeTypeFilter, statusFilter]);

  // Calculate statistics for selected supplier
  const supplierStats = useMemo(() => {
    if (!selectedSupplier || filteredTransactions.length === 0) {
      return {
        totalKilograms: 0,
        totalBags: 0,
        totalTransactions: 0,
        totalPayments: 0,
        pendingPayments: 0
      };
    }

    return {
      totalKilograms: filteredTransactions.reduce((sum, t) => sum + t.kilograms, 0),
      totalBags: filteredTransactions.reduce((sum, t) => sum + t.bags, 0),
      totalTransactions: filteredTransactions.length,
      totalPayments: filteredTransactions.reduce((sum, t) => sum + (t.payment_amount || 0), 0),
      pendingPayments: filteredTransactions.filter(t => t.payment_status === 'Pending').length
    };
  }, [selectedSupplier, filteredTransactions]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'pending': 'secondary',
      'assessed': 'default',
      'paid': 'default'
    };
    
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'assessed': 'Assessed',
      'paid': 'Paid'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">No Payment</Badge>;
    
    const variants: Record<string, any> = {
      'Pending': 'secondary',
      'Paid': 'default',
      'completed': 'default'
    };

    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (suppliersLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading suppliers...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suppliers Management</h1>
            <p className="text-muted-foreground mt-1">
              View and manage supplier information and transactions
            </p>
          </div>
          {selectedSupplier && (
            <Button variant="outline" onClick={() => setSelectedSupplier(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          )}
        </div>

        {/* List View */}
        {!selectedSupplier && (
          <div className="space-y-4">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle>Search Suppliers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, code, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suppliers List */}
            <Card>
              <CardHeader>
                <CardTitle>All Suppliers ({filteredSuppliers.length})</CardTitle>
                <CardDescription>Click on a supplier to view detailed information</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSuppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Suppliers Found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Try adjusting your search criteria" : "No suppliers registered yet"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Date Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-mono font-medium">{supplier.code}</TableCell>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {supplier.origin}
                            </div>
                          </TableCell>
                          <TableCell>
                            {supplier.phone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                {supplier.phone}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{supplier.date_registered}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => setSelectedSupplier(supplier)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detail View */}
        {selectedSupplier && (
          <div className="space-y-4">
            {/* Supplier Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedSupplier.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="font-mono">{selectedSupplier.code}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Info
                    </Button>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Supplier
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedSupplier.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedSupplier.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Registered</p>
                      <p className="font-medium">{selectedSupplier.date_registered}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Kilograms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold">{supplierStats.totalKilograms.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Bags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold">{supplierStats.totalBags.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold">{supplierStats.totalTransactions}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <p className="text-2xl font-bold">UGX {supplierStats.totalPayments.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <p className="text-2xl font-bold">{supplierStats.pendingPayments}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Transaction Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="dateFrom">Date From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Date To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="coffeeType">Coffee Type</Label>
                    <Select value={coffeeTypeFilter} onValueChange={setCoffeeTypeFilter}>
                      <SelectTrigger id="coffeeType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="arabica">Arabica</SelectItem>
                        <SelectItem value="robusta">Robusta</SelectItem>
                        <SelectItem value="drugar">Drugar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assessed">Assessed</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(dateFrom || dateTo || coffeeTypeFilter !== "all" || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setCoffeeTypeFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction History ({filteredTransactions.length})</CardTitle>
                <CardDescription>All coffee deliveries from this supplier</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTransactions ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                    <p className="text-muted-foreground">
                      {dateFrom || dateTo || coffeeTypeFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "No transactions recorded yet"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Kilograms</TableHead>
                        <TableHead>Bags</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell className="font-mono">{transaction.batch_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.coffee_type}</Badge>
                          </TableCell>
                          <TableCell>{transaction.kilograms.toLocaleString()} kg</TableCell>
                          <TableCell>{transaction.bags}</TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell>
                            {transaction.payment_amount ? (
                              <span className="font-medium">
                                UGX {transaction.payment_amount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getPaymentStatusBadge(transaction.payment_status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Supplier Modal */}
      <EditSupplierModal
        supplier={selectedSupplier}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleEditSupplier}
      />
    </Layout>
  );
};

export default Suppliers;
