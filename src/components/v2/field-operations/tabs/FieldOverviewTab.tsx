import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Users, Package } from "lucide-react";

const FieldOverviewTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['field-overview'],
    queryFn: async () => {
      const [agents, farmers, purchases] = await Promise.all([
        supabase.from('field_agents').select('*').eq('status', 'active'),
        supabase.from('farmer_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('field_purchases').select('kgs_purchased'),
      ]);
      const totalKg = purchases.data?.reduce((s, p) => s + (p.kgs_purchased || 0), 0) || 0;
      return { agents: agents.data?.length || 0, totalFarmers: farmers.count || 0, totalKg, totalPurchases: purchases.data?.length || 0 };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <Card><CardContent className="p-4 text-center"><Users className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Active Agents</p><p className="text-2xl font-bold">{data?.agents}</p></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><MapPin className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Farmers</p><p className="text-2xl font-bold">{data?.totalFarmers}</p></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Purchases</p><p className="text-2xl font-bold">{data?.totalPurchases}</p></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-orange-500" /><p className="text-sm text-muted-foreground">Total Kg</p><p className="text-2xl font-bold">{data?.totalKg.toLocaleString()}</p></CardContent></Card>
    </div>
  );
};

export default FieldOverviewTab;
