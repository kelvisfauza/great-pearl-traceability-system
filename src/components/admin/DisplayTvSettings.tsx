import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { DEFAULT_DISPLAY_SETTINGS, scaledDuration, type DisplayTvSettings as S } from '@/hooks/useDisplayTvSettings';

const SLIDE_GROUPS = [
  { id: 'brand', label: 'Company opening & closing' }, { id: 'price-table', label: "Today's price table" },
  { id: 'journey-overview', label: 'Farm to cup overview' }, { id: 'staff', label: 'Meet our team' },
  { id: 'suppliers', label: 'Top suppliers' }, { id: 'journey', label: 'Coffee journey chapters' },
];

export default function DisplayTvSettings() {
  const { toast } = useToast();
  const [s, setS] = useState<S>(DEFAULT_DISPLAY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [word, setWord] = useState('');

  useEffect(() => { (async () => {
    const { data, error } = await (supabase as any).from('display_tv_settings').select('*').eq('id', 1).maybeSingle();
    if (error) toast({ title: 'Could not load display settings', description: error.message, variant: 'destructive' });
    if (data) setS({ speed: Number(data.speed), ticker_items: data.ticker_items ?? [], custom_slides: data.custom_slides ?? [], hidden_slides: data.hidden_slides ?? [] });
    setLoading(false);
  })(); }, [toast]);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).from('display_tv_settings').update({ ...s, custom_slides: s.custom_slides.filter(c => c.title.trim()), updated_at: new Date().toISOString(), updated_by: user?.email }).eq('id', 1).select('id');
    setSaving(false);
    if (error || !data?.length) toast({ title: 'Not saved', description: error?.message ?? 'Only administrators can change display settings.', variant: 'destructive' });
    else toast({ title: 'Display settings saved', description: 'The TV picks them up within a minute.' });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const toggleHidden = (id: string) => setS(p => ({ ...p, hidden_slides: p.hidden_slides.includes(id) ? p.hidden_slides.filter(x => x !== id) : [...p.hidden_slides, id] }));

  return <div className="space-y-8">
    <section className="space-y-3">
      <h3 className="font-semibold">Slide speed: {s.speed.toFixed(1)}×</h3>
      <Slider min={0.5} max={4} step={0.1} value={[s.speed]} onValueChange={([v]) => setS(p => ({ ...p, speed: v }))} />
      <p className="text-sm text-muted-foreground">A 16-second slide now shows for {Math.round(scaledDuration(16000, s.speed) / 1000)} seconds. Higher is faster.</p>
    </section>

    <section className="space-y-3">
      <h3 className="font-semibold">Slides to show</h3>
      {SLIDE_GROUPS.map(g => <label key={g.id} className="flex items-center gap-3 text-sm"><Checkbox checked={!s.hidden_slides.includes(g.id)} onCheckedChange={() => toggleHidden(g.id)} />{g.label}</label>)}
    </section>

    <section className="space-y-3">
      <h3 className="font-semibold">Announcement slides</h3>
      {s.custom_slides.map((c, i) => <div key={i} className="space-y-2 rounded-md border p-3">
        <div className="flex gap-2"><Input placeholder="Heading" value={c.title} onChange={e => setS(p => ({ ...p, custom_slides: p.custom_slides.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))} />
          <Button variant="ghost" size="icon" onClick={() => setS(p => ({ ...p, custom_slides: p.custom_slides.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button></div>
        <Textarea placeholder="Message" value={c.body} onChange={e => setS(p => ({ ...p, custom_slides: p.custom_slides.map((x, j) => j === i ? { ...x, body: e.target.value } : x) }))} />
      </div>)}
      <Button variant="outline" size="sm" onClick={() => setS(p => ({ ...p, custom_slides: [...p.custom_slides, { title: '', body: '' }] }))}><Plus className="h-4 w-4 mr-1" />Add slide</Button>
    </section>

    <section className="space-y-3">
      <h3 className="font-semibold">Scrolling words at the bottom</h3>
      <div className="flex gap-2"><Input placeholder="e.g. We buy coffee every day from 8 AM" value={word} onChange={e => setWord(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && word.trim()) { setS(p => ({ ...p, ticker_items: [...p.ticker_items, word.trim()] })); setWord(''); } }} />
        <Button variant="outline" onClick={() => { if (word.trim()) { setS(p => ({ ...p, ticker_items: [...p.ticker_items, word.trim()] })); setWord(''); } }}>Add</Button></div>
      {s.ticker_items.map((t, i) => <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">{t}
        <Button variant="ghost" size="icon" onClick={() => setS(p => ({ ...p, ticker_items: p.ticker_items.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button></div>)}
    </section>

    <div className="flex gap-3"><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save display settings</Button>
      <Button variant="outline" asChild><a href="/display" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Open display</a></Button></div>
  </div>;
}
