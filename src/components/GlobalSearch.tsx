import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, X, ArrowRight, Plus, Zap, Loader2, Command, Send, RotateCcw,
  FileText, User, Package, DollarSign, ClipboardCheck, TrendingUp,
  Clock, ShieldAlert, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAIChat, AITask, AIRecord } from "@/hooks/useAICommand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    case "receipt": return <FileText className={cls} />;
    case "quality": return <ClipboardCheck className={cls} />;
    case "eudr": return <FileText className={cls} />;
    case "sale": return <TrendingUp className={cls} />;
    case "overtime": return <Clock className={cls} />;
    default: return <FileText className={cls} />;
  }
}

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingTask, setPendingTask] = useState<AITask | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const { messages, loading, send, reset } = useAIChat();

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
    if (scrollBottomRef.current) scrollBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  const go = (url: string) => {
    if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer");
    else navigate(url);
    setIsOpen(false);
  };
  const confirmTask = () => {
    if (!pendingTask) return;
    const url = pendingTask.url;
    setPendingTask(null);
    go(url);
  };

  const submit = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    send(text);
  };

  const suggestions = [
    "What's the available stock for arabica now?",
    "Who withdrew money today?",
    "Summarize this month's sales",
    "Show pending approvals",
  ];

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
            className="fixed left-1/2 top-4 z-50 w-full max-w-5xl -translate-x-1/2 px-3"
          >
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl
                            shadow-primary/20 ring-1 ring-primary/10 flex flex-col h-[92vh]">
              {/* Header */}
              <div className="relative border-b border-border">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-fuchsia-500/10" />
                <div className="relative flex items-center gap-3 p-4">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                                  bg-gradient-to-br from-primary to-fuchsia-500">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Ask AI</p>
                    <p className="text-[11px] text-muted-foreground">
                      Conversational assistant · aware of your data & permissions
                    </p>
                  </div>
                  {messages.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={reset} title="New chat">
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> New
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="p-6 text-center space-y-3">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full
                                      bg-gradient-to-br from-primary/20 to-fuchsia-500/20">
                        <Sparkles className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">How can I help you today?</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ask about your data, run reports, find records, or start a new action.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-left">
                        {suggestions.map((t) => (
                          <button
                            key={t}
                            onClick={() => send(t)}
                            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs
                                       hover:bg-muted transition-colors text-left"
                          >
                            <Zap className="inline h-3 w-3 mr-1 text-primary" />{t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        m.role === "user"
                          ? "bg-muted"
                          : "bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground",
                      )}>
                        {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      </div>
                      <div className={cn("min-w-0 flex-1 space-y-2", m.role === "user" && "flex justify-end")}>
                        <div className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground max-w-[85%]"
                            : "bg-muted/50 border border-border/60 w-full",
                        )}>
                          {m.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:mt-2 prose-headings:mb-1 prose-table:my-2 prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border prose-th:border prose-td:border prose-table:border-border prose-th:border-border prose-td:border-border overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          )}
                        </div>
                        {m.role === "assistant" && m.suggestions && (
                          <div className="space-y-2 w-full">
                            {m.suggestions.records.length > 0 && (
                              <Section title="Matching records">
                                {m.suggestions.records.map((r: AIRecord) => (
                                  <button
                                    key={`${r.type}-${r.id}`}
                                    onClick={() => go(r.url)}
                                    className="flex w-full items-start gap-3 rounded-lg border border-border/40
                                               p-2.5 text-left hover:bg-accent transition-colors"
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
                            {m.suggestions.creates.length > 0 && (
                              <Section title="Create" icon={<Plus className="h-3.5 w-3.5 text-emerald-500" />}>
                                {m.suggestions.creates.map((t) => (
                                  <TaskCard key={t.capability_id} task={t} onPick={setPendingTask} tone="create" />
                                ))}
                              </Section>
                            )}
                            {m.suggestions.actions.length > 0 && (
                              <Section title="Actions" icon={<ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}>
                                {m.suggestions.actions.map((t) => (
                                  <TaskCard key={t.capability_id} task={t} onPick={setPendingTask} tone="action" />
                                ))}
                              </Section>
                            )}
                            {m.suggestions.navigations.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {m.suggestions.navigations.map((n) => (
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
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                      </div>
                      <div className="rounded-2xl px-4 py-2.5 text-sm bg-muted/50 border border-border/60 text-muted-foreground">
                        Thinking…
                      </div>
                    </div>
                  )}
                  <div ref={scrollBottomRef} />
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2 rounded-2xl border border-border bg-background focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition p-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    rows={1}
                    placeholder="Message AI… (Shift+Enter for a new line)"
                    className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none max-h-40"
                  />
                  <Button
                    size="icon"
                    onClick={submit}
                    disabled={!input.trim() || loading}
                    className="h-9 w-9 shrink-0 rounded-xl"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

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