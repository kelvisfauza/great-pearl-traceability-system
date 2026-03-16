import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import type { MarketDirection } from "@/components/display-tv/types";

interface MarketFocusSlideProps {
  market: "Arabica" | "Robusta";
  localPrice: number;
  externalPrice: number | null;
  externalUnit: string;
  direction: MarketDirection;
  reasons: string[];
}

const numberFormat = new Intl.NumberFormat("en-UG");

const directionMeta = {
  upside: { label: "Upside pressure", Icon: ArrowUpRight },
  downside: { label: "Downside pressure", Icon: ArrowDownRight },
  neutral: { label: "Balanced market", Icon: Minus },
} satisfies Record<MarketDirection, { label: string; Icon: typeof ArrowUpRight }>;

const MarketFocusSlide = ({ market, localPrice, externalPrice, externalUnit, direction, reasons }: MarketFocusSlideProps) => {
  const { label, Icon } = directionMeta[direction];

  return (
    <div className="grid h-full grid-cols-[1fr_0.95fr] gap-8 px-12 py-10">
      <Card className="tv-surface-market rounded-[2rem] border-border/60 shadow-xl backdrop-blur">
        <CardContent className="flex h-full flex-col justify-between p-10">
          <div>
            <Badge className="rounded-full bg-primary/15 px-4 py-1 text-base text-primary hover:bg-primary/15">
              {market} spotlight
            </Badge>
            <p className="mt-8 text-sm uppercase tracking-[0.35em] text-muted-foreground">Live market focus</p>
            <h2 className="mt-5 text-7xl font-black leading-[0.94] tracking-tight text-foreground">
              {market} gets its own slide on this TV board.
            </h2>
            <p className="mt-6 max-w-3xl text-3xl leading-relaxed text-foreground/90">
              One crop, one signal, one quick read — so the team can react without hunting through numbers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-[1.75rem] border border-border/50 bg-background/75 p-7">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Local buying price</p>
              <p className="mt-5 text-6xl font-black leading-none text-foreground">{numberFormat.format(localPrice)}</p>
              <p className="mt-3 text-xl text-muted-foreground">UGX/kg</p>
            </div>
            <div className="rounded-[1.75rem] border border-border/50 bg-background/75 p-7">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">External reference</p>
              <p className="mt-5 text-6xl font-black leading-none text-foreground">
                {externalPrice == null ? "--" : numberFormat.format(externalPrice)}
              </p>
              <p className="mt-3 text-xl text-muted-foreground">{externalUnit}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-rows-[0.55fr_1fr] gap-6">
        <Card className="rounded-[2rem] border-border/60 bg-card/90 shadow-xl backdrop-blur">
          <CardContent className="flex h-full flex-col justify-center p-8">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Current signal</p>
                <h3 className="text-4xl font-black text-foreground">{label}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/60 bg-card/90 shadow-xl backdrop-blur">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                <TrendingUp className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Presentation notes</p>
                <h3 className="text-3xl font-black text-foreground">Why the room should care</h3>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {(reasons.length ? reasons : ["Market reasons are refreshing.", "Headline analysis is still loading.", "The board will fill in automatically."]).slice(0, 4).map((reason, index) => (
                <div key={`${reason}-${index}`} className="rounded-[1.5rem] border border-border/50 bg-background/75 px-5 py-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Point 0{index + 1}</p>
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

export default MarketFocusSlide;
