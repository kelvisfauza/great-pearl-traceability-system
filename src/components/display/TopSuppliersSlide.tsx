import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp } from 'lucide-react';

const TopSuppliersSlide = () => {
  const [supplierData, setSupplierData] = useState<{ name: string; kgs: number }[]>([]);

  useEffect(() => {
    const fetchSupplierData = async () => {
      const { data: coffeeRecords } = await supabase
        .from('coffee_records')
        .select('supplier_name, kilograms');

      if (coffeeRecords) {
        const supplierMap = new Map<string, number>();
        coffeeRecords.forEach((record) => {
          const name = (record.supplier_name || 'Unknown').split(' ')[0]; // First name only
          const kgs = Number(record.kilograms || 0);
          supplierMap.set(name, (supplierMap.get(name) || 0) + kgs);
        });

        const sorted = Array.from(supplierMap.entries())
          .map(([name, kgs]) => ({ name, kgs: Math.round(kgs) }))
          .sort((a, b) => b.kgs - a.kgs)
          .slice(0, 8);

        setSupplierData(sorted);
      }
    };

    fetchSupplierData();
  }, []);

  const COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <TrendingUp className="h-12 w-12 text-amber-400" />
        <h2 className="text-5xl font-bold text-white">Top Suppliers by Volume</h2>
      </div>
      
      <div className="w-full max-w-5xl h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={supplierData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'white', fontSize: 14 }}
              angle={-30}
              textAnchor="end"
            />
            <YAxis tick={{ fill: 'white' }} />
            <Bar dataKey="kgs" radius={[8, 8, 0, 0]}>
              {supplierData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-white/60 text-xl mt-6">Kilograms supplied this season</p>
    </div>
  );
};

export default TopSuppliersSlide;
