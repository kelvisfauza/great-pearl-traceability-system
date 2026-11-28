import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History } from 'lucide-react';

export default function MealPlanTrail({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false);
  const { data: events = [], error, isLoading } = useQuery({
    queryKey: ['meal-plan-trail', submissionId], enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('meal_plan_events').select('*')
        .eq('submission_id', submissionId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    }, refetchInterval: open ? 10000 : false,
  });
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}><History className="h-4 w-4 mr-2" />Decision trail</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Meal-plan decision trail</DialogTitle></DialogHeader>
        {error ? <p role="alert" className="text-destructive">Could not load the decision trail.</p> : isLoading ? <p>Loading…</p> : !events.length ? <p className="text-muted-foreground">No decisions recorded yet.</p> :
          <ol className="space-y-4">{events.map((event: any) => <li key={event.id} className="border-l-2 border-primary pl-3 space-y-1">
            <p className="font-medium capitalize">{event.event_type.replaceAll('_', ' ')}</p>
            <p className="text-xs text-muted-foreground">{event.actor} · {new Date(event.created_at).toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}</p>
            {event.reason && <p className="text-sm whitespace-pre-wrap break-words">{event.reason}</p>}
            {event.before_data?.amount != null && event.after_data?.amount != null && Number(event.before_data.amount) !== Number(event.after_data.amount) &&
              <p className="text-sm">Amount: UGX {Number(event.before_data.amount).toLocaleString()} → UGX {Number(event.after_data.amount).toLocaleString()}</p>}
            {event.after_data?.description && <p className="text-sm whitespace-pre-wrap break-words">{event.after_data.description}</p>}
            {event.after_data?.status && <p className="text-xs">Status: {event.after_data.status.replaceAll('_', ' ')}</p>}
          </li>)}</ol>}
      </DialogContent>
    </Dialog>
  </>;
}