import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Ship, PackagePlus, Warehouse, FileSignature, AlertTriangle, Banknote } from 'lucide-react';
import { useV3Roles, V3_ROLE_LABELS } from '@/hooks/useV3Roles';

function Stat({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: any; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function V3Dashboard() {
  const { roles, isV3Admin } = useV3Roles();

  const { data, isLoading } = useQuery({
    queryKey: ['v3-dashboard'],
    queryFn: async () => {
      const [receiving, stock, shipments, contracts, payments, audit] = await Promise.all([
        supabase.from('v3_receiving_records').select('id,status,net_weight,total_amount'),
        supabase.from('v3_stock_batches').select('id,state,kilograms'),
        supabase.from('v3_export_shipments').select('id,status,planned_kg,loaded_kg,etd'),
        supabase.from('v3_contracts').select('id,quantity_kg,allocated_kg,shipped_kg,status'),
        supabase.from('v3_payments').select('id,status,amount'),
        supabase.from('v3_audit_log').select('id,action,entity_type,actor_name,created_at').order('created_at', { ascending: false }).limit(8),
      ]);
      return {
        receiving: receiving.data || [],
        stock: stock.data || [],
        shipments: shipments.data || [],
        contracts: contracts.data || [],
        payments: payments.data || [],
        audit: audit.data || [],
      };
    },
    refetchInterval: 60000,
  });

  const pendingApprovals = (data?.receiving || []).filter((r: any) => r.status === 'awaiting_approval').length;
  const exportReadyKg = (data?.stock || []).filter((s: any) => s.state === 'export_ready').reduce((a: number, s: any) => a + Number(s.kilograms || 0), 0);
  const totalStockKg = (data?.stock || []).reduce((a: number, s: any) => a + Number(s.kilograms || 0), 0);
  const activeShipments = (data?.shipments || []).filter((s: any) => !['closed', 'cancelled', 'delivered'].includes(s.status)).length;
  const openContractKg = (data?.contracts || []).filter((c: any) => c.status === 'active')
    .reduce((a: number, c: any) => a + (Number(c.quantity_kg || 0) - Number(c.shipped_kg || 0)), 0);
  const pendingPay = (data?.payments || []).filter((p: any) => ['draft', 'pending_approval', 'approved'].includes(p.status))
    .reduce((a: number, p: any) => a + Number(p.amount || 0), 0);

  return (
    <V3Layout title="Executive Dashboard" description="Company-wide position across purchases, stock, contracts and shipments">
      {roles.length === 0 && !isV3Admin && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            You have no V3 role assigned yet. Ask an administrator to assign your role in
            <span className="font-medium"> Administration → Roles</span>.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Purchases awaiting approval" value={pendingApprovals} icon={PackagePlus} hint="Receiving records" />
          <Stat label="Total stock" value={`${totalStockKg.toLocaleString()} kg`} icon={Warehouse} hint={`${exportReadyKg.toLocaleString()} kg export ready`} />
          <Stat label="Active shipments" value={activeShipments} icon={Ship} hint="Planned to shipped" />
          <Stat label="Open contract balance" value={`${openContractKg.toLocaleString()} kg`} icon={FileSignature} hint="Contracted less shipped" />
          <Stat label="Payments outstanding" value={`UGX ${pendingPay.toLocaleString()}`} icon={Banknote} hint="Draft, pending and approved" />
          <Stat label="Your roles" value={roles.length || (isV3Admin ? 1 : 0)} icon={AlertTriangle} hint={roles.map((r) => V3_ROLE_LABELS[r]).join(', ') || 'Administrator'} />
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent audit activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data?.audit || []).length === 0 && <p className="text-sm text-muted-foreground">No audit entries recorded yet.</p>}
          {(data?.audit || []).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
              <div className="min-w-0">
                <p className="truncate">{a.action}</p>
                <p className="text-xs text-muted-foreground">{a.actor_name || 'System'} · {a.entity_type}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {new Date(a.created_at).toLocaleString()}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </V3Layout>
  );
}