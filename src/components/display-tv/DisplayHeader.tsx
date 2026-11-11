import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, RefreshCw, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '@/assets/display-tv-logo.png';
interface Props { title: string; slideLabel: string; slideIndex: number; slideCount: number; onRefresh: () => void; onToggleFullscreen: () => void; isFullscreen: boolean; paused: boolean; onPause: () => void; onPrevious: () => void; onNext: () => void }
const DisplayHeader = (props: Props) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const actions = [{ label:'Previous slide', icon:ChevronLeft, action:props.onPrevious },{ label:props.paused ? 'Play presentation' : 'Pause presentation', icon:props.paused ? Play : Pause, action:props.onPause },{ label:'Next slide', icon:ChevronRight, action:props.onNext },{ label:'Refresh coffee display', icon:RefreshCw, action:props.onRefresh },{ label:props.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen',icon:props.isFullscreen ? Minimize : Maximize,action:props.onToggleFullscreen }];
  return <header className="tv-broadcast-header flex items-center justify-between px-12 py-5 shrink-0">
    <div className="flex items-center gap-5"><img src={logo} width={80} height={80} alt="Great Agro Coffee logo" className="h-20 w-20 object-contain" /><div><h1 className="text-4xl text-foreground">{props.title}</h1><p className="mt-1 text-base text-muted-foreground">A member of YEDA COFFEE COMPANY LIMITED · Kasese, Uganda</p></div></div>
    <div className="flex items-center gap-7"><div className="text-right"><p className="text-3xl tabular-nums text-foreground">{now.toLocaleTimeString('en-GB',{timeZone:'Africa/Kampala'})}</p><p className="text-base text-muted-foreground">{now.toLocaleDateString('en-GB',{timeZone:'Africa/Kampala',day:'numeric',month:'long',year:'numeric'})} · EAT</p></div><div className="flex gap-2 border-l border-border pl-6">{actions.map(({label,icon:Icon,action}) => <Button key={label} size="icon" variant="ghost" aria-label={label} title={label} onClick={action} className="h-12 w-12 rounded-md"><Icon className="h-5 w-5" /></Button>)}</div></div>
  </header>;
};
export default DisplayHeader;
