import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, Search, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";

const BookingsTab = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['procurement-bookings-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const filtered = bookings?.filter((b: any) => {
    const matchSearch = !search || b.supplier_name?.toLowerCase().includes(search.toLowerCase()) || b.coffee_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const totalBooked = filtered.reduce((s, b: any) => s + (b.booked_quantity_kg || 0), 0);
  const totalDelivered = filtered.reduce((s, b: any) => s + (b.delivered_quantity_kg || 0), 0);
  const totalValue = filtered.reduce((s, b: any) => s + (b.booked_quantity_kg || 0) * (b.booked_price_per_kg || 0), 0);

  const statusColors: Record<string, string> = {
    active: 'default',
    partially_fulfilled: 'secondary',
    fulfilled: 'outline',
    expired: 'destructive',
    cancelled: 'destructive',
    closed: 'secondary',
  };

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BookOpen className="h-5 w-5" />Coffee Bookings (Hedging)
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Bookings</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Booked</p>
          <p className="text-2xl font-bold">{(totalBooked / 1000).toFixed(1)}t</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Delivered</p>
          <p className="text-2xl font-bold">{(totalDelivered / 1000).toFixed(1)}t</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold">UGX {(totalValue / 1000000).toFixed(1)}M</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search supplier or coffee type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="partially_fulfilled">Partial</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Booked (kg)</TableHead>
              <TableHead>Delivered (kg)</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Price/kg</TableHead>
              <TableHead>Booking Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((b: any) => {
                const remaining = (b.remaining_quantity_kg ?? (b.booked_quantity_kg - b.delivered_quantity_kg)) || 0;
                const isExpired = b.expiry_date && new Date(b.expiry_date) < new Date();
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.supplier_name}</TableCell>
                    <TableCell>
                      {b.supplier_phone ? (
                        <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{b.supplier_phone}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{b.coffee_type}</Badge></TableCell>
                    <TableCell>{(b.booked_quantity_kg || 0).toLocaleString()}</TableCell>
                    <TableCell>{(b.delivered_quantity_kg || 0).toLocaleString()}</TableCell>
                    <TableCell className={remaining > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                      {remaining.toLocaleString()}
                    </TableCell>
                    <TableCell>UGX {(b.booked_price_per_kg || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{b.booking_date ? format(new Date(b.booking_date), 'dd MMM yy') : '—'}</TableCell>
                    <TableCell className={`text-xs ${isExpired ? 'text-destructive font-medium' : ''}`}>
                      {b.expiry_date ? format(new Date(b.expiry_date), 'dd MMM yy') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[b.status] as any || 'outline'}>{b.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No bookings found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingsTab;
