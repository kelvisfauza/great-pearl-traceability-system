import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, TreePine, Gift, Star, Bell } from 'lucide-react';

interface ChristmasBannerProps {
  userName?: string;
}

export const ChristmasBanner = ({ userName }: ChristmasBannerProps) => {
  const [showBanner, setShowBanner] = useState(false);
  const [daysUntilNewYear, setDaysUntilNewYear] = useState(0);

  useEffect(() => {
    const endDate = new Date('2026-01-01T00:00:00');
    const now = new Date();
    
    if (now < endDate) {
      setShowBanner(true);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysUntilNewYear(diffDays);
    }
  }, []);

  if (!showBanner) return null;

  const isChristmasDay = new Date().getMonth() === 11 && new Date().getDate() === 25;
  const isNewYearsEve = new Date().getMonth() === 11 && new Date().getDate() === 31;

  return (
    <Card className="relative overflow-hidden border-none bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white shadow-xl mb-6">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-green-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full blur-lg animate-bounce" style={{ animationDelay: '0.5s' }} />
      </div>

      <CardContent className="relative p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left decoration */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <TreePine className="h-12 w-12 text-green-300 animate-bounce" />
              <Star className="h-4 w-4 text-yellow-300 absolute -top-1 left-1/2 -translate-x-1/2 animate-pulse" />
            </div>
            <Bell className="h-8 w-8 text-yellow-300 animate-[swing_1s_ease-in-out_infinite]" />
          </div>

          {/* Main message */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-bold tracking-wide">
                {isChristmasDay ? '🎄 Merry Christmas! 🎄' : 
                 isNewYearsEve ? '🎉 Happy New Year! 🎉' :
                 '✨ Season\'s Greetings! ✨'}
              </h2>
              <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <p className="text-white/90 text-lg">
              {userName ? `Dear ${userName}, ` : ''}
              Wishing you and your loved ones a joyful holiday season filled with peace, happiness, and prosperity!
            </p>
            
            <div className="mt-3 flex items-center justify-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <Gift className="h-4 w-4" />
                From the Great Pearl Coffee Family
              </span>
              {daysUntilNewYear > 0 && daysUntilNewYear <= 10 && (
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  {daysUntilNewYear} days to 2026! 🎊
                </span>
              )}
            </div>
          </div>

          {/* Right decoration */}
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-yellow-300 animate-[swing_1s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }} />
            <div className="relative">
              <Gift className="h-12 w-12 text-red-200 animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
