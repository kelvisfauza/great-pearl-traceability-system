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
        {/* Elegant Watch Face */}
        <div 
          className="relative rounded-full shadow-2xl border-4 border-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
          style={{ 
            width: size, 
            height: size,
            background: `
              radial-gradient(circle at 30% 30%, 
                hsl(var(--background)) 0%, 
                hsl(var(--muted)) 50%, 
                hsl(var(--background)) 100%
              )
            `,
            boxShadow: `
              inset 0 2px 10px rgba(0,0,0,0.1),
              0 10px 30px rgba(0,0,0,0.2),
              0 0 0 1px hsl(var(--border))
            `
          }}
        >
          {/* Inner Bezel */}
          <div 
            className="absolute inset-2 rounded-full bg-gradient-to-br from-background via-muted/50 to-background border border-border/20 shadow-inner"
          >
            {/* Refined Hour Markers */}
            {[...Array(12)].map((_, i) => {
              const isMainHour = i % 3 === 0; // 12, 3, 6, 9 positions
              return (
                <div
                  key={i}
                  className={`absolute ${isMainHour ? 'w-1 h-6 bg-primary' : 'w-0.5 h-3 bg-muted-foreground'} rounded-full`}
                  style={{
                    top: isMainHour ? '10px' : '12px',
                    left: '50%',
                    transformOrigin: `50% ${size / 2 - (isMainHour ? 10 : 12)}px`,
                    transform: `translateX(-50%) rotate(${i * 30}deg)`,
                  }}
                />
              );
            })}

            {/* Clean Numbers */}
            {[12, 3, 6, 9].map((num, i) => {
              const angle = i * 90 - 90;
              const radius = size / 2 - 24;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              
              return (
                <div
                  key={num}
                  className="absolute text-foreground font-medium flex items-center justify-center"
                  style={{
                    left: `calc(50% + ${x}px - 8px)`,
                    top: `calc(50% + ${y}px - 8px)`,
                    fontSize: `${size * 0.08}px`,
                    width: '16px',
                    height: '16px',
                  }}
                >
                  {num}
                </div>
              );
            })}

            {/* Smaller hour dots */}
            {[1, 2, 4, 5, 7, 8, 10, 11].map((num, i) => {
              const actualIndex = num === 1 ? 0 : num === 2 ? 1 : num === 4 ? 3 : num === 5 ? 4 : num === 7 ? 6 : num === 8 ? 7 : num === 10 ? 9 : 10;
              const angle = actualIndex * 30 - 90;
              const radius = size / 2 - 20;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              
              return (
                <div
                  key={num}
                  className="absolute w-1 h-1 bg-muted-foreground rounded-full"
                  style={{
                    left: `calc(50% + ${x}px - 2px)`,
                    top: `calc(50% + ${y}px - 2px)`,
                  }}
                />
              );
            })}

            {/* Center Hub */}
            <div 
              className="absolute w-3 h-3 bg-foreground rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 shadow-sm border border-background"
            />

            {/* Elegant Hour Hand */}
            <div
              className="absolute bg-foreground rounded-sm origin-bottom z-20 shadow-sm"
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

            {/* Elegant Minute Hand */}
            <div
              className="absolute bg-foreground rounded-sm origin-bottom z-20 shadow-sm"
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

            {/* Refined Second Hand */}
            <div
              className="absolute bg-destructive rounded-full origin-bottom z-10"
              style={{
                width: '1px',
                height: size * 0.38,
                top: '50%',
                left: '50%',
                transformOrigin: '50% 100%',
                transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`,
                transition: time.getSeconds() === 0 ? 'none' : 'transform 0.1s ease-out',
              }}
            />
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