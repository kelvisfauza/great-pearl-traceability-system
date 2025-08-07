import React, { useState, useEffect } from 'react';
import { Clock, Sun, Moon, Sunrise, Sunset, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const DynamicHeader = () => {
  const { employee } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return { text: 'Good Night', icon: Moon, color: 'from-purple-500 to-indigo-600' };
    if (hour < 12) return { text: 'Good Morning', icon: Sunrise, color: 'from-orange-500 to-yellow-500' };
    if (hour < 17) return { text: 'Good Afternoon', icon: Sun, color: 'from-blue-500 to-cyan-500' };
    if (hour < 21) return { text: 'Good Evening', icon: Sunset, color: 'from-orange-600 to-red-500' };
    return { text: 'Good Night', icon: Moon, color: 'from-purple-500 to-indigo-600' };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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
    <div className="relative overflow-hidden bg-gradient-to-br from-card via-card/95 to-muted/30 rounded-3xl p-8 border border-border/50 backdrop-blur-sm shadow-lg">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl ${greeting.color} opacity-10 rounded-full blur-3xl animate-pulse`}></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 space-y-6">
        {/* Main Greeting */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full bg-gradient-to-r ${greeting.color} shadow-lg animate-fade-in`}>
            <GreetingIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {greeting.text}, {employee?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
              Welcome to your dashboard
            </p>
          </div>
        </div>

        {/* Time and Date Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Live Clock */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
            <div className="p-3 rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-foreground">
                {formatTime(currentTime)}
              </p>
              <p className="text-sm text-muted-foreground">Current Time</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-accent/5 to-accent/10 rounded-2xl border border-accent/20">
            <div className="p-3 rounded-full bg-accent/10">
              <Calendar className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {formatDate(currentTime)}
              </p>
              <p className="text-sm text-muted-foreground">Today's Date</p>
            </div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-secondary/10 to-secondary/20 rounded-full border border-secondary/30 shadow-sm">
            <div className="w-2 h-2 bg-secondary rounded-full mr-3 animate-pulse"></div>
            <span className="text-sm font-medium text-secondary-foreground">
              {employee?.role} • {employee?.department}
            </span>
          </div>
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-full border border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicHeader;