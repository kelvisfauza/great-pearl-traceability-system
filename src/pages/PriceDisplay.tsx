import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DisplaySlideFrame from "@/components/display-tv/DisplaySlideFrame";
import DisplayHeader from "@/components/display-tv/DisplayHeader";
import DisplayFooter from "@/components/display-tv/DisplayFooter";
import HeroPricesSlide from "@/components/display-tv/HeroPricesSlide";
import OperationsSlide from "@/components/display-tv/OperationsSlide";
import PriceChartsSlide from "@/components/display-tv/PriceChartsSlide";
import MarketPulseSlide from "@/components/display-tv/MarketPulseSlide";
import CoffeeNewsSlide from "@/components/display-tv/CoffeeNewsSlide";
import ComplianceSlide from "@/components/display-tv/ComplianceSlide";
import { useReferencePrices } from "@/hooks/useReferencePrices";
import { useDisplayData } from "@/hooks/useDisplayData";
import { useLiveIcePrices } from "@/hooks/useLiveIcePrices";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useCoffeeMarketBriefing } from "@/hooks/useCoffeeMarketBriefing";
import type { DisplaySlide } from "@/components/display-tv/types";

const PriceDisplay = () => {
  const { prices, loading: pricesLoading, fetchPrices } = useReferencePrices();
  const displayData = useDisplayData();
  const { data: liveIcePrices, refresh: refreshIcePrices } = useLiveIcePrices();
  const { history, loading: historyLoading, refreshHistory } = usePriceHistory(30);

  const marketSnapshot = useMemo(
    () => ({
      iceArabica: liveIcePrices.iceArabica ?? prices.iceArabica,
      iceRobusta: liveIcePrices.iceRobusta ?? prices.robusta,
      exchangeRate: prices.exchangeRate,
      localArabica: prices.arabicaBuyingPrice,
      localRobusta: prices.robustaBuyingPrice,
      history: history.map((item) => ({
        date: item.price_date,
        iceArabica: item.ice_arabica,
        iceRobusta: item.robusta_international,
        localArabica: item.arabica_buying_price,
        localRobusta: item.robusta_buying_price,
      })),
    }),
    [history, liveIcePrices.iceArabica, liveIcePrices.iceRobusta, prices.arabicaBuyingPrice, prices.exchangeRate, prices.iceArabica, prices.robusta, prices.robustaBuyingPrice]
  );

  const { briefing, loading: briefingLoading, refresh: refreshBriefing } = useCoffeeMarketBriefing(marketSnapshot);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const slides = useMemo<DisplaySlide[]>(() => [
    {
      id: "hero",
      label: "Live buying board",
      duration: 14000,
      content: <HeroPricesSlide prices={prices} liveIcePrices={liveIcePrices} briefing={briefing} />,
    },
    {
      id: "operations",
      label: "Factory operations",
      duration: 12000,
      content: <OperationsSlide data={displayData} />,
    },
    {
      id: "charts",
      label: "Price graphs",
      duration: 14000,
      content: <PriceChartsSlide history={history} loading={historyLoading} />,
    },
    {
      id: "pulse",
      label: "Upside & downside drivers",
      duration: 12000,
      content: <MarketPulseSlide briefing={briefing} loading={briefingLoading} />,
    },
    {
      id: "news",
      label: "Coffee news",
      duration: 14000,
      content: <CoffeeNewsSlide briefing={briefing} loading={briefingLoading} />,
    },
    {
      id: "compliance",
      label: "Traceability & milling",
      duration: 11000,
      content: <ComplianceSlide data={displayData} />,
    },
  ], [briefing, briefingLoading, displayData, history, historyLoading, liveIcePrices, prices]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, slides[activeIndex]?.duration ?? 12000);

    return () => window.clearTimeout(timer);
  }, [activeIndex, slides]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch (error) {
        console.error("Wake lock failed", error);
      }
    };

    requestWakeLock();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, []);

  const refreshAll = useCallback(() => {
    fetchPrices();
    refreshIcePrices();
    refreshHistory();
    refreshBriefing();
  }, [fetchPrices, refreshBriefing, refreshHistory, refreshIcePrices]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen failed", error);
    }
  }, []);

  const tickerItems = useMemo(() => {
    const purchaseItems = displayData.todayPurchases.slice(0, 6).map(
      (purchase) => `${purchase.supplier_name} delivered ${purchase.kilograms} kg of ${purchase.coffee_type}`
    );
    const headlineItems = (briefing?.headlines ?? []).slice(0, 6).map((headline) => headline.title);
    return [...purchaseItems, ...headlineItems];
  }, [briefing?.headlines, displayData.todayPurchases]);

  const currentSlide = slides[activeIndex];

  return (
    <div className="tv-display-shell min-h-screen bg-background p-5 text-foreground">
      <DisplaySlideFrame>
        <main className="tv-display-stage flex h-full flex-col overflow-hidden bg-background">
          <DisplayHeader
            title="Coffee Market TV Presentation"
            slideLabel={currentSlide.label}
            slideIndex={activeIndex}
            slideCount={slides.length}
            onRefresh={refreshAll}
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
          />

          <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%),radial-gradient(circle_at_bottom_right,hsl(var(--chart-2)/0.12),transparent_30%)]">
            <div key={currentSlide.id} className="animate-fadeIn h-full">
              {currentSlide.content}
            </div>

            <div className="absolute bottom-8 left-12 right-12 flex items-center gap-3">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  aria-label={`Go to ${slide.label}`}
                  className={`h-3 rounded-full transition-all duration-300 ${index === activeIndex ? "w-16 bg-primary" : "w-3 bg-border"}`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>

          <DisplayFooter tickerItems={tickerItems} />
        </main>
      </DisplaySlideFrame>

      {(pricesLoading || !displayData.loaded) && (
        <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto flex w-fit items-center gap-3 rounded-full border border-border/60 bg-card/90 px-5 py-3 text-sm font-medium text-muted-foreground shadow-xl backdrop-blur">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
          Loading real-time display data...
        </div>
      )}
    </div>
  );
};

export default PriceDisplay;
