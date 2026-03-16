import { Card, CardContent } from "@/components/ui/card";
import { BadgeDollarSign, ChartNoAxesCombined, PackageCheck, Truck } from "lucide-react";
import type { DisplayData } from "@/hooks/useDisplayData";

interface SalesDispatchSlideProps {
  data: DisplayData;
}

const numberFormat = new Intl.NumberFormat("en-UG");

const SalesDispatchSlide = ({ data }: SalesDispatchSlideProps) => {
  const soldKg = data.dispatched;
  const processedKg = data.totalProcessed;
  const salesVsProcessed = processedKg > 0 ? Math.round((soldKg / processedKg) * 100) : 0;

  const metrics = [
    { label: "Sales dispatched", value: `${numberFormat.format(soldKg)} kg`, icon: Truck },
    { label: "Processed coffee", value: `${numberFormat.format(processedKg)} kg`, icon: PackageCheck },
    { label: "Sales conversion", value: `${salesVsProcessed}%`, icon: ChartNoAxesCombined },
    { label: "Buyers on board", value: numberFormat.format(data.topBuyers.length), icon: BadgeDollarSign },
  ];

  return (
    <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-8 px-12 py-10">
      <Card className="tv-surface-warm rounded-[2rem] border-border/60 shadow-xl backdrop-blur">
        <CardContent className="flex h-full flex-col justify-between p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Sales movement</p>
            <h2 className="mt-5 text-7xl font-black leading-[0.94] tracking-tight text-foreground">
              On this board, dispatched means sales.
            </h2>
            <p className="mt-6 max-w-3xl text-3xl leading-relaxed text-foreground/90">
              This slide turns shipment data into a simple sales story for the room: what has moved, who is buying, and how much has already left the factory.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-[1.75rem] border border-border/50 bg-background/75 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-5 text-5xl font-black leading-none text-foreground">{metric.value}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                      <Icon className="h-7 w-7" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/60 bg-card/90 shadow-xl backdrop-blur">
        <CardContent className="p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Demand anchors</p>
          <h3 className="mt-3 text-4xl font-black text-foreground">Top buyers currently reflected as sales</h3>

          <div className="mt-8 space-y-4">
            {data.topBuyers.length > 0 ? (
              data.topBuyers.slice(0, 6).map((buyer, index) => (
                <div key={buyer.name} className="flex items-center justify-between rounded-[1.5rem] border border-border/50 bg-background/75 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl font-black text-primary">
                      {index + 1}
                    </div>
                    <p className="text-2xl font-semibold text-foreground">{buyer.name}</p>
                  </div>
                  <p className="text-2xl font-black text-foreground">{numberFormat.format(buyer.value)} kg</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-border/50 bg-background/75 px-6 py-10 text-center text-2xl text-muted-foreground">
                Buyer-driven sales summaries will appear here when contract demand is available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesDispatchSlide;
