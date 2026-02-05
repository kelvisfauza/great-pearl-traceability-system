import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Coffee, MapPin, Award } from 'lucide-react';

const SupplierStatsSlide = () => {
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalKgs: 0,
    avgPerSupplier: 0,
    topDistricts: [] as string[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: suppliers } = await supabase.from('suppliers').select('id, origin');
      const { data: records } = await supabase.from('coffee_records').select('kilograms');

      const totalKgs = records?.reduce((sum, r) => sum + Number(r.kilograms || 0), 0) || 0;
      const totalSuppliers = suppliers?.length || 0;

      // Get top origins/regions
      const originCount = new Map<string, number>();
      suppliers?.forEach(s => {
        if (s.origin) {
          originCount.set(s.origin, (originCount.get(s.origin) || 0) + 1);
        }
      });
      const topDistricts = Array.from(originCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name]) => name);

      setStats({
        totalSuppliers,
        totalKgs: Math.round(totalKgs),
        avgPerSupplier: totalSuppliers > 0 ? Math.round(totalKgs / totalSuppliers) : 0,
        topDistricts
      });
    };

    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-UG').format(num);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <h2 className="text-5xl font-bold text-white mb-12">Our Farmer Network</h2>

      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-700/20 rounded-3xl p-8 border border-amber-500/30 text-center">
          <Users className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <p className="text-6xl font-bold text-amber-200">{formatNumber(stats.totalSuppliers)}+</p>
          <p className="text-amber-300/80 text-xl mt-2">Registered Farmers</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 rounded-3xl p-8 border border-emerald-500/30 text-center">
          <Coffee className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <p className="text-6xl font-bold text-emerald-200">{formatNumber(stats.totalKgs)}</p>
          <p className="text-emerald-300/80 text-xl mt-2">Kilograms Sourced</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-700/20 rounded-3xl p-8 border border-purple-500/30 text-center">
          <Award className="h-16 w-16 text-purple-400 mx-auto mb-4" />
          <p className="text-6xl font-bold text-purple-200">{formatNumber(stats.avgPerSupplier)}</p>
          <p className="text-purple-300/80 text-xl mt-2">Avg kg per Farmer</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-700/20 rounded-3xl p-8 border border-cyan-500/30 text-center">
          <MapPin className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
          <div className="text-cyan-200">
            {stats.topDistricts.map((d, i) => (
              <span key={d} className="text-xl">
                {d}{i < stats.topDistricts.length - 1 ? ' • ' : ''}
              </span>
            ))}
          </div>
          <p className="text-cyan-300/80 text-xl mt-2">Top Sourcing Districts</p>
        </div>
      </div>
    </div>
  );
};

export default SupplierStatsSlide;
