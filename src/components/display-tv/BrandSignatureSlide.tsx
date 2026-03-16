import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe2, MonitorPlay, Sparkles } from "lucide-react";
import logo from "@/assets/display-tv-logo.png";

interface BrandSignatureSlideProps {
  variant?: "intro" | "outro";
}

const BrandSignatureSlide = ({ variant = "intro" }: BrandSignatureSlideProps) => {
  const isIntro = variant === "intro";

  return (
    <div className="grid h-full grid-cols-[1.05fr_0.95fr] gap-8 px-12 py-10">
      <Card className="tv-surface-brand rounded-[2rem] border-border/60 shadow-xl backdrop-blur">
        <CardContent className="flex h-full flex-col justify-between p-10">
          <div className="space-y-6">
            <Badge className="w-fit rounded-full bg-primary/15 px-4 py-1 text-base text-primary hover:bg-primary/15">
              {isIntro ? "Live TV presentation" : "Brand close"}
            </Badge>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Kasese • Uganda</p>
              <h2 className="mt-5 max-w-4xl text-8xl font-black leading-[0.92] tracking-tight text-foreground">
                Great Agro Coffee
              </h2>
              <p className="mt-6 max-w-4xl text-3xl leading-relaxed text-foreground/90">
                {isIntro
                  ? "A colorful 15-slide market board for today’s prices, ICE futures, sales flow, and coffee news across Africa."
                  : "Stay with the board for live buying prices, current sales dispatch, coffee-market headlines, and continuous factory updates."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Slides", value: "15", icon: MonitorPlay },
              { label: "Coverage", value: "Local + ICE", icon: Globe2 },
              { label: "Style", value: "Live + Branded", icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[1.5rem] border border-border/50 bg-background/70 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{item.label}</p>
                      <p className="mt-4 text-4xl font-black text-foreground">{item.value}</p>
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
        <CardContent className="flex h-full items-center justify-center p-10">
          <div className="tv-brand-halo relative flex h-full w-full items-center justify-center rounded-[2rem] border border-border/50 bg-background/70 p-10">
            <img
              src={logo}
              alt="Great Agro Coffee logo"
              className="relative z-10 max-h-[36rem] w-auto object-contain drop-shadow-2xl"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandSignatureSlide;
