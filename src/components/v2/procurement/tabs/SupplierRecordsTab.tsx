import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Users, Search, Phone, MapPin } from "lucide-react";

const SupplierRecordsTab = () => {
  const [search, setSearch] = useState("");

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['procurement-suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const filtered = suppliers?.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.supplier_code?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  ) || [];

  const activeCount = suppliers?.filter((s: any) => s.status === 'active').length || 0;
  const inactiveCount = (suppliers?.length || 0) - activeCount;
  const withBankDetails = suppliers?.filter((s: any) => s.bank_name && s.account_number).length || 0;
  const missingBank = (suppliers?.length || 0) - withBankDetails;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />Supplier Records Management
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Suppliers</p>
          <p className="text-2xl font-bold">{suppliers?.length || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="text-2xl font-bold text-orange-600">{inactiveCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Missing Bank Info</p>
          <p className="text-2xl font-bold text-red-600">{missingBank}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Supplier Directory ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Bank Info</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.supplier_code || '—'}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    {s.phone ? (
                      <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{s.phone}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {s.location ? (
                      <span className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" />{s.location}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {s.bank_name && s.account_number ? (
                      <Badge variant="secondary">Complete</Badge>
                    ) : (
                      <Badge variant="destructive">Incomplete</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'active' ? 'secondary' : 'outline'}>
                      {s.status || 'active'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No suppliers found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierRecordsTab;
