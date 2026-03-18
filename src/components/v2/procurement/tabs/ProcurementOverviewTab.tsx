import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, Package, FileText, TrendingUp } from "lucide-react";

const ProcurementOverviewTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-overview'],
    queryFn: async () => {
      const [suppliers, contracts, bookings] = await Promise.all([
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
        supabase.from('supplier_contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('coffee_bookings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      return {
        totalSuppliers: suppliers.count || 0,
        activeContracts: contracts.count || 0,
        activeBookings: bookings.count || 0,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const cards = [
    { label: "Total Suppliers", value: data?.totalSuppliers || 0, icon: Users, color: "text-blue-500" },
    { label: "Active Contracts", value: data?.activeContracts || 0, icon: FileText, color: "text-green-500" },
    { label: "Active Bookings", value: data?.activeBookings || 0, icon: Package, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      {cards.map(c => (
        <Card key={c.label}><CardContent className="p-4 flex items-center gap-3">
          <c.icon className={`h-8 w-8 ${c.color}`} />
          <div><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-2xl font-bold">{c.value}</p></div>
        </CardContent></Card>
      ))}
    </div>
  );
};

export default ProcurementOverviewTab;
