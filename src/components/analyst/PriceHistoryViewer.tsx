import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, History, Search, X } from 'lucide-react';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { format, parseISO } from 'date-fns';

const PriceHistoryViewer: React.FC = () => {
  // Pull a wide window so the date filter can reach back further
  const { history, loading } = usePriceHistory(365);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const sorted = useMemo(
    () => [...history].sort((a, b) => (a.price_date < b.price_date ? 1 : -1)),
    [history]
  );

  const displayed = useMemo(() => {
    if (selectedDate) return sorted.filter(r => r.price_date === selectedDate);
    return sorted.slice(0, 10);
  }, [sorted, selectedDate]);

  const fmt = (n: number | null | undefined) =>
    n == null ? '—' : `UGX ${Number(n).toLocaleString()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Price History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Showing the last 10 recorded prices. Pick a date to look up a specific day.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Label htmlFor="price-history-date">Look up a specific date</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="price-history-date"
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              {selectedDate && (
                <Button variant="outline" size="icon" onClick={() => setSelectedDate('')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Search className="h-4 w-4" />
            {selectedDate ? `Filtered: ${selectedDate}` : 'Latest 10 entries'}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            {selectedDate
              ? `No price record found for ${selectedDate}.`
              : 'No price history available yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Drugar (Local)</th>
                  <th className="p-2">Wugar (Local)</th>
                  <th className="p-2">Robusta FAQ</th>
                  <th className="p-2">Arabica Buying</th>
                  <th className="p-2">Robusta Buying</th>
                  <th className="p-2">ICE Arabica</th>
                  <th className="p-2">Robusta Intl</th>
                  <th className="p-2">FX Rate</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium">
                      {format(parseISO(r.price_date), 'dd MMM yyyy')}
                    </td>
                    <td className="p-2">{fmt(r.drugar_local)}</td>
                    <td className="p-2">{fmt(r.wugar_local)}</td>
                    <td className="p-2">{fmt(r.robusta_faq_local)}</td>
                    <td className="p-2">{fmt(r.arabica_buying_price)}</td>
                    <td className="p-2">{fmt(r.robusta_buying_price)}</td>
                    <td className="p-2">{r.ice_arabica ?? '—'}</td>
                    <td className="p-2">{r.robusta_international ?? '—'}</td>
                    <td className="p-2">{r.exchange_rate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceHistoryViewer;