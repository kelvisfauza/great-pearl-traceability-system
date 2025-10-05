import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { useSupplierAdvances } from '@/hooks/useSupplierAdvances';
import { useSuppliers } from '@/hooks/useSuppliers';
import { format } from 'date-fns';

export const SupplierAdvancesPage = () => {
  const { advances, loading: advancesLoading } = useSupplierAdvances();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  // Get unique suppliers with advances and calculate totals
  const suppliersWithAdvances = React.useMemo(() => {
    const supplierMap = new Map<string, {
      id: string;
      name: string;
      code: string;
      totalAdvanced: number;
      totalOutstanding: number;
      advanceCount: number;
    }>();

    advances.forEach(advance => {
      const supplierId = advance.supplier_id;
      const supplierName = advance.supplier_name || 'Unknown';
      const supplierCode = advance.supplier_code || '';

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          id: supplierId,
          name: supplierName,
          code: supplierCode,
          totalAdvanced: 0,
          totalOutstanding: 0,
          advanceCount: 0
        });
      }

      const supplier = supplierMap.get(supplierId)!;
      supplier.totalAdvanced += Number(advance.amount_ugx);
      supplier.totalOutstanding += Number(advance.outstanding_ugx);
      supplier.advanceCount += 1;
    });

    return Array.from(supplierMap.values()).sort((a, b) => 
      b.totalOutstanding - a.totalOutstanding
    );
  }, [advances]);

  // Get advances for selected supplier
  const supplierAdvances = React.useMemo(() => {
    if (!selectedSupplier) return [];
    return advances
      .filter(adv => adv.supplier_id === selectedSupplier)
      .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
  }, [advances, selectedSupplier]);

  const selectedSupplierData = suppliersWithAdvances.find(s => s.id === selectedSupplier);

  const loading = advancesLoading || suppliersLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier Advances</CardTitle>
          <CardDescription>Loading supplier advance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Supplier Detail View
  if (selectedSupplier && selectedSupplierData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {selectedSupplierData.name} - Advance History
              </CardTitle>
              <CardDescription>
                Code: {selectedSupplierData.code} | Total Outstanding: {formatCurrency(selectedSupplierData.totalOutstanding)}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedSupplier(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Suppliers
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {supplierAdvances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No advances found for this supplier
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Total Advanced</div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedSupplierData.totalAdvanced)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Outstanding</div>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(selectedSupplierData.totalOutstanding)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Advances</div>
                  <div className="text-2xl font-bold">{selectedSupplierData.advanceCount}</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Issued</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount Advanced</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierAdvances.map((advance) => {
                    const isFullyPaid = advance.is_closed || Number(advance.outstanding_ugx) === 0;
                    
                    return (
                      <TableRow key={advance.id}>
                        <TableCell>
                          {format(new Date(advance.issued_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {advance.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(advance.amount_ugx))}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={isFullyPaid ? 'text-green-600' : 'text-orange-600'}>
                            {formatCurrency(Number(advance.outstanding_ugx))}
                          </span>
                        </TableCell>
                        <TableCell>{advance.issued_by}</TableCell>
                        <TableCell>
                          <Badge variant={isFullyPaid ? 'default' : 'secondary'}>
                            {isFullyPaid ? 'Fully Paid' : 'Active'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Supplier List View
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Supplier Advances Management
        </CardTitle>
        <CardDescription>
          View and manage supplier advances. Click on a supplier to see detailed advance history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suppliersWithAdvances.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Advances Found</h3>
            <p className="text-muted-foreground">
              No supplier advances have been issued yet.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Total Advanced</TableHead>
                <TableHead className="text-right">Total Outstanding</TableHead>
                <TableHead className="text-center">Active Advances</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersWithAdvances.map((supplier) => {
                const hasOutstanding = supplier.totalOutstanding > 0;
                
                return (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.code}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(supplier.totalAdvanced)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={hasOutstanding ? 'text-orange-600 font-semibold' : 'text-green-600'}>
                        {formatCurrency(supplier.totalOutstanding)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={hasOutstanding ? 'secondary' : 'outline'}>
                        {supplier.advanceCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSupplier(supplier.id)}
                      >
                        View History
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
