import React, { useState, useEffect } from 'react';
import { Sun, Moon, Sunrise, Sunset, Calendar, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import NotificationButton from '@/components/notifications/NotificationButton';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useNotifications } from '@/hooks/useNotifications';
import DigitalClock from '@/components/DigitalClock';

const DynamicHeader = () => {
  const { employee } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { unreadCount } = useNotifications();

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
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full bg-gradient-to-r ${greeting.color} shadow-lg animate-fade-in`}>
              <GreetingIcon className="h-8 w-8 text-white" />
            </div>
            <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
              <AvatarImage 
                src={employee?.avatar_url} 
                alt={employee?.name}
                key={employee?.avatar_url} // Force re-render when avatar URL changes
                className="object-cover"
              />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary to-primary-foreground text-white">
                {employee?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {greeting.text}, {employee?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
              Welcome to your dashboard
            </p>
          </div>
          <div className="ml-auto">
            <NotificationButton 
              onToggle={() => setIsNotificationOpen(true)}
              unreadCount={unreadCount}
            />
          </div>
        </div>

        {/* Time and Date Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Digital Clock */}
          <div className="flex items-center justify-center p-4 bg-gradient-to-br from-slate-50/80 via-white/90 to-blue-50/60 dark:from-slate-800/80 dark:via-slate-700/90 dark:to-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-sm shadow-lg">
            <DigitalClock className="animate-scale-in" showSeconds={true} showDate={false} />
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
        <NotificationPanel 
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
        />
      </div>
    </div>
    );
  };

  export default DynamicHeader;