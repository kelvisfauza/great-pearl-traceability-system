import { useHolidayTheme } from "@/hooks/useHolidayTheme";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface HolidayBannerProps {
  userName?: string;
}

const HolidayBanner = ({ userName }: HolidayBannerProps) => {
  const { data: holiday } = useHolidayTheme();

  if (!holiday) return null;

  return (
    <Card
      className={`relative overflow-hidden border-none text-white shadow-xl mb-6 bg-gradient-to-r from-${holiday.gradient_from} to-${holiday.gradient_to}`}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div
          className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <CardContent className="relative p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Emoji decoration */}
          <div className="text-3xl md:text-4xl animate-bounce hidden md:block">
            {holiday.emoji}
          </div>

          {/* Main message */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-white/80 animate-pulse" />
              <h2 className="text-lg md:text-2xl font-bold tracking-wide">
                {holiday.greeting_title}
              </h2>
              <Sparkles
                className="h-4 w-4 text-white/80 animate-pulse"
                style={{ animationDelay: "0.5s" }}
              />
            </div>

            <p className="text-white/90 text-sm md:text-base">
              {userName ? `Dear ${userName}, ` : ""}
              {holiday.greeting_message}
            </p>

            <p className="mt-2 text-xs text-white/70">
              From the Great Pearl Coffee Family {holiday.emoji}
            </p>
          </div>

          {/* Right emoji */}
          <div
            className="text-3xl md:text-4xl animate-bounce hidden md:block"
            style={{ animationDelay: "0.3s" }}
          >
            {holiday.emoji}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HolidayBanner;
