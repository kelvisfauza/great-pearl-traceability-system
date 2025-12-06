import React, { useState, useEffect } from 'react';
import { Sun, Moon, Sunrise, Sunset, Calendar, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import DigitalClock from '@/components/DigitalClock';

const DynamicHeader = () => {
  const { employee } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showMainGreeting, setShowMainGreeting] = useState(true);
  const [showCoffeeChain, setShowCoffeeChain] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Hide main greeting after 3 seconds and start showing coffee chain
  useEffect(() => {
    const greetingTimer = setTimeout(() => {
      setShowMainGreeting(false);
      setShowCoffeeChain(true);
    }, 3000);

    return () => clearTimeout(greetingTimer);
  }, []);

  // Cycle through coffee chain messages every 5 seconds after main greeting is hidden
  useEffect(() => {
    if (showCoffeeChain) {
      const messageTimer = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % getCoffeeChainMessages().length);
      }, 5000);

      return () => clearInterval(messageTimer);
    }
  }, [showCoffeeChain]);

  const getCoffeeChainMessages = () => {
    return [
      "🌱 From Farmer to Cup: Our coffee journey starts with smallholder farmers across Uganda's highland regions",
      "👨‍🌾 Sourcing Excellence: We work directly with over 500 local farmers, ensuring fair prices and sustainable practices",
      "🌍 Growing Regions: Premium Arabica from Mt. Elgon and Rwenzori Mountains, Robusta from Central Uganda",
      "🤝 Farmer Partnerships: Building long-term relationships based on trust, quality, and mutual growth",
      "📦 Cherry Collection: Fresh coffee cherries are collected within 24 hours of harvest for optimal quality",
      "🏭 Processing Methods: Wet processing (washed), dry processing (natural), and honey processing for diverse flavor profiles",
      "💧 Washing Stations: State-of-the-art facilities ensure consistent quality and environmental sustainability",
      "☀️ Drying Process: Sun-dried on raised beds for 14-21 days to achieve optimal moisture content (10-12%)",
      "🔍 Quality Sorting: Multiple sorting stages remove defects - hand-picking, density sorting, and electronic color sorting",
      "📊 Grading Standards: Strictly adhering to AA, A, B, and C grades based on screen size and quality",
      "🎯 Cupping Scores: Only beans scoring 80+ on the SCA scale make it to our premium selection",
      "🏆 Quality Control: Our Q-graders evaluate every batch for flavor, aroma, body, and aftertaste",
      "🔥 Roasting Profiles: Light, medium, and dark roasts crafted to bring out unique flavor characteristics",
      "⚙️ Modern Roasting: Computer-controlled roasters ensure consistency and precision in every batch",
      "🌡️ Temperature Precision: Roasting between 195°C-220°C to develop optimal flavor compounds",
      "⏱️ Roast Development: Carefully timed first and second crack for perfect caramelization",
      "🎨 Flavor Development: Creating flavor notes from fruity and floral to chocolaty and nutty",
      "📦 Packaging Excellence: Immediately packed in valve bags to preserve freshness and aroma",
      "🚚 Logistics & Distribution: Efficient supply chain ensures farm-to-cup in optimal timeframes",
      "☕ Final Product: Every cup tells a story of dedication, quality, and sustainable coffee production",
      "💚 Sustainability: Carbon-neutral processing, water recycling, and organic farming initiatives",
      "🌟 Our Promise: Exceptional quality, fair trade, and environmental stewardship in every bean"
    ];
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    const firstName = employee?.name?.split(' ')[0] || 'there';
    
    // Diverse content categories
    const motivationalQuotes = [
      `"Success is the sum of small efforts repeated day in and day out" - Keep pushing forward! 💪`,
      `"The only way to do great work is to love what you do" - Steve Jobs`,
      `"Excellence is not a destination, it's a continuous journey" 🚀`,
      `"Quality is never an accident; it is always the result of intelligent effort" ✨`,
      `"Your work is going to fill a large part of your life. Make it count!" 🎯`
    ];

    const productivityTips = [
      `💡 Pro tip: Take a 5-minute break every hour to boost your focus and productivity!`,
      `⏰ Time block your tasks today - your future self will thank you!`,
      `📊 Review your progress regularly - small wins lead to big achievements!`,
      `🎯 Prioritize your most important task first - eat that frog!`,
      `✅ Break large tasks into smaller chunks - progress over perfection!`
    ];

    const coffeeFacts = [
      `☕ Coffee fact: Ethiopia is the birthplace of coffee - our beans carry centuries of tradition!`,
      `🌍 Did you know? Coffee is the world's second-most traded commodity after oil!`,
      `📈 Quality matters: Specialty coffee can have over 800 different flavor compounds!`,
      `🌱 Sustainable sourcing: Every cup of quality coffee supports farming communities!`,
      `⭐ Coffee grading: Our premium Arabica beans are carefully selected for excellence!`
    ];

    const dailyInsights = [
      `📈 Stay focused on quality - it's what sets us apart from the competition!`,
      `🤝 Teamwork makes the dream work - collaborate and conquer today's challenges!`,
      `💼 Your role matters: Every task contributes to our collective success!`,
      `🎨 Innovation starts with you - don't be afraid to suggest improvements!`,
      `🌟 Customer satisfaction is our priority - deliver excellence in everything!`
    ];

    // Combine all messages for variety
    const allMessages = [
      ...motivationalQuotes,
      ...productivityTips,
      ...coffeeFacts,
      ...dailyInsights
    ];
    
    if (hour < 6) {
      return { 
        text: 'Good Night', 
        icon: Moon, 
        color: 'from-purple-500 to-indigo-600',
        messages: [
          `Rest well ${firstName}, tomorrow brings new opportunities! 🌙`,
          `Sweet dreams! Recharge for another day of excellence 😴`,
          ...allMessages.slice(0, 3)
        ]
      };
    }
    
    if (hour >= 6 && hour < 12) {
      return { 
        text: 'Good Morning', 
        icon: Sunrise, 
        color: 'from-orange-500 to-yellow-500',
        messages: [
          `It's a fresh ${dayOfWeek} morning! Ready to make it count? ☀️`,
          `Rise and shine ${firstName}! Today is full of possibilities! 🌅`,
          `Morning energy is peak productivity time - let's maximize it! ⚡`,
          ...allMessages.slice(3, 9)
        ]
      };
    }
    
    if (hour >= 12 && hour < 13) {
      return { 
        text: 'Good Afternoon', 
        icon: Sun, 
        color: 'from-blue-500 to-cyan-500',
        messages: [
          `Lunch time ${firstName}! Take a proper break to recharge 🍽️`,
          `Half the day done - you're doing great! Fuel up and continue! 💪`,
          `💡 A good lunch break can boost afternoon productivity by 30%!`,
          `🌟 You've accomplished so much this morning - celebrate with a break!`,
          ...allMessages.slice(9, 14)
        ]
      };
    }
    
    if (hour >= 13 && hour < 17) {
      return { 
        text: 'Good Afternoon', 
        icon: Sun, 
        color: 'from-blue-500 to-cyan-500',
        messages: [
          `Afternoon momentum ${firstName} - keep that energy flowing! 🔥`,
          `You're in the productivity zone - make these hours count! ⚡`,
          `Crushing your goals one task at a time! Keep it up! 🎯`,
          `🌞 Peak afternoon hours - this is when champions are made!`,
          `📊 Data shows afternoon focus can surpass morning productivity!`,
          `💼 Professional excellence isn't an act, it's a habit - keep building yours!`,
          `🎨 Creative solutions often emerge in the afternoon - stay open to inspiration!`,
          ...allMessages.slice(14, 20)
        ]
      };
    }
    
    if (hour >= 17 && hour < 21) {
      return { 
        text: 'Good Evening', 
        icon: Sunset, 
        color: 'from-orange-600 to-red-500',
        messages: [
          `Winding down ${firstName}? Great work today! 🌅`,
          `Evening reflection: What did you accomplish today? Celebrate it! 🎉`,
          `You made it through another productive day - well done! ⭐`,
          ...allMessages.slice(18, 23)
        ]
      };
    }
    
    return { 
      text: 'Good Night', 
      icon: Moon, 
      color: 'from-purple-500 to-indigo-600',
      messages: [
        `Sweet dreams ${firstName}! Tomorrow awaits with new opportunities 🌙`,
        `Rest well - you've earned it! See you tomorrow! 😴`,
        ...allMessages.slice(23, 26)
      ]
    };
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
    <div className="relative overflow-hidden bg-gradient-to-br from-card via-card/95 to-muted/30 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-border/50 backdrop-blur-sm shadow-lg">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-gradient-to-bl ${greeting.color} opacity-10 rounded-full blur-3xl animate-pulse`}></div>
        <div className="absolute bottom-0 left-0 w-36 sm:w-72 h-36 sm:h-72 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 space-y-4 sm:space-y-6">
        {/* Main Greeting */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className={`p-2 sm:p-3 rounded-full bg-gradient-to-r ${greeting.color} shadow-lg animate-fade-in`}>
              <GreetingIcon className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
            </div>
            <Avatar className="h-10 w-10 sm:h-16 sm:w-16 border-2 sm:border-4 border-white shadow-lg">
              <AvatarImage 
                src={employee?.avatar_url} 
                alt={employee?.name}
                key={employee?.avatar_url}
                className="object-cover"
              />
              <AvatarFallback className="text-sm sm:text-lg font-semibold bg-gradient-to-br from-primary to-primary-foreground text-white">
                {employee?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent truncate">
              {greeting.text}, {employee?.name?.split(' ')[0] || 'User'}!
            </h1>
            {showMainGreeting ? (
              <p className="text-sm sm:text-lg text-muted-foreground mt-0.5 sm:mt-1">
                Welcome to your dashboard
              </p>
            ) : showCoffeeChain ? (
              <div className="mt-1 sm:mt-2">
                <p 
                  key={currentMessageIndex} 
                  className="text-xs sm:text-base text-foreground/80 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-600/10 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2.5 border-l-4 border-amber-500/40 transition-all duration-700 animate-fade-in shadow-sm line-clamp-2"
                >
                  {getCoffeeChainMessages()[currentMessageIndex % getCoffeeChainMessages().length]}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Time and Date Section - Hidden on mobile, shown on larger screens */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Compact Time/Date for Mobile */}
        <div className="flex sm:hidden items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formatDate(currentTime)}</span>
          <span className="font-mono">{formatTime(currentTime)}</span>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="inline-flex items-center px-3 sm:px-6 py-1.5 sm:py-3 bg-gradient-to-r from-secondary/10 to-secondary/20 rounded-full border border-secondary/30 shadow-sm">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-secondary rounded-full mr-2 sm:mr-3 animate-pulse"></div>
            <span className="text-xs sm:text-sm font-medium text-secondary-foreground">
              {employee?.role} • {employee?.department}
            </span>
          </div>
          <div className="inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-full border border-green-500/20">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1.5 sm:mr-2 animate-pulse"></div>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Online</span>
          </div>
        </div>
      </div>
    </div>
    );
  };

  export default DynamicHeader;