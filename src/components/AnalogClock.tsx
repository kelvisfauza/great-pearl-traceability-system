import React, { useState, useEffect } from 'react';

interface AnalogClockProps {
  size?: number;
  className?: string;
}

const AnalogClock: React.FC<AnalogClockProps> = ({ size = 120, className = '' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const secondAngle = (time.getSeconds() * 6) - 90; // 6 degrees per second
  const minuteAngle = (time.getMinutes() * 6) + (time.getSeconds() * 0.1) - 90; // 6 degrees per minute + smooth seconds
  const hourAngle = ((time.getHours() % 12) * 30) + (time.getMinutes() * 0.5) - 90; // 30 degrees per hour + smooth minutes

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Analog Clock */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Rolex-Style Clock Face */}
        <div 
          className="relative rounded-full bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 dark:from-amber-900/20 dark:via-amber-800/30 dark:to-amber-700/40 shadow-2xl"
          style={{ 
            width: size, 
            height: size,
            background: 'radial-gradient(circle at 30% 30%, #ffd700, #ffed4e, #f7f7f7)',
            border: '6px solid',
            borderImage: 'linear-gradient(45deg, #ffd700, #ffed4e, #ddd) 1'
          }}
        >
          {/* Outer Ring */}
          <div 
            className="absolute inset-1 rounded-full shadow-inner"
            style={{
              background: 'conic-gradient(from 0deg, #ffd700 0deg, #ffed4e 90deg, #ffd700 180deg, #ffed4e 270deg, #ffd700 360deg)',
              padding: '2px'
            }}
          >
            {/* Inner Face */}
            <div 
              className="w-full h-full rounded-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 shadow-inner relative"
            >
              {/* Rolex Crown Logo */}
              <div 
                className="absolute top-6 left-1/2 transform -translate-x-1/2 text-amber-600 dark:text-amber-400 text-xs font-bold"
                style={{ fontSize: `${size * 0.08}px` }}
              >
                ♔
              </div>
              
              {/* ROLEX Text */}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2 text-amber-700 dark:text-amber-300 font-serif font-bold tracking-wider"
                style={{ 
                  top: `${size * 0.25}px`,
                  fontSize: `${size * 0.06}px`,
                  letterSpacing: '0.2em'
                }}
              >
                ROLEX
              </div>

              {/* Premium Hour Markers */}
              {[...Array(12)].map((_, i) => {
                const isMainHour = i % 3 === 0; // 12, 3, 6, 9 positions
                return (
                  <div
                    key={i}
                    className={`absolute ${isMainHour ? 'w-1.5 h-8 bg-gradient-to-b from-amber-600 to-amber-800' : 'w-0.5 h-4 bg-amber-700'} dark:${isMainHour ? 'from-amber-400 to-amber-600' : 'bg-amber-500'} rounded-full shadow-sm`}
                    style={{
                      top: '6px',
                      left: '50%',
                      transformOrigin: `50% ${size / 2 - 6}px`,
                      transform: `translateX(-50%) rotate(${i * 30}deg)`,
                    }}
                  />
                );
              })}

              {/* Roman Numerals for main hours */}
              {['XII', 'III', 'VI', 'IX'].map((numeral, i) => {
                const angle = i * 90 - 90;
                const radius = size / 2 - 28;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                
                return (
                  <div
                    key={numeral}
                    className="absolute text-amber-800 dark:text-amber-200 font-serif font-bold flex items-center justify-center"
                    style={{
                      left: `calc(50% + ${x}px - 12px)`,
                      top: `calc(50% + ${y}px - 8px)`,
                      fontSize: `${size * 0.08}px`,
                      width: '24px',
                      height: '16px',
                    }}
                  >
                    {numeral}
                  </div>
                );
              })}

              {/* Center Crown */}
              <div 
                className="absolute w-4 h-4 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 shadow-lg"
                style={{
                  background: 'radial-gradient(circle, #ffd700, #ffed4e)',
                  border: '1px solid #daa520'
                }}
              />

              {/* Luxury Hour Hand */}
              <div
                className="absolute rounded-full origin-bottom z-20 shadow-lg"
                style={{
                  width: '4px',
                  height: size * 0.25,
                  top: '50%',
                  left: '50%',
                  transformOrigin: '50% 100%',
                  transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                  transition: 'transform 0.5s ease-in-out',
                  background: 'linear-gradient(to bottom, #2c3e50, #34495e)',
                  border: '0.5px solid #1a252f'
                }}
              />

              {/* Luxury Minute Hand */}
              <div
                className="absolute rounded-full origin-bottom z-20 shadow-lg"
                style={{
                  width: '3px',
                  height: size * 0.35,
                  top: '50%',
                  left: '50%',
                  transformOrigin: '50% 100%',
                  transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                  transition: 'transform 0.5s ease-in-out',
                  background: 'linear-gradient(to bottom, #2c3e50, #34495e)',
                  border: '0.5px solid #1a252f'
                }}
              />

              {/* Precision Second Hand */}
              <div
                className="absolute rounded-full origin-bottom z-10"
                style={{
                  width: '1px',
                  height: size * 0.38,
                  top: '50%',
                  left: '50%',
                  transformOrigin: '50% 100%',
                  transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`,
                  transition: time.getSeconds() === 0 ? 'none' : 'transform 0.1s ease-out',
                  background: 'linear-gradient(to bottom, #e74c3c, #c0392b)',
                  boxShadow: '0 0 3px rgba(231, 76, 60, 0.5)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Digital Time Display */}
      <div className="text-center">
        <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">
          {formatTime(time)}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">Current Time</p>
      </div>
    </div>
  );
};

export default AnalogClock;