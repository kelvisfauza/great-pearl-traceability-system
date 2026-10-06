import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const ugx = (n: number) => `UGX ${Math.round(Number(n) || 0).toLocaleString()}`;
const TYPE_LABEL: Record<string, string> = {
  provider: 'Meal plan / provider', withdrawal: 'Staff withdrawal', supplier: 'Supplier coffee', expense: 'Expense request',
};

/** Admins, Finance and Procurement follow every stage of payments paid in parts. */
const PaymentTracker: React.FC = () => {
  const [filter, setFilter] = useState<'open' | 'paid' | 'all'>('open');
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['payment-tracker', filter],
    queryFn: async () => {
      let q = (supabase as any).from('partial_payments').select('*, partial_payment_installments(*)').order('updated_at', { ascending: false }).limit(300);
      if (filter === 'open') q = q.eq('status', 'part_paid');
      if (filter === 'paid') q = q.eq('status', 'fully_paid');
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const rows = (data as any[]).filter((r) =>
    !search || `${r.payee_name} ${r.title}`.toLowerCase().includes(search.toLowerCase()));
  const outstanding = rows.filter((r) => r.status === 'part_paid').reduce((s, r) => s + Number(r.balance), 0);

  return (
    <Layout title="Payment Tracker" subtitle="Every stage of approved payments, including part payments and balances left">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="open">Balance left</TabsTrigger>
              <TabsTrigger value="paid">Fully paid</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input className="max-w-xs" placeholder="Search name or payment" value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-sm">Total balance still owed: <strong>{ugx(outstanding)}</strong></p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
        {rows.map((r) => {
          const inst = [...(r.partial_payment_installments || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
          const full = r.status === 'fully_paid';
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  {r.payee_name} — {r.title}
                  <Badge variant="secondary">{TYPE_LABEL[r.source_type] || r.source_type}</Badge>
                  <Badge variant={full ? 'default' : 'outline'}>{full ? 'Fully paid' : 'Part paid'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-4">
                  <span>Total {ugx(r.total_amount)}</span>
                  <span>Paid {ugx(r.paid_amount)}</span>
                  <span className="font-semibold">Balance {ugx(r.balance)}</span>
                </div>
                <Progress value={(Number(r.paid_amount) / Number(r.total_amount)) * 100} className="h-2" />
                <ol className="space-y-1.5">
                  <li className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                    Approved by Admin{r.approved_by_name ? ` (${r.approved_by_name})` : ''} — sent to Finance</li>
                  {inst.map((i: any, idx: number) => (
                    <li key={i.id} className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>
                        {i.balance_after <= 0 ? (idx === 0 ? 'Paid in full' : 'Balance paid') : `Part payment ${idx + 1}`}: <strong>{ugx(i.amount)}</strong> by {i.method}
                        {i.reference ? ` (ref ${i.reference})` : ''} — {i.paid_by_name}, {new Date(i.created_at).toLocaleString()} · balance left {ugx(i.balance_after)} · confirmations sent
                      </span>
                    </li>
                  ))}
                  {!full && (
                    <li className="flex gap-2 items-start text-muted-foreground"><Circle className="h-4 w-4 mt-0.5" />
                      Waiting for accounts to be funded — Finance pays the remaining {ugx(r.balance)}</li>
                  )}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
};

export default PaymentTracker;
