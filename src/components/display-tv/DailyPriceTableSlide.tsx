import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildStationPriceRows, type StationPriceTableRow } from '@/utils/stationPrices';

interface PublicPrices { rows: StationPriceTableRow[]; lastUpdated: string | null; ice?: number; robusta?: number; fx?: number }

export const useDisplayPublicPrices = () => {
  const [data, setData] = useState<PublicPrices | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: row, error } = await (supabase as any).rpc('display_public_prices');
      if (!active) return;
      if (error || !row) { setFailed(true); return; }
      setFailed(false);
      setData({ rows: buildStationPriceRows(row, row.station_params), lastUpdated: row.last_updated, ice: row.ice_arabica, robusta: row.robusta, fx: row.exchange_rate });
    };
    void load();
    const t = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(t); };
  }, []);
  return { data, failed };
};

const pct = (v?: number | null) => (v != null && v > 0 ? `${v}%` : '—');

export const DailyPriceTableSlide = ({ data, failed }: { data: PublicPrices | null; failed: boolean }) => (
  <section className="h-full px-16 py-6 flex flex-col gap-3">
    <div className="flex items-end justify-between gap-8">
      <div><p className="text-2xl text-primary">TODAY'S BUYING PRICES</p><h2 className="text-5xl mt-1">Prices by station</h2></div>
      {data?.lastUpdated && <p className="text-xl text-muted-foreground">Updated {new Date(data.lastUpdated).toLocaleString('en-GB', { timeZone: 'Africa/Kampala', dateStyle: 'medium', timeStyle: 'short' })}</p>}
    </div>
    {data ? <table className="w-full text-2xl border-collapse">
      <thead><tr className="bg-primary text-primary-foreground text-left">
        <th className="py-3 px-4">Location / Region</th><th className="px-4">Quality</th>
        <th className="px-4 text-right">UGX/Kg</th><th className="px-4 text-right">Moisture</th><th className="px-4 text-right">Outturn</th><th className="px-4 text-right">Total FM</th>
      </tr></thead>
      <tbody>{data.rows.map((r, i) => <tr key={i} className="border-b border-border even:bg-muted/50">
        <td className="py-2 px-4">{r.location}</td><td className="px-4">{r.quality}</td>
        <td className="px-4 text-right font-bold tabular-nums text-primary">{r.price && r.price > 0 ? r.price.toLocaleString('en-UG') : '—'}</td>
        <td className="px-4 text-right tabular-nums">{pct(r.moisture)}</td><td className="px-4 text-right tabular-nums">{pct(r.outturn)}</td><td className="px-4 text-right tabular-nums">{pct(r.fm)}</td>
      </tr>)}</tbody>
    </table> : <p className="flex-1 flex items-center text-4xl text-muted-foreground">{failed ? "Today's prices could not be loaded." : "Loading today's prices…"}</p>}
    {data && <p className="text-xl text-muted-foreground mt-auto">ICE Arabica {data.ice ?? '—'} c/lb · Robusta {data.robusta?.toLocaleString('en-UG') ?? '—'} USD/t · Exchange rate {data.fx?.toLocaleString('en-UG') ?? '—'}</p>}
  </section>
);
