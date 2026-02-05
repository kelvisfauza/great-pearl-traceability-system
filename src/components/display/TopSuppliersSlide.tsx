import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface Props {
  data: { name: string; kgs: number }[];
}

const COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

const TopSuppliersSlide = ({ data }: Props) => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <TrendingUp className="h-12 w-12 text-amber-400" />
        <h2 className="text-5xl font-bold text-white">Top Suppliers by Volume</h2>
      </div>
      
      {data.length > 0 ? (
        <div className="w-full max-w-5xl h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis dataKey="name" tick={{ fill: 'white', fontSize: 14 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: 'white' }} />
              <Bar dataKey="kgs" radius={[8, 8, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-white/60 text-2xl">No supplier data available yet</p>
      )}

      <p className="text-white/60 text-xl mt-6">Kilograms supplied this season</p>
    </div>
  );
};

export default TopSuppliersSlide;
