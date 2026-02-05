import { Factory, Scale, Truck, CheckCircle } from 'lucide-react';

interface Props {
  totalProcessed: number;
  dispatched: number;
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-UG').format(num);

const MillingSlide = ({ totalProcessed, dispatched }: Props) => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Factory className="h-12 w-12 text-orange-400" />
        <h2 className="text-5xl font-bold text-white">Processing Excellence</h2>
      </div>

      <div className="flex items-center gap-16 my-12">
        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center mx-auto mb-4">
            <Scale className="h-16 w-16 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-200">{formatNumber(totalProcessed)} kg</p>
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
          <p className="text-3xl font-bold text-emerald-200">{formatNumber(dispatched)} kg</p>
          <p className="text-emerald-300/80 text-lg">Dispatched</p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-8 text-white/70 text-lg">
        {['Hulling', 'Sorting', 'Grading', 'Bagging', 'Export Ready'].map((step) => (
          <span key={step} className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            {step}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MillingSlide;
