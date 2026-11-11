import { Component, Suspense, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowUpRight, ChevronRight, Loader2, Search, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { settingsCategories, settingsTools } from "@/components/admin/settingsCatalog";

class SettingsToolBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="py-10 space-y-4"><p className="text-destructive">This control could not be opened. If reloading does not help, report it for investigation.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => window.location.reload()}>Reload settings</Button><Button asChild><Link to="/admin/system-settings?tool=problem-resolution">Report problem</Link></Button></div></div>;
    return this.props.children;
  }
}

const SystemSettings = () => {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [advanced, setAdvanced] = useState(false);
  const selected = settingsTools.find(tool => tool.id === params.get("tool"));
  const SelectedControl = selected?.component;
  const query = search.trim().toLowerCase();
  const visible = settingsTools.filter(tool =>
    (!tool.advanced || advanced) && (category === "all" || tool.category === category) &&
    (!query || `${tool.title} ${tool.keywords} ${settingsCategories.find(c => c.id === tool.category)?.label}`.toLowerCase().includes(query)));
  const openTool = (id: string) => setParams({ tool: id });

  return (
    <Layout title="System Settings" subtitle="Administration & business controls">
      {selected ? (
        <div className="space-y-6 min-w-0">
          <div className="flex flex-wrap items-center gap-3 border-b pb-4">
            <Button variant="outline" size="sm" onClick={() => setParams({})} className="gap-2"><ArrowLeft className="h-4 w-4" />All settings</Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold break-words">{selected.title}</h2>
          </div>
          <SettingsToolBoundary key={selected.id}>
            <Suspense fallback={<div role="status" className="flex items-center justify-center gap-3 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Opening {selected.title}…</div>}>
              {SelectedControl ? <SelectedControl /> : selected.path ? <Button asChild><Link to={selected.path}>Open {selected.title}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button> : null}
            </Suspense>
          </SettingsToolBoundary>
        </div>
      ) : (
        <div className="space-y-7 min-w-0">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="bg-primary/10 text-primary p-3 rounded-lg shrink-0"><Settings2 className="h-8 w-8" /></div>
              <div><h2 className="text-2xl font-semibold">Control centre</h2><p className="text-sm text-muted-foreground mt-1">Great Agro Coffee</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Administrator access</span><Button variant="outline" onClick={() => openTool('problem-resolution')}>Problems & recovery</Button></div>
          </header>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search settings" placeholder="Search settings…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" /></div>
            <Button variant={advanced ? "secondary" : "outline"} aria-pressed={advanced} onClick={() => setAdvanced(v => !v)} className="gap-2 h-10"><SlidersHorizontal className="h-4 w-4" />Advanced tools</Button>
          </div>

          <nav aria-label="Settings categories" className="flex gap-2 overflow-x-auto pb-2">
            <Button variant={category === "all" ? "default" : "outline"} size="sm" onClick={() => setCategory("all")} aria-pressed={category === "all"} className="shrink-0">All settings</Button>
            {settingsCategories.map(c => <Button key={c.id} variant={category === c.id ? "default" : "outline"} size="sm" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className="gap-2 shrink-0"><c.icon className="h-4 w-4" />{c.label}</Button>)}
          </nav>

          {visible.length === 0 && <div className="py-12 text-center space-y-3"><p className="text-muted-foreground">No matching settings.</p><Button variant="outline" onClick={() => { setSearch(""); setCategory("all"); }}>Clear filters</Button></div>}
          {settingsCategories.map(c => {
            const tools = visible.filter(tool => tool.category === c.id);
            if (!tools.length) return null;
            return <section key={c.id} aria-labelledby={`heading-${c.id}`} className="space-y-3">
              <div className="flex items-center gap-2"><c.icon className="h-5 w-5 text-primary" /><h3 id={`heading-${c.id}`} className="text-lg font-semibold">{c.label}</h3><Badge variant="secondary">{tools.length}</Badge></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {tools.map(tool => {
                  const contents = <><span className="rounded-md bg-muted p-2 shrink-0 text-primary"><tool.icon className="h-5 w-5" /></span><span className="flex-1 min-w-0 whitespace-normal break-words text-sm font-medium text-left">{tool.title}{tool.advanced && <span className="block text-xs text-muted-foreground font-normal mt-1">Advanced</span>}</span>{tool.path ? <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}</>;
                  return tool.path ? <Button key={tool.id} asChild variant="outline" className="h-auto min-h-20 justify-start gap-3 p-4 rounded-lg"><Link to={tool.path}>{contents}</Link></Button> : <Button key={tool.id} variant="outline" className="h-auto min-h-20 justify-start gap-3 p-4 rounded-lg" onClick={() => openTool(tool.id)}>{contents}</Button>;
                })}
              </div>
            </section>;
          })}
        </div>
      )}
    </Layout>
  );
};

export default SystemSettings;
