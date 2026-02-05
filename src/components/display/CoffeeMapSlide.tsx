import { MapPin, Mountain } from 'lucide-react';

const coffeeRegions = [
  { name: 'Kasese', x: 105, y: 260, highlight: true },
  { name: 'Bundibugyo', x: 85, y: 215 },
  { name: 'Mbale', x: 305, y: 195 },
  { name: 'Kapchorwa', x: 325, y: 165 },
  { name: 'Kabale', x: 135, y: 370 },
  { name: 'Kisoro', x: 95, y: 370 },
  { name: 'Bushenyi', x: 150, y: 310 },
  { name: 'Nebbi', x: 110, y: 140 },
  { name: 'Luwero', x: 230, y: 230 },
  { name: 'Mukono', x: 260, y: 260 },
];

const CoffeeMapSlide = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Mountain className="h-12 w-12 text-green-400" />
        <h2 className="text-5xl font-bold text-white">Uganda's Coffee Heartland</h2>
      </div>

      <p className="text-white/70 text-xl text-center max-w-3xl mb-6">
        Sourcing premium Arabica & Robusta from the fertile highlands of Western Uganda
      </p>

      <div className="relative w-full max-w-3xl h-[420px]">
        <svg viewBox="0 0 400 450" className="w-full h-full">
          {/* More accurate Uganda outline */}
          <path
            d="M120,30 L160,25 L200,20 L240,25 L280,30 L310,35 L340,50 L355,80 
               L360,110 L358,140 L355,170 L360,200 L365,230 L360,260 L355,290 
               L345,320 L330,350 L310,370 L280,390 L250,405 L220,415 L190,420 
               L160,415 L130,400 L105,380 L85,355 L75,325 L70,295 L68,265 
               L65,235 L62,205 L60,175 L65,145 L75,115 L85,85 L95,60 Z"
            fill="rgba(34, 197, 94, 0.15)"
            stroke="rgba(34, 197, 94, 0.5)"
            strokeWidth="2.5"
          />
          
          {/* Lake Victoria */}
          <path
            d="M240,310 Q280,290 320,310 Q340,340 320,370 Q290,390 260,380 Q230,360 240,330 Z"
            fill="rgba(59, 130, 246, 0.25)"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="1.5"
          />
          <text x="280" y="345" textAnchor="middle" fill="rgba(59, 130, 246, 0.7)" fontSize="11" fontStyle="italic">L. Victoria</text>
          
          {/* Lake Albert */}
          <path
            d="M75,160 Q85,140 95,160 Q95,200 85,220 Q75,230 70,210 Q65,190 75,160 Z"
            fill="rgba(59, 130, 246, 0.25)"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="1.5"
          />
          <text x="82" y="195" textAnchor="middle" fill="rgba(59, 130, 246, 0.7)" fontSize="9" fontStyle="italic">L. Albert</text>
          
          {/* Rwenzori Mountains indicator */}
          <path d="M90,240 L100,215 L110,235 L120,210 L130,240" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" />
          <text x="110" y="255" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">Rwenzori Mts</text>

          {/* Kampala marker */}
          <circle cx="230" cy="260" r="5" fill="rgba(255,255,255,0.8)" />
          <text x="248" y="264" fill="rgba(255,255,255,0.8)" fontSize="12" fontWeight="bold">Kampala</text>

          {/* Coffee region markers */}
          {coffeeRegions.map((region) => (
            <g key={region.name}>
              <circle
                cx={region.x}
                cy={region.y}
                r={region.highlight ? 10 : 6}
                fill={region.highlight ? 'rgba(245, 158, 11, 0.9)' : 'rgba(34, 197, 94, 0.8)'}
                stroke={region.highlight ? '#f59e0b' : '#22c55e'}
                strokeWidth={region.highlight ? 3 : 1.5}
              >
                {region.highlight && (
                  <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                )}
              </circle>
              <text
                x={region.x}
                y={region.y - (region.highlight ? 16 : 12)}
                textAnchor="middle"
                fill={region.highlight ? '#fbbf24' : 'rgba(255,255,255,0.8)'}
                fontSize={region.highlight ? '13' : '10'}
                fontWeight={region.highlight ? 'bold' : 'normal'}
              >
                {region.name}
              </text>
              {region.highlight && (
                <text x={region.x} y={region.y + 22} textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">
                  ★ HQ
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-8 text-white/60 text-lg">
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
          Great Pearl HQ – Kasese
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
