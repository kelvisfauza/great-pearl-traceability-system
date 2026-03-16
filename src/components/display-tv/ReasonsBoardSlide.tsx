import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface ReasonsBoardSlideProps {
  title: string;
  label: string;
  reasons: string[];
  variant: "upside" | "downside";
}

const ReasonsBoardSlide = ({ title, label, reasons, variant }: ReasonsBoardSlideProps) => {
  const isUpside = variant === "upside";
  const Icon = isUpside ? ArrowUpRight : ArrowDownRight;
  const fallback = isUpside
    ? [
        "Demand-side support is being recalculated.",
        "Fresh bullish headlines are on the way.",
        "Supply risks may still support nearby prices.",
      ]
    : [
        "Pressure-side signals are being refreshed.",
        "Harvest and macro headlines are still loading.",
        "Downside risk factors will appear shortly.",
      ];

  const visibleReasons = (reasons.length ? reasons : fallback).slice(0, 6);

  return (
    <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-8 px-12 py-10">
      <Card className={`${isUpside ? "tv-surface-success" : "tv-surface-warm"} rounded-[2rem] border-border/60 shadow-xl backdrop-blur`}>
        <CardContent className="flex h-full flex-col justify-between p-10">
          <div>
            <Badge className="rounded-full bg-primary/15 px-4 py-1 text-base text-primary hover:bg-primary/15">
              {label}
            </Badge>
            <h2 className="mt-8 text-7xl font-black leading-[0.94] tracking-tight text-foreground">{title}</h2>
            <p className="mt-6 max-w-3xl text-3xl leading-relaxed text-foreground/90">
              The presentation slows the market down into clear talking points so the team can understand the move, not just stare at numbers.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-[1.75rem] border border-border/50 bg-background/75 px-6 py-5">
            <div className="rounded-2xl bg-primary/12 p-4 text-primary">
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Signal</p>
              <p className="text-4xl font-black text-foreground">{isUpside ? "Bullish pressure" : "Bearish pressure"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        {visibleReasons.map((reason, index) => (
          <Card key={`${reason}-${index}`} className="rounded-[1.75rem] border-border/60 bg-card/90 shadow-xl backdrop-blur">
            <CardContent className="p-7">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Reason 0{index + 1}</p>
              <p className="mt-4 text-3xl font-semibold leading-snug text-foreground">{reason}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReasonsBoardSlide;
