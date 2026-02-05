import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

const TopBuyersSlide = () => {
  const [buyerData, setBuyerData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchBuyerData = async () => {
      const { data: contracts } = await supabase
        .from('buyer_contracts')
        .select('buyer_name, total_quantity');

      if (contracts) {
        const buyerMap = new Map<string, number>();
        contracts.forEach((contract) => {
          const name = contract.buyer_name || 'Unknown';
          const qty = Number(contract.total_quantity || 0);
          buyerMap.set(name, (buyerMap.get(name) || 0) + qty);
        });

        const sorted = Array.from(buyerMap.entries())
          .map(([name, value]) => ({ name, value: Math.round(value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);

        setBuyerData(sorted);
      }
    };

    fetchBuyerData();
  }, []);

  const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  if (buyerData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Users className="h-12 w-12 text-emerald-400" />
          <h2 className="text-5xl font-bold text-white">Our Trusted Buyers</h2>
        </div>
        <p className="text-white/60 text-2xl">Loading buyer data...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Users className="h-12 w-12 text-emerald-400" />
        <h2 className="text-5xl font-bold text-white">Our Trusted Buyers</h2>
      </div>

      <div className="w-full max-w-4xl h-[400px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={buyerData}
              cx="50%"
              cy="50%"
              outerRadius={150}
              innerRadius={80}
              dataKey="value"
              label={({ name, value }) => `${name}: ${formatNumber(value)} kg`}
              labelLine={{ stroke: 'white' }}
            >
              {buyerData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <p className="text-white/60 text-xl mt-4">Annual coffee distribution to export partners</p>
    </div>
  );
};

export default TopBuyersSlide;
