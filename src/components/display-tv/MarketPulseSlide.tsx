import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownRight, ArrowUpRight, Minus, Radar } from "lucide-react";
import type { CoffeeMarketBriefing, MarketDirection } from "@/components/display-tv/types";

interface MarketPulseSlideProps {
  briefing: CoffeeMarketBriefing | null;
  loading: boolean;
}

const directionMeta: Record<MarketDirection, { label: string; Icon: typeof ArrowUpRight }> = {
  upside: { label: "Upside", Icon: ArrowUpRight },
  downside: { label: "Downside", Icon: ArrowDownRight },
  neutral: { label: "Neutral", Icon: Minus },
};

const MarketPulseSlide = ({ briefing, loading }: MarketPulseSlideProps) => {
  if (loading && !briefing) {
    return (
      <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-8 px-12 py-10">
        <Skeleton className="h-full rounded-[2rem]" />
        <Skeleton className="h-full rounded-[2rem]" />
      </div>
    );
  }

  const arabica = directionMeta[briefing?.arabicaDirection ?? "neutral"];
  const robusta = directionMeta[briefing?.robustaDirection ?? "neutral"];

  return (
    <div className="grid h-full grid-cols-[0.85fr_1.15fr] gap-8 px-12 py-10">
      <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
        <CardContent className="flex h-full flex-col p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/12 p-4 text-primary">
              <Radar className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Market pulse</p>
              <h2 className="text-4xl font-black text-foreground">Why prices may move next</h2>
            </div>
          </div>

          <p className="mt-8 text-3xl leading-relaxed text-foreground">
            {briefing?.summary || "Coffee-market reasons are being prepared from live coffee headlines and the latest futures snapshot."}
          </p>

          <div className="mt-auto grid grid-cols-2 gap-4 pt-8">
            <div className="rounded-[1.5rem] border border-border/50 bg-background/70 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Arabica</p>
              <div className="mt-4 flex items-center gap-3 text-foreground">
                <arabica.Icon className="h-8 w-8 text-primary" />
                <span className="text-4xl font-black">{arabica.label}</span>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border/50 bg-background/70 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Robusta</p>
              <div className="mt-4 flex items-center gap-3 text-foreground">
                <robusta.Icon className="h-8 w-8 text-primary" />
                <span className="text-4xl font-black">{robusta.label}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-8">
            <Badge className="rounded-full bg-primary/12 px-4 py-1 text-sm text-primary hover:bg-primary/12">Upside reasons</Badge>
            <div className="mt-6 space-y-4">
              {(briefing?.bullishReasons ?? []).slice(0, 5).map((reason, index) => (
                <div key={reason} className="rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">
                  <p className="text-lg text-muted-foreground">0{index + 1}</p>
                  <p className="mt-2 text-2xl font-semibold leading-snug text-foreground">{reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-8">
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">Downside reasons</Badge>
            <div className="mt-6 space-y-4">
              {(briefing?.bearishReasons ?? []).slice(0, 5).map((reason, index) => (
                <div key={reason} className="rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">
                  <p className="text-lg text-muted-foreground">0{index + 1}</p>
                  <p className="mt-2 text-2xl font-semibold leading-snug text-foreground">{reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketPulseSlide;
