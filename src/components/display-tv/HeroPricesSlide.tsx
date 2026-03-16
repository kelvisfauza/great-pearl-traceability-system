import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Coffee, DollarSign, Globe, Minus } from "lucide-react";
import type { CoffeeMarketBriefing, LiveIcePrices, MarketDirection } from "@/components/display-tv/types";

interface HeroPricesSlideProps {
  prices: {
    arabicaBuyingPrice: number;
    robustaBuyingPrice: number;
    sortedPrice: number;
    exchangeRate: number;
    iceArabica: number;
    robusta: number;
  };
  liveIcePrices: LiveIcePrices;
  briefing: CoffeeMarketBriefing | null;
}

const numberFormat = new Intl.NumberFormat("en-UG");

const getDirectionIcon = (direction: MarketDirection) => {
  if (direction === "upside") return ArrowUpRight;
  if (direction === "downside") return ArrowDownRight;
  return Minus;
};

const getDirectionLabel = (direction: MarketDirection) => {
  if (direction === "upside") return "Upside pressure";
  if (direction === "downside") return "Downside pressure";
  return "Balanced market";
};

const HeroPricesSlide = ({ prices, liveIcePrices, briefing }: HeroPricesSlideProps) => {
  const arabicaDirection = briefing?.arabicaDirection ?? "neutral";
  const robustaDirection = briefing?.robustaDirection ?? "neutral";
  const ArabicaIcon = getDirectionIcon(arabicaDirection);
  const RobustaIcon = getDirectionIcon(robustaDirection);

  const priceCards = [
    {
      label: "Arabica buying",
      value: `${numberFormat.format(prices.arabicaBuyingPrice)} UGX/kg`,
      sublabel: "Factory reference",
      direction: arabicaDirection,
      icon: Coffee,
    },
    {
      label: "Robusta buying",
      value: `${numberFormat.format(prices.robustaBuyingPrice)} UGX/kg`,
      sublabel: "Factory reference",
      direction: robustaDirection,
      icon: Coffee,
    },
    {
      label: "Sorted premium",
      value: `${numberFormat.format(prices.sortedPrice || 0)} UGX/kg`,
      sublabel: "Premium lot pricing",
      direction: "neutral" as const,
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid h-full grid-cols-[1.35fr_0.9fr] gap-8 px-12 py-10">
      <div className="space-y-8">
        <div className="rounded-[2rem] border border-border/60 bg-card/80 p-10 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-8">
            <div className="max-w-4xl space-y-5">
              <Badge className="rounded-full bg-primary/15 px-4 py-1 text-base text-primary hover:bg-primary/15">Real-time buying screen</Badge>
              <h2 className="max-w-5xl text-7xl font-black leading-[0.95] tracking-tight text-foreground">
                Live factory prices, ICE futures, and coffee-market direction on one TV wall.
              </h2>
              <p className="max-w-4xl text-2xl leading-relaxed text-muted-foreground">
                {briefing?.summary || "Streaming live buying prices, external ICE futures, and coffee-market intelligence for Arabica and Robusta."}
              </p>
            </div>

            <div className="grid gap-4">
              <Card className="rounded-[1.5rem] border-border/60 bg-background/70">
                <CardContent className="p-6">
                  <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Arabica view</p>
                  <div className="mt-3 flex items-center gap-3">
                    <ArabicaIcon className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-black text-foreground">{getDirectionLabel(arabicaDirection)}</p>
                      <p className="text-base text-muted-foreground">ICE Arabica {liveIcePrices.iceArabica ?? prices.iceArabica} ¢/lb</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-border/60 bg-background/70">
                <CardContent className="p-6">
                  <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Robusta view</p>
                  <div className="mt-3 flex items-center gap-3">
                    <RobustaIcon className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-black text-foreground">{getDirectionLabel(robustaDirection)}</p>
                      <p className="text-base text-muted-foreground">ICE Robusta {numberFormat.format(liveIcePrices.iceRobusta ?? prices.robusta)} USD/mt</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {priceCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{card.label}</p>
                      <p className="mt-6 text-5xl font-black leading-none text-foreground">{card.value}</p>
                      <p className="mt-3 text-lg text-muted-foreground">{card.sublabel}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                      <Icon className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-rows-[1fr_1fr] gap-6">
        <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="flex h-full flex-col justify-between p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                <Globe className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">ICE futures board</p>
                <h3 className="text-3xl font-black text-foreground">External market</h3>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg text-muted-foreground">Arabica</p>
                    <p className="text-6xl font-black text-foreground">{(liveIcePrices.iceArabica ?? prices.iceArabica).toFixed(2)}</p>
                  </div>
                  <p className="pb-2 text-xl text-muted-foreground">¢/lb</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg text-muted-foreground">Robusta</p>
                    <p className="text-6xl font-black text-foreground">{numberFormat.format(liveIcePrices.iceRobusta ?? prices.robusta)}</p>
                  </div>
                  <p className="pb-2 text-xl text-muted-foreground">USD/mt</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="flex h-full flex-col justify-between p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Currency & sync</p>
              <h3 className="mt-3 text-3xl font-black text-foreground">Market wiring</h3>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-[1.5rem] border border-border/60 bg-background/70 px-6 py-5">
                <span className="text-xl text-muted-foreground">USD / UGX</span>
                <span className="text-4xl font-black text-foreground">{numberFormat.format(prices.exchangeRate)}</span>
              </div>
              <div className="flex items-center justify-between rounded-[1.5rem] border border-border/60 bg-background/70 px-6 py-5">
                <span className="text-xl text-muted-foreground">ICE source</span>
                <span className="text-2xl font-bold text-foreground">{liveIcePrices.source || "Yahoo Finance"}</span>
              </div>
              <div className="flex items-center justify-between rounded-[1.5rem] border border-border/60 bg-background/70 px-6 py-5">
                <span className="text-xl text-muted-foreground">Market refresh</span>
                <span className="text-2xl font-bold text-foreground">
                  {liveIcePrices.fetchedAt ? new Date(liveIcePrices.fetchedAt).toLocaleTimeString() : "Waiting..."}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HeroPricesSlide;
