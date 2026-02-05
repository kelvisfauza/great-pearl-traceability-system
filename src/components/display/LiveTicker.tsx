import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TickerItem {
  id: string;
  text: string;
  type: 'purchase' | 'assessment' | 'info';
}

const LiveTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);

  const fetchTickerData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tickerItems: TickerItem[] = [];

    const [todayRes, pendingRes, supplierCount] = await Promise.all([
      supabase.from('coffee_records').select('supplier_name, kilograms, coffee_type').eq('date', today).order('created_at', { ascending: false }).limit(20),
      supabase.from('coffee_records').select('supplier_name, kilograms').eq('status', 'pending').limit(10),
      supabase.from('suppliers').select('*', { count: 'exact', head: true }),
    ]);

    todayRes.data?.forEach((p, idx) => {
      const firstName = (p.supplier_name || 'Unknown').split(' ')[0];
      tickerItems.push({
        id: `p-${idx}`,
        text: `🌿 ${firstName} delivered ${Math.round(p.kilograms || 0).toLocaleString()} kgs of ${p.coffee_type || 'coffee'}`,
        type: 'purchase'
      });
    });

    if (pendingRes.data && pendingRes.data.length > 0) {
      tickerItems.push({ id: 'ph', text: `⏳ ${pendingRes.data.length} deliveries pending assessment`, type: 'assessment' });
      pendingRes.data.forEach((r, idx) => {
        const firstName = (r.supplier_name || 'Unknown').split(' ')[0];
        tickerItems.push({ id: `pd-${idx}`, text: `📋 Pending: ${firstName}'s ${Math.round(r.kilograms || 0).toLocaleString()} kgs awaiting assessment`, type: 'assessment' });
      });
    }

    if (supplierCount.count) {
      tickerItems.push({ id: 'si', text: `👥 Working with ${supplierCount.count.toLocaleString()}+ registered farmers across Kasese`, type: 'info' });
    }

    const totalToday = todayRes.data?.reduce((s, p) => s + (p.kilograms || 0), 0) || 0;
    if (totalToday > 0) {
      tickerItems.push({ id: 'tt', text: `📊 Today's total: ${Math.round(totalToday).toLocaleString()} kgs purchased`, type: 'info' });
    }

    if (tickerItems.length === 0) {
      tickerItems.push({ id: 'w', text: '☕ Welcome to Great Pearl Coffee – Quality Coffee from the Rwenzori Mountains | Call: +256 393 001 626', type: 'info' });
    }

    setItems(tickerItems);
  };

  useEffect(() => {
    fetchTickerData();
    const interval = setInterval(fetchTickerData, 30000);
    const channel = supabase
      .channel('ticker-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coffee_records' }, () => fetchTickerData())
      .subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  const displayItems = [...items, ...items, ...items];
  const animDuration = Math.max(30, items.length * 8);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white py-3 overflow-hidden z-50 border-t-2 border-amber-500/50">
      <div className="flex whitespace-nowrap" style={{ animation: `ticker ${animDuration}s linear infinite` }}>
        {displayItems.map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className={`mx-8 text-lg font-medium ${
              item.type === 'purchase' ? 'text-green-300' :
              item.type === 'assessment' ? 'text-yellow-300' : 'text-white'
            }`}
          >
            {item.text}
            <span className="mx-6 text-amber-400">•</span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </div>
  );
};

export default LiveTicker;
