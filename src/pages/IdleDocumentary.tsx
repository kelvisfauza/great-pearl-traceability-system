import { useEffect, useRef, useState } from "react";

// YouTube documentary shown when the user is inactive.
// Source: https://youtu.be/b2iSY1KOf4A
const YT_ID = "b2iSY1KOf4A";

const MARQUEE_MESSAGES = [
  "Great Agro Coffee — Tracing every bean from farm to cup",
  "Learn the true value of coffee: farmers, quality, and global markets",
  "EUDR-ready • Traceable • Sustainable • Premium Ugandan Coffee",
  "Knowledge is power — understand the journey of the coffee you trade",
  "Great Agro Coffee — Empowering farmers, informing buyers",
];

const IdleDocumentary = () => {
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const src = `https://www.youtube.com/embed/${YT_ID}?autoplay=1&mute=${
    muted ? 1 : 0
  }&controls=0&modestbranding=1&rel=0&loop=1&playlist=${YT_ID}&playsinline=1&iv_load_policy=3`;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden"
    >
      {/* Video */}
      <iframe
        title="Great Agro Coffee — The Value of Coffee"
        src={src}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />

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