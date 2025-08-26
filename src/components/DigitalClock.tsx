import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DigitalClockProps {
  className?: string;
  showSeconds?: boolean;
  showDate?: boolean;
}

const DigitalClock: React.FC<DigitalClockProps> = ({ 
  className = '', 
  showSeconds = true,
  showDate = true 
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Digital Time Display */}
      <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg shadow-sm">
        <Clock className="h-5 w-5 text-primary" />
        <div className="text-center">
          <p className="text-2xl font-mono font-bold text-foreground">
            {formatTime(time)}
          </p>
          {showDate && (
            <p className="text-sm text-muted-foreground">
              {formatDate(time)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalClock;