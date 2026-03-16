import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Building2, Package2, ShoppingBasket, TimerReset, Users } from "lucide-react";
import type { DisplayData } from "@/hooks/useDisplayData";

interface OperationsSlideProps {
  data: DisplayData;
}

const integerFormat = new Intl.NumberFormat("en-UG");

const OperationsSlide = ({ data }: OperationsSlideProps) => {
  const metrics = [
    { label: "Active suppliers", value: integerFormat.format(data.totalSuppliers), icon: Users },
    { label: "Total bought (kg)", value: integerFormat.format(data.totalKgs), icon: ShoppingBasket },
    { label: "Avg per supplier", value: integerFormat.format(data.avgPerSupplier), icon: Activity },
    { label: "Pending lots", value: integerFormat.format(data.pendingCount), icon: TimerReset },
  ];

  return (
    <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-8 px-12 py-10">
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Internal operations</p>
          <h2 className="mt-4 text-6xl font-black tracking-tight text-foreground">Factory intake is moving in real time.</h2>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-5 text-5xl font-black text-foreground">{metric.value}</p>
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

        <Card className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Top suppliers</p>
                <h3 className="text-3xl font-black text-foreground">Who is moving the most coffee</h3>
              </div>
            </div>

            <div className="space-y-3">
              {data.topSuppliers.slice(0, 5).map((supplier, index) => (
                <div key={supplier.name} className="flex items-center justify-between rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl font-black text-primary">
                      {index + 1}
                    </div>
                    <p className="text-2xl font-semibold text-foreground">{supplier.name}</p>
                  </div>
                  <p className="text-2xl font-black text-foreground">{integerFormat.format(supplier.kgs)} kg</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-rows-[0.9fr_1.1fr] gap-6">
        <Card className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                <Package2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Top buyers</p>
                <h3 className="text-3xl font-black text-foreground">Current demand anchors</h3>
              </div>
            </div>

            <div className="grid gap-3">
              {data.topBuyers.slice(0, 6).map((buyer, index) => (
                <div key={buyer.name} className="flex items-center justify-between rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-lg font-black text-primary">
                      {index + 1}
                    </div>
                    <p className="text-xl font-semibold text-foreground">{buyer.name}</p>
                  </div>
                  <p className="text-xl font-black text-foreground">{integerFormat.format(buyer.value)} kg</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="flex h-full flex-col p-6">
            <div className="mb-5">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Latest buying activity</p>
              <h3 className="text-3xl font-black text-foreground">Today’s receipts</h3>
            </div>

            <ScrollArea className="h-full pr-4">
              <div className="space-y-3">
                {data.todayPurchases.length > 0 ? (
                  data.todayPurchases.map((purchase, index) => (
                    <div key={`${purchase.supplier_name}-${index}`} className="rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xl font-semibold text-foreground">{purchase.supplier_name}</p>
                          <p className="text-base text-muted-foreground">{purchase.coffee_type}</p>
                        </div>
                        <p className="text-2xl font-black text-foreground">{integerFormat.format(purchase.kilograms)} kg</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-border/50 bg-background/70 px-5 py-10 text-center text-xl text-muted-foreground">
                    No purchases recorded yet today.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OperationsSlide;
