import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Factory, Scale, Truck, CheckCircle } from 'lucide-react';

const MillingSlide = () => {
  const [stats, setStats] = useState({
    totalProcessed: 0,
    dispatched: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: records } = await supabase.from('coffee_records').select('kilograms');
      const { data: dispatches } = await supabase.from('eudr_dispatch_reports').select('trucks');

      const totalProcessed = records?.reduce((sum, r) => sum + Number(r.kilograms || 0), 0) || 0;
      
      // Calculate dispatched from trucks JSON
      let dispatched = 0;
      dispatches?.forEach(d => {
        const trucks = d.trucks as any[];
        if (Array.isArray(trucks)) {
          trucks.forEach(t => {
            dispatched += Number(t.weight || t.netWeight || 0);
          });
        }
      });

      setStats({
        totalProcessed: Math.round(totalProcessed),
        dispatched: Math.round(dispatched)
      });
    };

    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-UG').format(num);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Factory className="h-12 w-12 text-orange-400" />
        <h2 className="text-5xl font-bold text-white">Processing Excellence</h2>
      </div>

      <div className="flex items-center gap-16 my-12">
        {/* Processing Flow */}
        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center mx-auto mb-4">
            <Scale className="h-16 w-16 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-200">{formatNumber(stats.totalProcessed)} kg</p>
          <p className="text-amber-300/80 text-lg">Received & Weighed</p>
        </div>

        <div className="text-6xl text-white/30">→</div>

        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-orange-500/20 border-4 border-orange-400 flex items-center justify-center mx-auto mb-4">
            <Factory className="h-16 w-16 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-orange-200">Quality</p>
          <p className="text-orange-300/80 text-lg">Graded & Sorted</p>
        </div>

        <div className="text-6xl text-white/30">→</div>

        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Truck className="h-16 w-16 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-200">{formatNumber(stats.dispatched)} kg</p>
          <p className="text-emerald-300/80 text-lg">Dispatched</p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-8 text-white/70 text-lg">
        <span className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          Hulling
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          Sorting
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          Grading
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          Bagging
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          Export Ready
        </span>
      </div>
    </div>
  );
};

export default MillingSlide;
