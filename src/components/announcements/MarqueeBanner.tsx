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
  info: "bg-blue-600 text-white",
  warning: "bg-amber-500 text-black",
  critical: "bg-red-600 text-white",
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

  // Show highest priority first
  const order = { critical: 0, warning: 1, info: 2 } as const;
  const sorted = [...visible].sort((a, b) => order[a.priority] - order[b.priority]);
  const current = sorted[0];
  const Icon = priorityIcon[current.priority];

  // Combine all messages of the current priority into one scrolling string
  const samePriority = sorted.filter((s) => s.priority === current.priority);
  const combined = samePriority.map((s) => s.message).join("    •    ");

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

  return (
    <div className={`${priorityStyles[current.priority]} relative flex items-center overflow-hidden border-b border-black/10 print:hidden`}>
      <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0 font-semibold text-sm border-r border-white/20">
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">Announcement</span>
      </div>
      <div className="flex-1 overflow-hidden py-2">
        <div className="marquee-track whitespace-nowrap text-sm font-medium">
          <span className="inline-block px-8">{combined}</span>
          <span className="inline-block px-8">{combined}</span>
        </div>
      </div>
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