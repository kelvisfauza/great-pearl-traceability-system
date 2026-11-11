import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SignedAvatarImage } from '@/components/ui/signed-avatar-image';

export interface DisplayStaff {
  id: string;
  name: string;
  department: string;
  position: string;
  avatar_url: string | null;
}

export const useDisplayStaff = (enabled: boolean) => {
  const [staff, setStaff] = useState<DisplayStaff[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let fetching = false;
    const fetchStaff = async () => {
      if (fetching) return;
      fetching = true;
      try {
        // Public-safe fields only (name, role, department, display photo).
        const result = await (supabase as any).rpc('display_public_staff');
        if (result.error) throw result.error;
        if (active) { setStaff(result.data ?? []); setFailed(false); }
      } catch (error) {
        console.error('Unable to load display staff', error);
        if (active) setFailed(true);
      } finally { fetching = false; if (active) setLoading(false); }
    };
    void fetchStaff();
    const timer = window.setInterval(fetchStaff, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [enabled]);
  return { staff, loading, failed };
};

export const StaffShowcaseSlide = ({ staff, page, pages, loading, failed }: {
  staff: DisplayStaff[]; page: number; pages: number; loading: boolean; failed: boolean;
}) => <section className="h-full px-16 py-10 flex flex-col gap-8">
  <div className="flex items-center justify-between gap-8">
    <div><p className="text-2xl text-primary">THE PEOPLE BEHIND GREAT AGRO COFFEE</p><h2 className="text-7xl mt-3">Meet our team.</h2></div>
    <p className="text-2xl text-muted-foreground tabular-nums">{String(page + 1).padStart(2, '0')} / {String(pages).padStart(2, '0')}</p>
  </div>
  {staff.length ? <div className="grid grid-cols-4 gap-8 flex-1 min-h-0 items-center">
    {staff.map(person => <article key={person.id} className="min-w-0">
      <Avatar className="w-full h-auto aspect-[4/5] rounded-md bg-muted border border-border">
        <SignedAvatarImage src={person.avatar_url} alt={person.name} className="object-cover object-top" />
        <AvatarFallback className="rounded-md text-7xl bg-muted text-primary">{person.name.split(/\s+/).map(word => word.charAt(0)).slice(0, 2).join('')}</AvatarFallback>
      </Avatar>
      <h3 className="mt-5 text-3xl leading-tight break-words">{person.name}</h3>
      <p className="mt-3 text-xl text-primary break-words">{person.position}</p>
      <p className="mt-1 text-lg text-muted-foreground break-words">{person.department}</p>
    </article>)}
  </div> : <div className="flex-1 flex flex-col justify-center gap-6"><Users className="h-20 w-20 text-primary" /><p className="text-4xl text-muted-foreground">{loading ? 'Loading our team…' : failed ? 'Staff photos could not be loaded.' : 'Our team showcase is available on the signed-in display.'}</p></div>}
  <p className="text-2xl text-muted-foreground border-t border-border pt-5">Every delivery moves forward through the care of our people.</p>
</section>;