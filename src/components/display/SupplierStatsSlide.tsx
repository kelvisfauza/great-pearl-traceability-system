import { Users, Coffee, MapPin, Award } from 'lucide-react';

interface Props {
  totalSuppliers: number;
  totalKgs: number;
  avgPerSupplier: number;
  topDistricts: string[];
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-UG').format(num);

const SupplierStatsSlide = ({ totalSuppliers, totalKgs, avgPerSupplier, topDistricts }: Props) => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <h2 className="text-5xl font-bold text-white mb-12">Our Farmer Network</h2>

      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-700/20 rounded-3xl p-8 border border-amber-500/30 text-center">
          <Users className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <p className="text-6xl font-bold text-amber-200">{formatNumber(totalSuppliers)}+</p>
          <p className="text-amber-300/80 text-xl mt-2">Registered Farmers</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 rounded-3xl p-8 border border-emerald-500/30 text-center">
          <Coffee className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <p className="text-6xl font-bold text-emerald-200">{formatNumber(totalKgs)}</p>
          <p className="text-emerald-300/80 text-xl mt-2">Kilograms Sourced</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-700/20 rounded-3xl p-8 border border-purple-500/30 text-center">
          <Award className="h-16 w-16 text-purple-400 mx-auto mb-4" />
          <p className="text-6xl font-bold text-purple-200">{formatNumber(avgPerSupplier)}</p>
          <p className="text-purple-300/80 text-xl mt-2">Avg kg per Farmer</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-700/20 rounded-3xl p-8 border border-cyan-500/30 text-center">
          <MapPin className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
          <div className="text-cyan-200">
            {topDistricts.length > 0 ? topDistricts.map((d, i) => (
              <span key={d} className="text-xl">
                {d}{i < topDistricts.length - 1 ? ' • ' : ''}
              </span>
            )) : <span className="text-xl">Kasese • Bundibugyo • Kabale</span>}
          </div>
          <p className="text-cyan-300/80 text-xl mt-2">Top Sourcing Districts</p>
        </div>
      </div>
    </div>
  );
};

export default SupplierStatsSlide;
