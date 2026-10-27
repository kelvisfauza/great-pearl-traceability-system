import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { procurementWeek, summarizeProcurement, priceChange, type PurchaseDelivery } from '@/lib/procurementAnalytics';

export default function ProcurementAnalytics({ deliveries, loading, error }: { deliveries: PurchaseDelivery[]; loading: boolean; error: string | null }) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const week = procurementWeek(today);
  const current = summarizeProcurement(deliveries, week.start, week.end);
  const previous = summarizeProcurement(deliveries, week.previousStart, week.start);
  const weekEnd = new Date(`${week.end}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() - 1);
  const dateRange = `${week.start} – ${weekEnd.toISOString().slice(0, 10)}`;
  const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const state = error ?? (loading ? 'Loading saved purchases…' : current.length === 0 ? 'No store purchases recorded this week' : null);
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader><CardTitle>Weekly Procurement Summary</CardTitle><CardDescription>Store deliveries · {dateRange}</CardDescription></CardHeader>
      <CardContent>{state ? <p className="py-8 text-center text-muted-foreground">{state}</p> :
        <Table><TableHeader><TableRow><TableHead>Coffee type</TableHead><TableHead>Deliveries</TableHead><TableHead>Bags</TableHead><TableHead className="text-right">Kilograms</TableHead></TableRow></TableHeader>
          <TableBody>{current.map(group => <TableRow key={group.coffeeType}><TableCell className="capitalize">{group.coffeeType}</TableCell><TableCell>{group.deliveries}</TableCell><TableCell>{number(group.bags)}</TableCell><TableCell className="text-right">{number(group.kilograms)}</TableCell></TableRow>)}
            <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell>{current.reduce((sum, group) => sum + group.deliveries, 0)}</TableCell><TableCell>{number(current.reduce((sum, group) => sum + group.bags, 0))}</TableCell><TableCell className="text-right">{number(current.reduce((sum, group) => sum + group.kilograms, 0))}</TableCell></TableRow>
          </TableBody></Table>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Price Analysis</CardTitle><CardDescription>Saved buying prices · weighted average UGX/kg · {dateRange}</CardDescription></CardHeader>
      <CardContent>{state ? <p className="py-8 text-center text-muted-foreground">{state}</p> : <div className="space-y-4">{current.map(group => {
        const prior = previous.find(item => item.coffeeType === group.coffeeType);
        const change = priceChange(group.averagePrice, prior?.averagePrice ?? null);
        return <div key={group.coffeeType} className="flex flex-wrap justify-between items-center gap-3 p-3 border rounded">
          <div><p className="font-medium capitalize">{group.coffeeType}</p><p className="text-sm">{group.averagePrice == null ? 'No saved buying price' : `UGX ${number(group.averagePrice)}/kg`}</p><p className="text-xs text-muted-foreground">Priced: {number(group.pricedKg)} of {number(group.kilograms)} kg</p><p className="text-xs text-muted-foreground">Previous week: {prior?.averagePrice == null ? '—' : `UGX ${number(prior.averagePrice)}/kg`}</p></div>
          {change == null ? <span className="text-xs text-muted-foreground">No comparison</span> : <Badge variant="secondary">{change > 0 ? '+' : ''}{change.toFixed(1)}%</Badge>}
        </div>;
      })}</div>}</CardContent>
    </Card>
  </div>;
}