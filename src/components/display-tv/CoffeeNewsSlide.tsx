import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper } from "lucide-react";
import type { CoffeeHeadline, CoffeeMarketBriefing } from "@/components/display-tv/types";

interface CoffeeNewsSlideProps {
  briefing: CoffeeMarketBriefing | null;
  loading: boolean;
  region?: "all" | "africa" | "global";
  title?: string;
  description?: string;
}

const CoffeeNewsSlide = ({
  briefing,
  loading,
  region = "all",
  title = "Coffee market stories in motion",
  description = "This slide keeps the buying room aware of export, harvest, weather, logistics, and macro headlines that can push Arabica or Robusta higher or lower.",
}: CoffeeNewsSlideProps) => {
  const headlines = (briefing?.headlines ?? []).filter((headline) => {
    if (region === "all") return true;
    return headline.region === region;
  });

  const visibleHeadlines = headlines.slice(0, 8);
  const audienceLabel = region === "africa" ? "African coffee news" : region === "global" ? "Global coffee news" : "Coffee headlines";

  return (
    <div className="grid h-full grid-cols-[0.8fr_1.2fr] gap-8 px-12 py-10">
      <Card className={`${region === "africa" ? "tv-surface-success" : "tv-surface-cool"} rounded-[2rem] border-border/60 shadow-xl backdrop-blur`}>
        <CardContent className="flex h-full flex-col p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/12 p-4 text-primary">
              <Newspaper className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{audienceLabel}</p>
              <h2 className="text-5xl font-black text-foreground">{region === "africa" ? "Coffee in Africa now" : "Live coffee headlines"}</h2>
            </div>
          </div>

          <p className="mt-8 text-3xl leading-relaxed text-foreground">{description}</p>

          <div className="mt-auto rounded-[1.5rem] border border-border/50 bg-background/70 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">News source</p>
            <p className="mt-3 text-3xl font-black text-foreground">{briefing?.source || "Coffee market feed"}</p>
            <p className="mt-2 text-xl text-muted-foreground">
              Updated {briefing?.updatedAt ? formatDistanceToNowStrict(new Date(briefing.updatedAt), { addSuffix: true }) : "just now"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
        <CardContent className="flex h-full flex-col p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Latest stories</p>
              <h3 className="text-4xl font-black text-foreground">{title}</h3>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">Live refresh</Badge>
          </div>

          {loading && !visibleHeadlines.length ? (
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-[1.5rem]" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {visibleHeadlines.length > 0 ? visibleHeadlines.map((headline: CoffeeHeadline, index) => (
                  <div key={`${headline.title}-${index}`} className="rounded-[1.5rem] border border-border/50 bg-background/70 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="rounded-full bg-primary/12 px-3 py-1 text-sm text-primary hover:bg-primary/12">{headline.source}</Badge>
                      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                        {headline.publishedAt ? formatDistanceToNowStrict(new Date(headline.publishedAt), { addSuffix: true }) : "Latest"}
                      </p>
                    </div>
                    <p className="mt-4 text-2xl font-semibold leading-snug text-foreground">{headline.title}</p>
                  </div>
                )) : (
                  <div className="rounded-[1.5rem] border border-border/50 bg-background/70 p-8 text-center text-2xl text-muted-foreground">
                    News for this region is still loading.
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoffeeNewsSlide;
