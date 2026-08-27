import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, UserCheck, Coffee, Gift, Search } from 'lucide-react';
import { useGrnReferrals, useCanReleasePayments } from '@/hooks/useGrnReferrals';
import { useIsGrnInputOnly } from '@/hooks/useGrnInputRole';
import { getGrnPayCode } from '@/utils/grnPayCode';

const money = (n?: number | null) => `UGX ${Number(n || 0).toLocaleString()}`;
const dt = (v?: string | null) => (v ? new Date(v).toLocaleString('en-GB') : '—');

const GrnReferralsTab = () => {
  const navigate = useNavigate();
  const canPay = useCanReleasePayments();
  const { referrals, loading, myEmail, assignedToMe, referredByMe, cancelReferral } = useGrnReferrals();
  const scanOnly = useIsGrnInputOnly();
  const [scope, setScope] = useState<'mine' | 'pending' | 'all'>(canPay && !scanOnly ? 'mine' : scanOnly ? 'mine' : 'pending');
  const [search, setSearch] = useState('');
  const [opening, setOpening] = useState<string | null>(null);

  const rows = useMemo(() => {
    // GRN input officers only ever see the referrals they themselves sent
    if (scanOnly) {
      const q0 = search.trim().toLowerCase();
      return q0
        ? referredByMe.filter((r) =>
            [r.batch_number, r.supplier_name, r.assigned_to_name, r.assigned_to_email]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q0))
          )
        : referredByMe;
    }
    const base =
      scope === 'mine'
        ? canPay
          ? assignedToMe
          : referredByMe
        : scope === 'pending'
        ? referrals.filter((r) => r.status === 'pending')
        : referrals;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) =>
      [r.batch_number, r.supplier_name, r.referred_by_name, r.referred_by_email, r.assigned_to_name, r.assigned_to_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [scope, canPay, assignedToMe, referredByMe, referrals, search]);

  const openForPayment = async (batch: string, id: string) => {
    setOpening(id);
    try {
      const code = await getGrnPayCode(batch).catch(() => null);
      navigate(`/grn/${encodeURIComponent(code || batch)}`);
    } finally {
      setOpening(null);
    }
  };

  const myEarnings = referredByMe.reduce((s, r) => s + Number(r.referrer_reward_ugx || 0), 0);
  const pendingCount = referrals.filter((r) => r.status === 'pending').length;
  const pendingValue = referrals
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + Number(r.amount_ugx || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Awaiting my payment</p>
              <p className="text-xl font-bold">{canPay ? assignedToMe.length : '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Coffee className="h-7 w-7 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Pending referrals</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Pending value</p>
              <p className="text-lg font-bold">{money(pendingValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Gift className="h-7 w-7 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">My referral rewards</p>
              <p className="text-lg font-bold">{money(myEarnings)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4" /> GRN Referrals ({rows.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                GRNs scanned and submitted by staff who cannot release money. Open one to pay it and print the
                payment receipt — both the person who scanned it and you are rewarded.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Batch, supplier, staff…"
                  className="h-9 pl-7 w-52 text-xs"
                />
              </div>
              <Tabs value={scope} onValueChange={(v) => setScope(v as any)}>
                <TabsList className="h-9">
                  <TabsTrigger value="mine" className="text-xs px-2">
                    {canPay ? 'Assigned to me' : 'Sent by me'}
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs px-2">Pending</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No referrals here yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">GRN / Batch</TableHead>
                    <TableHead className="text-xs">Supplier</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Scanned by</TableHead>
                    <TableHead className="text-xs">Assigned to</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <span className="font-medium">GRN-{r.batch_number}</span>
                        <span className="block text-[11px] text-muted-foreground">{dt(r.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">
                        {r.supplier_name || '—'}
                        {r.coffee_type ? <span className="block text-[11px] text-muted-foreground">{r.coffee_type}</span> : null}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">{money(r.amount_ugx)}</TableCell>
                      <TableCell className="text-xs max-w-[130px] truncate">
                        {r.referred_by_name || r.referred_by_email}
                        {r.status === 'paid' && r.referrer_reward_ugx > 0 && (
                          <span className="block text-[11px] text-green-700">+{money(r.referrer_reward_ugx)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[130px] truncate">
                        {r.assigned_to_name || r.assigned_to_email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === 'paid' ? 'default' : r.status === 'cancelled' ? 'outline' : 'secondary'}
                          className={r.status === 'paid' ? 'bg-green-600 text-[10px]' : 'text-[10px]'}
                        >
                          {r.status === 'paid'
                            ? `PAID ${r.paid_at ? dt(r.paid_at) : ''}`.trim()
                            : r.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'pending' ? (
                          <div className="flex justify-end gap-1">
                            {canPay && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                disabled={opening === r.id}
                                onClick={() => openForPayment(r.batch_number, r.id)}
                              >
                                {opening === r.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CreditCard className="h-3 w-3" />
                                )}
                                Pay
                              </Button>
                            )}
                            {r.referred_by_email.toLowerCase() === myEmail && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => cancelReferral(r.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => openForPayment(r.batch_number, r.id)}
                          >
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GrnReferralsTab;
