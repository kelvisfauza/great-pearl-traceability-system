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
        {/* Clock Face */}
        <div 
          className="relative rounded-full bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-4 border-slate-300 dark:border-slate-600 shadow-2xl"
          style={{ width: size, height: size }}
        >
          {/* Inner Shadow */}
          <div 
            className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-100/50 to-transparent dark:from-slate-700/50 shadow-inner"
          />
          
          {/* Hour Markers */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-6 bg-slate-700 dark:bg-slate-300 rounded-full"
              style={{
                top: '8px',
                left: '50%',
                transformOrigin: `50% ${size / 2 - 8}px`,
                transform: `translateX(-50%) rotate(${i * 30}deg)`,
              }}
            />
          ))}

          {/* Numbers */}
          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num, i) => {
            const angle = i * 30 - 90;
            const radius = size / 2 - 24;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
            return (
              <div
                key={num}
                className="absolute text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center w-6 h-6"
                style={{
                  left: `calc(50% + ${x}px - 12px)`,
                  top: `calc(50% + ${y}px - 12px)`,
                }}
              >
                {num}
              </div>
            );
          })}

          {/* Center Dot */}
          <div 
            className="absolute w-3 h-3 bg-slate-800 dark:bg-slate-200 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 shadow-lg"
          />

          {/* Hour Hand */}
          <div
            className="absolute bg-slate-800 dark:bg-slate-200 rounded-full origin-bottom z-20 shadow-md"
            style={{
              width: '3px',
              height: size * 0.25,
              top: '50%',
              left: '50%',
              transformOrigin: '50% 100%',
              transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
              transition: 'transform 0.5s ease-in-out',
            }}
          />

          {/* Minute Hand */}
          <div
            className="absolute bg-slate-700 dark:bg-slate-300 rounded-full origin-bottom z-20 shadow-md"
            style={{
              width: '2px',
              height: size * 0.35,
              top: '50%',
              left: '50%',
              transformOrigin: '50% 100%',
              transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
              transition: 'transform 0.5s ease-in-out',
            }}
          />

          {/* Second Hand */}
          <div
            className="absolute bg-red-500 rounded-full origin-bottom z-10"
            style={{
              width: '1px',
              height: size * 0.4,
              top: '50%',
              left: '50%',
              transformOrigin: '50% 100%',
              transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`,
              transition: time.getSeconds() === 0 ? 'none' : 'transform 0.1s ease-out',
            }}
          />
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