import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Factory, FileCheck2, MapPinned, ShieldCheck } from "lucide-react";
import type { DisplayData } from "@/hooks/useDisplayData";

interface ComplianceSlideProps {
  data: DisplayData;
}

const integerFormat = new Intl.NumberFormat("en-UG");

const ComplianceSlide = ({ data }: ComplianceSlideProps) => {
  const blocks = [
    { label: "Traced batches", value: integerFormat.format(data.tracedBatches), icon: ShieldCheck },
    { label: "EUDR compliant", value: integerFormat.format(data.eudrCompliant), icon: CheckCircle2 },
    { label: "Support docs", value: integerFormat.format(data.totalDocs), icon: FileCheck2 },
    { label: "Processed", value: `${integerFormat.format(data.totalProcessed)} kg`, icon: Factory },
    { label: "Sales dispatched", value: `${integerFormat.format(data.dispatched)} kg`, icon: Factory },
  ];

  return (
    <div className="grid h-full grid-cols-[1fr_0.95fr] gap-8 px-12 py-10">
      <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
        <CardContent className="p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Compliance + milling + sales</p>
          <h2 className="mt-4 text-6xl font-black tracking-tight text-foreground">Traceability, factory execution, and sales stay visible on the same screen.</h2>
          <p className="mt-6 max-w-4xl text-2xl leading-relaxed text-muted-foreground">
            The TV presentation is not only for prices — it also keeps the room aware of traceability coverage, EUDR readiness, milling throughput, and sales dispatch progress.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-5">
            {blocks.map((block) => {
              const Icon = block.icon;
              return (
                <div key={block.label} className="rounded-[1.5rem] border border-border/50 bg-background/70 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{block.label}</p>
                      <p className="mt-5 text-5xl font-black text-foreground">{block.value}</p>
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

      <div className="grid gap-6">
        <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                <MapPinned className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Top origin districts</p>
                <h3 className="text-4xl font-black text-foreground">Where coffee is concentrating</h3>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {data.topDistricts.length > 0 ? (
                data.topDistricts.map((district, index) => (
                  <div key={district} className="flex items-center justify-between rounded-[1.5rem] border border-border/50 bg-background/70 px-6 py-5">
                    <p className="text-2xl font-semibold text-foreground">{district}</p>
                    <p className="text-lg uppercase tracking-[0.2em] text-muted-foreground">Zone {index + 1}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-border/50 bg-background/70 px-6 py-10 text-center text-xl text-muted-foreground">
                  District concentration will appear here once supplier origin data is available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/60 bg-card/85 shadow-xl backdrop-blur">
          <CardContent className="p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Operations note</p>
            <p className="mt-4 text-3xl leading-relaxed text-foreground">
              Keeping compliance, dispatch, and origin visibility on the same TV stream helps field, quality, milling, and management teams react faster together.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceSlide;
