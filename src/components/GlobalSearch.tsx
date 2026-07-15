import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Search, X, ArrowRight, Plus, Zap, Loader2, Command,
  FileText, User, Package, DollarSign, ClipboardCheck, TrendingUp,
  Clock, ShieldAlert, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAICommand, AITask, AIRecord } from "@/hooks/useAICommand";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function recordIcon(type: string) {
  const cls = "h-4 w-4";
  switch (type) {
    case "supplier": return <User className={cls} />;
    case "employee": return <User className={cls} />;
    case "batch": case "inventory": return <Package className={cls} />;
    case "payment": case "expense": case "transaction": return <DollarSign className={cls} />;
    case "quality": return <ClipboardCheck className={cls} />;
    case "eudr": return <FileText className={cls} />;
    case "sale": return <TrendingUp className={cls} />;
    case "overtime": return <Clock className={cls} />;
    default: return <FileText className={cls} />;
  }
}

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingTask, setPendingTask] = useState<AITask | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useAICommand(query);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 30);
  }, [isOpen]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pendingTask) return;
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [isOpen, pendingTask]);

  const go = (url: string) => { navigate(url); setIsOpen(false); setQuery(""); };
  const confirmTask = () => {
    if (!pendingTask) return;
    const url = pendingTask.url;
    setPendingTask(null);
    go(url);
  };

  const nothing =
    !loading && !data.answer && data.records.length === 0 &&
    data.creates.length === 0 && data.actions.length === 0 && data.navigations.length === 0;

  return (
    <>
      {/* Trigger button — animated AI orb */}
      <button
        onClick={() => setIsOpen(true)}
        className="group relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm
                   bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-primary/10
                   border border-primary/20 hover:border-primary/40 transition-all
                   hover:shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
        aria-label="Open AI Command"
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
          <Sparkles className="relative h-4 w-4 text-primary" />
        </span>
        <span className="hidden sm:inline font-medium bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
          Ask AI
        </span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-md" />
          <div
            ref={modalRef}
            className="fixed left-1/2 top-16 z-50 w-full max-w-2xl -translate-x-1/2 px-3"
          >
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl
                            shadow-primary/20 ring-1 ring-primary/10">
              {/* Header */}
              <div className="relative border-b border-border">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-fuchsia-500/10" />
                <div className="relative flex items-center gap-3 p-4">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                                  bg-gradient-to-br from-primary to-fuchsia-500">
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                      : <Sparkles className="h-4 w-4 text-primary-foreground" />}
                  </div>
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask, search, or command — e.g. 'create receipt for Denis 50,000', 'freeze wallet for Godwin', 'find batch 20260714002'"
                    className="border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                  />
                  {query && (
                    <Button variant="ghost" size="icon" onClick={() => setQuery("")}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="max-h-[70vh]">
                <div className="p-3 space-y-3">
                  {/* Empty / welcome state */}
                  {!query && (
                    <div className="p-6 text-center space-y-3">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full
                                      bg-gradient-to-br from-primary/20 to-fuchsia-500/20">
                        <Sparkles className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">AI Command Center</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Find records, create things, or run admin actions — in your own words.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-left">
                        {[
                          "Show batch 20260714002",
                          "Create receipt for Benson 25,000",
                          "File EUDR complaint for batch 20260713006",
                          "Retry failed payout for Denis",
                        ].map((t) => (
                          <button
                            key={t}
                            onClick={() => setQuery(t)}
                            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs
                                       hover:bg-muted transition-colors text-left"
                          >
                            <Zap className="inline h-3 w-3 mr-1 text-primary" />{t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI answer */}
                  {query && data.answer && (
                    <div className="flex gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm leading-relaxed">{data.answer}</p>
                    </div>
                  )}

                  {/* Records */}
                  {data.records.length > 0 && (
                    <Section title="Matching records">
                      {data.records.map((r: AIRecord) => (
                        <button
                          key={`${r.type}-${r.id}`}
                          onClick={() => go(r.url)}
                          className="flex w-full items-start gap-3 rounded-lg border border-transparent
                                     p-3 text-left hover:bg-accent hover:border-border transition-colors"
                        >
                          <div className="mt-0.5 text-primary">{recordIcon(r.type)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-sm">{r.title}</span>
                              <Badge variant="secondary" className="shrink-0 text-[10px]">{r.type}</Badge>
                            </div>
                            {r.subtitle && (
                              <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                            )}
                          </div>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </Section>
                  )}

                  {/* Create tasks */}
                  {data.creates.length > 0 && (
                    <Section title="Create" icon={<Plus className="h-3.5 w-3.5 text-emerald-500" />}>
                      {data.creates.map((t) => (
                        <TaskCard key={t.capability_id} task={t} onPick={setPendingTask} tone="create" />
                      ))}
                    </Section>
                  )}

                  {/* Admin actions */}
                  {data.actions.length > 0 && (
                    <Section title="Actions" icon={<ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}>
                      {data.actions.map((t) => (
                        <TaskCard key={t.capability_id} task={t} onPick={setPendingTask} tone="action" />
                      ))}
                    </Section>
                  )}

                  {/* Navigation shortcuts */}
                  {data.navigations.length > 0 && (
                    <Section title="Jump to">
                      <div className="flex flex-wrap gap-2">
                        {data.navigations.map((n) => (
                          <button
                            key={n.url}
                            onClick={() => go(n.url)}
                            className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs
                                       hover:bg-muted transition-colors"
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}

                  {loading && !data.answer && (
                    <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Thinking…
                    </div>
                  )}

                  {nothing && query.length >= 2 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Try rephrasing — e.g. "batch 20260714", "add supplier", "approve request".
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                <span>Powered by AI · results filtered by your permissions</span>
                <span className="inline-flex items-center gap-1"><kbd className="rounded border px-1">Esc</kbd> close</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Preview + confirm */}
      <AlertDialog open={!!pendingTask} onOpenChange={(o) => !o && setPendingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingTask?.kind === "action"
                ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                : <Plus className="h-4 w-4 text-emerald-500" />}
              {pendingTask?.label}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">{pendingTask?.summary}</span>
              {pendingTask?.params && Object.keys(pendingTask.params).length > 0 && (
                <span className="block rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <span className="mb-1 block font-semibold text-foreground">Prefilled fields</span>
                  {Object.entries(pendingTask.params).map(([k, v]) => (
                    <span key={k} className="grid grid-cols-[110px_1fr] gap-2 py-0.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-foreground">{v}</span>
                    </span>
                  ))}
                </span>
              )}
              <span className="block text-xs text-muted-foreground">
                You'll be taken to the relevant page with these details pre-filled. Nothing is submitted until you click the final button on that page.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTask}>
              {pendingTask?.kind === "action" ? "Open action" : "Open form"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}{title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TaskCard({ task, onPick, tone }: { task: AITask; onPick: (t: AITask) => void; tone: "create" | "action" }) {
  const isAction = tone === "action";
  return (
    <button
      onClick={() => onPick(task)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        isAction
          ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
          : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10",
      )}
    >
      <div className={cn("mt-0.5", isAction ? "text-amber-500" : "text-emerald-500")}>
        {isAction ? <ShieldAlert className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{task.label}</span>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {isAction ? "Needs confirm" : "Preview"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{task.summary}</p>
        {task.params && Object.keys(task.params).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(task.params).slice(0, 4).map(([k, v]) => (
              <span key={k} className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/60">
                <span className="opacity-70">{k}:</span> <span className="text-foreground">{v}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export default GlobalSearch;