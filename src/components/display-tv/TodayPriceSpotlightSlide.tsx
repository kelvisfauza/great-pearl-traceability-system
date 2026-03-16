import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, DollarSign, Scale } from "lucide-react";
import type { LiveIcePrices } from "@/components/display-tv/types";

interface TodayPriceSpotlightSlideProps {
  prices: {
    arabicaBuyingPrice: number;
    robustaBuyingPrice: number;
    sortedPrice: number;
    exchangeRate: number;
    iceArabica: number;
    robusta: number;
  };
  liveIcePrices: LiveIcePrices;
}

const numberFormat = new Intl.NumberFormat("en-UG");

const TodayPriceSpotlightSlide = ({ prices, liveIcePrices }: TodayPriceSpotlightSlideProps) => {
  const today = new Date().toLocaleDateString("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const items = [
    { label: "Arabica buying today", value: `${numberFormat.format(prices.arabicaBuyingPrice)} UGX/kg`, icon: DollarSign },
    { label: "Robusta buying today", value: `${numberFormat.format(prices.robustaBuyingPrice)} UGX/kg`, icon: DollarSign },
    { label: "Sorted premium", value: `${numberFormat.format(prices.sortedPrice || 0)} UGX/kg`, icon: Scale },
    { label: "ICE Arabica", value: `${(liveIcePrices.iceArabica ?? prices.iceArabica).toFixed(2)} ¢/lb`, icon: CalendarDays },
    { label: "ICE Robusta", value: `${numberFormat.format(liveIcePrices.iceRobusta ?? prices.robusta)} USD/mt`, icon: CalendarDays },
    { label: "USD / UGX", value: numberFormat.format(prices.exchangeRate), icon: CalendarDays },
  ];

  return (
    <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-8 px-12 py-10">
      <Card className="tv-surface-cool rounded-[2rem] border-border/60 shadow-xl backdrop-blur">
        <CardContent className="flex h-full flex-col justify-between p-10">
          <div>
            <Badge className="rounded-full bg-primary/15 px-4 py-1 text-base text-primary hover:bg-primary/15">
              Today’s board
            </Badge>
            <p className="mt-8 text-sm uppercase tracking-[0.35em] text-muted-foreground">Great Agro Coffee daily prices</p>
            <h2 className="mt-5 text-7xl font-black leading-[0.94] tracking-tight text-foreground">
              Today’s prices are front and center.
            </h2>
            <p className="mt-6 max-w-3xl text-3xl leading-relaxed text-foreground/90">
              This slide keeps the room focused on the exact local buying levels and the latest external reference signals.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border/50 bg-background/75 p-7">
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Date</p>
            <p className="mt-4 text-4xl font-black text-foreground">{today}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-[1.75rem] border-border/60 bg-card/90 shadow-xl backdrop-blur">
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{item.label}</p>
                    <p className="mt-6 text-5xl font-black leading-none text-foreground">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                    <Icon className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TodayPriceSpotlightSlide;
