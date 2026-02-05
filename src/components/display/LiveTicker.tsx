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

    // Fetch today's purchases
    const { data: todayPurchases } = await supabase
      .from('coffee_records')
      .select('supplier_name, kilograms, coffee_type, created_at')
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(20);

    if (todayPurchases) {
      todayPurchases.forEach((purchase, idx) => {
        const firstName = (purchase.supplier_name || 'Unknown').split(' ')[0];
        const kg = Math.round(purchase.kilograms || 0);
        const type = purchase.coffee_type || 'coffee';
        tickerItems.push({
          id: `purchase-${idx}`,
          text: `🌿 ${firstName} delivered ${kg.toLocaleString()} kgs of ${type}`,
          type: 'purchase'
        });
      });
    }

    // Fetch pending assessments (coffee records pending approval)
    const { data: pendingRecords } = await supabase
      .from('coffee_records')
      .select('supplier_name, kilograms, coffee_type')
      .eq('status', 'pending')
      .limit(10);

    if (pendingRecords && pendingRecords.length > 0) {
      tickerItems.push({
        id: 'pending-header',
        text: `⏳ ${pendingRecords.length} deliveries pending assessment`,
        type: 'assessment'
      });

      pendingRecords.forEach((record, idx) => {
        const firstName = (record.supplier_name || 'Unknown').split(' ')[0];
        const kg = Math.round(record.kilograms || 0);
        tickerItems.push({
          id: `pending-${idx}`,
          text: `📋 Pending: ${firstName}'s ${kg.toLocaleString()} kgs awaiting assessment`,
          type: 'assessment'
        });
      });
    }

    // Add some static info items for variety
    const { count: totalSuppliers } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });

    if (totalSuppliers) {
      tickerItems.push({
        id: 'info-suppliers',
        text: `👥 Working with ${totalSuppliers.toLocaleString()}+ registered farmers across Kasese`,
        type: 'info'
      });
    }

    // Get total kg today
    const totalToday = todayPurchases?.reduce((sum, p) => sum + (p.kilograms || 0), 0) || 0;
    if (totalToday > 0) {
      tickerItems.push({
        id: 'info-today',
        text: `📊 Today's total: ${Math.round(totalToday).toLocaleString()} kgs purchased`,
        type: 'info'
      });
    }

    // If no items, add a placeholder
    if (tickerItems.length === 0) {
      tickerItems.push({
        id: 'welcome',
        text: '☕ Welcome to Great Pearl Coffee - Quality Coffee from the Rwenzori Mountains',
        type: 'info'
      });
    }

    setItems(tickerItems);
  };

  useEffect(() => {
    fetchTickerData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTickerData, 30000);

    // Real-time subscription for new purchases
    const channel = supabase
      .channel('ticker-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'coffee_records' },
        () => {
          fetchTickerData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Duplicate items for seamless loop
  const displayItems = [...items, ...items, ...items];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white py-3 overflow-hidden z-50 border-t-2 border-amber-500/50">
      <div className="flex animate-ticker whitespace-nowrap">
        {displayItems.map((item, index) => (
          <span 
            key={`${item.id}-${index}`} 
            className={`mx-8 text-lg font-medium ${
              item.type === 'purchase' ? 'text-green-300' :
              item.type === 'assessment' ? 'text-yellow-300' :
              'text-white'
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
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default LiveTicker;
