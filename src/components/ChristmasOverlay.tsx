import { useEffect, useState } from 'react';
import { Snowflake, Gift, Star } from 'lucide-react';

export const ChristmasOverlay = () => {
  const [showChristmas, setShowChristmas] = useState(false);

  useEffect(() => {
    const endDate = new Date('2026-01-01T00:00:00');
    const now = new Date();
    setShowChristmas(now < endDate);
  }, []);

  if (!showChristmas) return null;

  return (
    <>
      {/* Falling snowflakes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {[...Array(20)].map((_, i) => (
          <Snowflake
            key={i}
            className="absolute text-white/30 animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              fontSize: `${10 + Math.random() * 20}px`,
            }}
            size={10 + Math.random() * 15}
          />
        ))}
      </div>

      {/* Corner decorations */}
      <div className="fixed top-0 left-0 pointer-events-none z-40">
        <div className="relative">
          <div className="absolute top-4 left-4 flex gap-2">
            <Gift className="h-8 w-8 text-red-500 animate-bounce" style={{ animationDelay: '0.5s' }} />
            <Star className="h-6 w-6 text-yellow-400 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="fixed top-0 right-0 pointer-events-none z-40">
        <div className="relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <Star className="h-6 w-6 text-yellow-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
            <Gift className="h-8 w-8 text-green-600 animate-bounce" />
          </div>
        </div>
      </div>
    </>
  );
};
