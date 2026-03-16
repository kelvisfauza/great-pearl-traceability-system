import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, RefreshCw, Radio } from "lucide-react";
import logo from "@/assets/display-tv-logo.png";

interface DisplayHeaderProps {
  title: string;
  slideLabel: string;
  slideIndex: number;
  slideCount: number;
  onRefresh: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

const DisplayHeader = ({
  title,
  slideLabel,
  slideIndex,
  slideCount,
  onRefresh,
  onToggleFullscreen,
  isFullscreen,
}: DisplayHeaderProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="flex items-start justify-between border-b border-border/50 px-12 py-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge className="gap-2 rounded-full bg-primary/15 px-4 py-1 text-sm text-primary hover:bg-primary/15">
            <Radio className="h-4 w-4" />
            Live TV Feed
          </Badge>
          <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">
            Slide {slideIndex + 1} / {slideCount}
          </Badge>
        </div>
        <div className="flex items-center gap-5">
          <div className="rounded-[1.4rem] border border-border/50 bg-card/80 p-3 shadow-lg">
            <img src={logo} alt="Great Agro Coffee logo" className="h-16 w-16 rounded-full object-cover" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Great Agro Coffee</p>
            <h1 className="text-5xl font-black tracking-tight text-foreground">{title}</h1>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="rounded-[1.5rem] border border-border/60 bg-card/70 px-6 py-4 text-right shadow-lg backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{slideLabel}</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-foreground">{format(now, "HH:mm:ss")}</p>
          <p className="mt-1 text-lg text-muted-foreground">{format(now, "EEEE, dd MMM yyyy")}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="icon" onClick={onRefresh} className="h-14 w-14 rounded-2xl">
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="icon" onClick={onToggleFullscreen} className="h-14 w-14 rounded-2xl">
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DisplayHeader;
