import { useEffect, useMemo, useRef, useState } from "react";
import { usePrices } from "@/contexts/PriceContext";
import { useDisplayData } from "@/hooks/useDisplayData";
import logoUrl from "@/assets/great-agro-coffee-logo.png";

// YouTube documentaries shown when the user is inactive.
const VIDEOS: { id: string; start: number; title: string }[] = [
  { id: "b2iSY1KOf4A", start: 0, title: "The Value of Coffee" },
  { id: "ejHDV8g-5sg", start: 4, title: "Coffee Around the World" },
];

const MARQUEE_MESSAGES = [
  "Great Agro Coffee — Tracing every bean from farm to cup",
  "Learn the true value of coffee: farmers, quality, and global markets",
  "EUDR-ready • Traceable • Sustainable • Premium Ugandan Coffee",
  "Knowledge is power — understand the journey of the coffee you trade",
  "Great Agro Coffee — Empowering farmers, informing buyers",
];

const IdleDocumentary = () => {
  const [muted, setMuted] = useState(true);
  const [videoIdx, setVideoIdx] = useState(0);
  const [splitMode, setSplitMode] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { prices } = usePrices();
  const { topSuppliers, todayPurchases } = useDisplayData();

  // Try to enter fullscreen for a cinema feel; ignore if blocked.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const tryFs = async () => {
      try {
        if (!document.fullscreenElement) await el.requestFullscreen?.();
      } catch {
        /* user gesture may be required — ignore */
      }
    };
    tryFs();
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Toggle split layout every 10s
  useEffect(() => {
    const id = setInterval(() => setSplitMode((s) => !s), 10_000);
    return () => clearInterval(id);
  }, []);

  // Rotate between videos every 90s
  useEffect(() => {
    const id = setInterval(() => setVideoIdx((i) => (i + 1) % VIDEOS.length), 90_000);
    return () => clearInterval(id);
  }, []);

  // Green logo splash every 20s (visible ~3s)
  useEffect(() => {
    const id = setInterval(() => {
      setShowSplash(true);
      setTimeout(() => setShowSplash(false), 3000);
    }, 20_000);
    return () => clearInterval(id);
  }, []);

  const current = VIDEOS[videoIdx];
  const src = useMemo(
    () =>
      `https://www.youtube.com/embed/${current.id}?autoplay=1&mute=${
        muted ? 1 : 0
      }&controls=0&modestbranding=1&rel=0&loop=1&playlist=${current.id}&playsinline=1&iv_load_policy=3&start=${current.start}`,
    [current.id, current.start, muted]
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden"
    >
      {/* Video — shrinks to left when split mode is active */}
      <div
        className={`absolute top-0 left-0 h-full transition-all duration-700 ease-in-out ${
          splitMode ? "w-[62%]" : "w-full"
        }`}
      >
        <iframe
          key={current.id}
          title={`Great Agro Coffee — ${current.title}`}
          src={src}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>

      {/* Live data side panel */}
      <div
        className={`absolute top-0 right-0 h-full w-[38%] bg-gradient-to-br from-emerald-950 via-black to-amber-950 border-l-4 border-amber-500/60 transition-all duration-700 ease-in-out flex flex-col ${
          splitMode ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 to-emerald-600 border-b border-amber-400/40">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200">Today's Buying Prices</div>
          <div className="text-xl font-black tracking-wide">GREAT AGRO COFFEE • LIVE</div>
        </div>

        <div className="p-6 grid grid-cols-2 gap-3">
          {[
            { label: "Drugar Local", value: prices.drugarLocal },
            { label: "Wugar Local", value: prices.wugarLocal },
            { label: "Robusta FAQ", value: prices.robustaFaqLocal },
            { label: "ICE Arabica", value: prices.iceArabica, suffix: " ¢/lb", noUgx: true },
          ].map((p) => (
            <div key={p.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-[10px] uppercase tracking-widest text-amber-300/80">{p.label}</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {p.noUgx ? "" : "UGX "}
                {Number(p.value || 0).toLocaleString()}
                {p.suffix || (p.noUgx ? "" : "/kg")}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-2">
          <div className="text-xs uppercase tracking-[0.25em] text-amber-300/80 mb-2">Top Suppliers</div>
          <div className="space-y-1.5">
            {topSuppliers.slice(0, 8).map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-semibold">{s.name}</span>
                </div>
                <span className="text-sm font-bold text-amber-300 flex-shrink-0 ml-2">
                  {s.kgs.toLocaleString()} kg
                </span>
              </div>
            ))}
            {topSuppliers.length === 0 && (
              <div className="text-xs text-white/50 italic">Loading supplier data…</div>
            )}
          </div>
        </div>

        {todayPurchases.length > 0 && (
          <div className="px-6 pt-3 pb-4 mt-auto border-t border-white/10">
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300/80 mb-1">
              Latest Today
            </div>
            <div className="text-xs text-white/80 truncate">
              {todayPurchases[0].supplier_name} — {Number(todayPurchases[0].kilograms).toLocaleString()} kg{" "}
              {todayPurchases[0].coffee_type}
            </div>
          </div>
        )}
      </div>

      {/* Top branding bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center font-black text-black text-lg shadow-lg">
            G
          </div>
          <div>
            <div className="text-base md:text-lg font-bold tracking-wide">
              GREAT AGRO COFFEE
            </div>
            <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-amber-300/80">
              The Value of Coffee — A Documentary
            </div>
          </div>
        </div>
        <div className="hidden md:block text-xs uppercase tracking-widest text-white/60">
          Idle Mode • Move mouse or tap to resume
        </div>
      </div>

      {/* Mute toggle (interactive) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute top-4 right-4 z-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-white/20 transition"
      >
        {muted ? "🔇 Unmute" : "🔊 Mute"}
      </button>

      {/* Green company splash — every 20s */}
      {showSplash && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 animate-fade-in">
          <img
            src={logoUrl}
            alt="Great Agro Coffee"
            className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl animate-scale-in"
          />
          <div className="mt-6 text-4xl md:text-6xl font-black tracking-wide text-white text-center px-6">
            GREAT AGRO COFFEE
          </div>
          <div className="mt-2 text-sm md:text-lg uppercase tracking-[0.4em] text-amber-200">
            Great Pearl Coffee Factory
          </div>
          <div className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-emerald-100/90">
            From Farm • To Cup • Traceable • Sustainable
          </div>
        </div>
      )}

      {/* Bottom marquee educating about coffee value */}
      <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-3 pointer-events-none">
        <div className="overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-[marquee_45s_linear_infinite] text-amber-200 font-semibold text-lg md:text-2xl">
            {[...MARQUEE_MESSAGES, ...MARQUEE_MESSAGES].map((msg, i) => (
              <span key={i} className="mx-12">
                ★ {msg}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2 text-center text-[10px] md:text-xs uppercase tracking-[0.3em] text-white/50">
          Great Agro Coffee • Great Pearl Coffee Factory • Uganda
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default IdleDocumentary;