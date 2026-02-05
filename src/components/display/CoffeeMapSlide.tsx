import { MapPin, Mountain } from 'lucide-react';

const CoffeeMapSlide = () => {
  const coffeeRegions = [
    { name: 'Kasese', position: { top: '45%', left: '15%' }, highlight: true },
    { name: 'Mbale', position: { top: '35%', left: '75%' } },
    { name: 'Kapchorwa', position: { top: '28%', left: '78%' } },
    { name: 'Bundibugyo', position: { top: '38%', left: '8%' } },
    { name: 'Kabale', position: { top: '72%', left: '22%' } },
    { name: 'Kisoro', position: { top: '75%', left: '12%' } },
    { name: 'Bushenyi', position: { top: '60%', left: '25%' } },
    { name: 'Nebbi', position: { top: '25%', left: '18%' } },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Mountain className="h-12 w-12 text-green-400" />
        <h2 className="text-5xl font-bold text-white">Uganda's Coffee Heartland</h2>
      </div>

      <p className="text-white/70 text-xl text-center max-w-3xl mb-8">
        Sourcing premium Arabica & Robusta from the fertile highlands of Western Uganda
      </p>

      {/* Simplified Uganda Map */}
      <div className="relative w-full max-w-4xl h-[400px]">
        {/* Uganda outline - simplified SVG shape */}
        <svg viewBox="0 0 400 450" className="w-full h-full">
          {/* Uganda shape */}
          <path
            d="M50,80 L120,50 L200,40 L280,50 L350,80 L380,150 L370,220 L380,300 L350,380 L280,420 L200,430 L120,410 L60,350 L40,280 L50,200 L40,140 Z"
            fill="rgba(34, 197, 94, 0.2)"
            stroke="rgba(34, 197, 94, 0.6)"
            strokeWidth="3"
          />
          {/* Lake Victoria */}
          <ellipse cx="300" cy="350" rx="60" ry="50" fill="rgba(59, 130, 246, 0.3)" />
          <text x="300" y="355" textAnchor="middle" fill="rgba(59, 130, 246, 0.8)" fontSize="12">Lake Victoria</text>
          
          {/* Rwenzori Mountains */}
          <path d="M60,180 L80,140 L100,180 L120,150 L140,190" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
          <text x="100" y="210" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">Rwenzori Mts</text>
        </svg>

        {/* Coffee Region Markers */}
        {coffeeRegions.map((region, i) => (
          <div
            key={region.name}
            className={`absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 ${
              region.highlight ? 'animate-pulse' : ''
            }`}
            style={{ top: region.position.top, left: region.position.left }}
          >
            <div className={`p-2 rounded-full ${region.highlight ? 'bg-amber-500' : 'bg-green-500/80'}`}>
              <MapPin className={`h-5 w-5 ${region.highlight ? 'text-black' : 'text-white'}`} />
            </div>
            <span className={`mt-1 text-sm font-semibold ${region.highlight ? 'text-amber-400 text-lg' : 'text-white/80'}`}>
              {region.name}
            </span>
            {region.highlight && (
              <span className="text-amber-300 text-xs">Our HQ</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-8 text-white/60 text-lg">
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
          Headquarters
        </span>
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          Coffee Growing Regions
        </span>
      </div>
    </div>
  );
};

export default CoffeeMapSlide;
