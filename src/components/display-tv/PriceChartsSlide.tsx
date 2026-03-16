import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { PriceHistoryRecord } from "@/hooks/usePriceHistory";

interface PriceChartsSlideProps {
  history: PriceHistoryRecord[];
  loading: boolean;
}

const chartConfig = {
  iceArabica: { label: "ICE Arabica", color: "hsl(var(--chart-1))" },
  localArabica: { label: "Local Arabica", color: "hsl(var(--chart-3))" },
  iceRobusta: { label: "ICE Robusta", color: "hsl(var(--chart-2))" },
  localRobusta: { label: "Local Robusta", color: "hsl(var(--chart-4))" },
};

const PriceChartsSlide = ({ history, loading }: PriceChartsSlideProps) => {
  const chartData = history.slice(-14).map((item) => ({
    date: new Date(item.price_date).toLocaleDateString("en-UG", { month: "short", day: "numeric" }),
    iceArabica: item.ice_arabica,
    iceRobusta: item.robusta_international,
    localArabica: item.arabica_buying_price,
    localRobusta: item.robusta_buying_price,
  }));

  return (
    <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-8 px-12 py-10">
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Price behavior</p>
          <h2 className="mt-4 text-6xl font-black tracking-tight text-foreground">See the internal market react against ICE.</h2>
          <p className="mt-5 max-w-3xl text-2xl leading-relaxed text-muted-foreground">
            These charts compare external futures with local buying levels so the TV screen shows direction, spread, and pace — not just static numbers.
          </p>
        </div>

        <Card className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">What to watch</p>
            <div className="mt-5 grid gap-4 text-xl text-foreground">
              <div className="rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">If ICE rises while local prices lag, buying margin pressure normally follows.</div>
              <div className="rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">If local buying rises faster than ICE, procurement is reacting to field competition or supply tightness.</div>
              <div className="rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">Watch Arabica and Robusta spreads separately — they respond to different export and harvest signals.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-rows-2 gap-6">
        <Card className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Arabica trend</p>
              <h3 className="text-3xl font-black text-foreground">ICE vs local buying price</h3>
            </div>
            {loading ? (
              <Skeleton className="h-[330px] w-full rounded-[1.5rem]" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[330px] w-full">
                <AreaChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="iceArabica" stroke="var(--color-iceArabica)" fill="var(--color-iceArabica)" fillOpacity={0.16} strokeWidth={3} />
                  <Area type="monotone" dataKey="localArabica" stroke="var(--color-localArabica)" fill="var(--color-localArabica)" fillOpacity={0.12} strokeWidth={3} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Robusta trend</p>
              <h3 className="text-3xl font-black text-foreground">ICE vs local buying price</h3>
            </div>
            {loading ? (
              <Skeleton className="h-[330px] w-full rounded-[1.5rem]" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[330px] w-full">
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="iceRobusta" stroke="var(--color-iceRobusta)" strokeWidth={4} dot={false} />
                  <Line type="monotone" dataKey="localRobusta" stroke="var(--color-localRobusta)" strokeWidth={4} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PriceChartsSlide;
