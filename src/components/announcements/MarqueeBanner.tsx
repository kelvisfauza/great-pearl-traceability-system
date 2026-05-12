import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone, AlertTriangle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MarqueeAnnouncement {
  id: string;
  message: string;
  priority: "info" | "warning" | "critical";
  expires_at: string;
  is_active: boolean;
}

const ADMIN_ROLES = ["Administrator", "Super Admin", "Managing Director", "Admin"];

const priorityStyles = {
  info: "bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 text-white",
  warning: "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black",
  critical: "bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white",
};

const priorityIcon = {
  info: Megaphone,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const MarqueeBanner = () => {
  const { employee } = useAuth();
  const [items, setItems] = useState<MarqueeAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("marquee_dismissed_ids");
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });
  const [tick, setTick] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const isAdmin = employee?.role && ADMIN_ROLES.includes(employee.role);

  const load = async () => {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("marquee_announcements" as any)
      .select("id, message, priority, expires_at, is_active")
      .eq("is_active", true)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });
    if (data) setItems(data as any);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("marquee_announcements_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marquee_announcements" },
        () => load()
      )
      .subscribe();

    // Refresh every minute to drop expired
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      load();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const visible = items.filter((i) => !dismissed.has(i.id) && new Date(i.expires_at) > new Date());
  if (visible.length === 0) return null;

  // Sort highest priority first, but cycle through ALL of them
  const order = { critical: 0, warning: 1, info: 2 } as const;
  const sorted = [...visible].sort((a, b) => order[a.priority] - order[b.priority]);
  const current = sorted[activeIndex % sorted.length];
  const Icon = priorityIcon[current.priority];
  const message = current.message;

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await supabase.from("marquee_announcements" as any).delete().eq("id", id);
  };

  const handleDismiss = (id: string) => {
    setDismissed((d) => {
      const next = new Set(d).add(id);
      try {
        localStorage.setItem("marquee_dismissed_ids", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const labelMap = { info: "Info", warning: "Warning", critical: "Critical" } as const;

  return (
    <div
      key={current.id}
      className={`${priorityStyles[current.priority]} relative flex items-center overflow-hidden border-b border-black/10 print:hidden transition-colors duration-500 animate-fade-in`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0 font-bold text-sm border-r border-white/20 bg-black/15">
        <Icon className="h-4 w-4 animate-pulse" />
        <span className="hidden sm:inline uppercase tracking-wide">{labelMap[current.priority]}</span>
        {sorted.length > 1 && (
          <span className="ml-1 text-[10px] opacity-90 bg-black/20 rounded-full px-1.5 py-0.5">
            {(activeIndex % sorted.length) + 1}/{sorted.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden py-2">
        <div key={current.id} className="marquee-track whitespace-nowrap text-sm font-semibold tracking-wide">
          <span className="inline-block px-8 drop-shadow-sm">{message}</span>
          <span className="inline-block px-8 drop-shadow-sm">{message}</span>
        </div>
      </div>
      {sorted.length > 1 && (
        <div className="hidden md:flex items-center gap-1 px-2">
          {sorted.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                i === activeIndex % sorted.length ? "bg-white w-4" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 px-2 flex-shrink-0">
        {isAdmin && (
          <button
            onClick={() => handleDelete(current.id)}
            className="text-xs underline opacity-90 hover:opacity-100 px-2"
            title="Remove announcement (admin)"
          >
            Remove
          </button>
        )}
        <button
          onClick={() => handleDismiss(current.id)}
          className="p-1 rounded hover:bg-black/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default MarqueeBanner;