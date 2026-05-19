import { useEffect, useState } from "react";
import { X, Minus, ShieldAlert } from "lucide-react";

// Auto-hide after this date (end of May 2026)
const EXPIRES_AT = new Date("2026-06-01T00:00:00Z").getTime();

const TIPS = [
  { emoji: "😷", title: "Wear a Mask", text: "Cover nose & mouth in crowded areas.", color: "from-blue-500 to-cyan-500" },
  { emoji: "🧼", title: "Wash Hands", text: "Soap & water for 20+ seconds, often.", color: "from-emerald-500 to-teal-500" },
  { emoji: "🧴", title: "Sanitize", text: "Use alcohol-based sanitizer regularly.", color: "from-violet-500 to-fuchsia-500" },
  { emoji: "↔️", title: "Keep Distance", text: "Stay 1–2 meters apart where possible.", color: "from-amber-500 to-orange-500" },
  { emoji: "🚫🤝", title: "Avoid Handshakes", text: "No hugs, kisses or shared utensils.", color: "from-rose-500 to-red-500" },
  { emoji: "🌡️", title: "Report Symptoms", text: "Fever, bleeding, vomiting → isolate & call health line.", color: "from-red-600 to-rose-700" },
  { emoji: "🥩", title: "Cook Food Well", text: "Avoid bushmeat. Cook all meat thoroughly.", color: "from-yellow-500 to-amber-600" },
  { emoji: "⚱️", title: "Safe Burials", text: "Do not touch bodies of suspected cases.", color: "from-slate-600 to-zinc-700" },
];

const EbolaPrecautionPopup = () => {
  const [closed, setClosed] = useState<boolean>(() => sessionStorage.getItem("ebola_popup_closed") === "1");
  const [minimized, setMinimized] = useState<boolean>(() => localStorage.getItem("ebola_popup_minimized") === "1");
  const [index, setIndex] = useState(0);
  const [expired, setExpired] = useState(Date.now() > EXPIRES_AT);

  useEffect(() => {
    if (expired || closed || minimized) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(id);
  }, [expired, closed, minimized]);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() > EXPIRES_AT) setExpired(true);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (expired || closed) return null;

  const tip = TIPS[index];

  const handleClose = () => {
    sessionStorage.setItem("ebola_popup_closed", "1");
    setClosed(true);
  };
  const toggleMin = () => {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem("ebola_popup_minimized", next ? "1" : "0");
  };

  if (minimized) {
    return (
      <button
        onClick={toggleMin}
        className="fixed bottom-20 right-3 md:bottom-5 md:right-5 z-[60] h-12 w-12 rounded-full bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform print:hidden animate-pulse"
        aria-label="Show Ebola precautions"
        title="Ebola precautions"
      >
        <ShieldAlert className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-20 right-3 md:bottom-5 md:right-5 z-[60] w-[260px] md:w-[300px] print:hidden animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
            Ebola Precautions
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleMin} className="p-1 rounded hover:bg-white/20" aria-label="Minimize" title="Minimize">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleClose} className="p-1 rounded hover:bg-white/20" aria-label="Close" title="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div key={index} className="p-4 animate-scale-in">
          <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-br ${tip.color} flex items-center justify-center text-3xl shadow-inner mb-2 animate-pulse`}>
            <span>{tip.emoji}</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{tip.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{tip.text}</p>
          </div>
          <div className="flex justify-center gap-1 mt-3">
            {TIPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === index ? "w-4 bg-red-600" : "w-1 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EbolaPrecautionPopup;