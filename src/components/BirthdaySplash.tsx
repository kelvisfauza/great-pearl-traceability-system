import { useCallback, useEffect, useState } from 'react';
import { Cake, PartyPopper, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface BirthdayWish {
  wish_id: string;
  sender_name: string;
  created_at: string;
}

const BirthdaySplash = () => {
  const { employee } = useAuth();
  const [wishes, setWishes] = useState<BirthdayWish[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const loadWishes = useCallback(async () => {
    if (!employee?.id) return;
    const { data, error } = await supabase.rpc('get_my_unseen_birthday_wishes');
    if (error) {
      console.error('Unable to load birthday wishes:', error);
      return;
    }
    if (data?.length) {
      setWishes(data);
      setIsOpen(true);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    void loadWishes();

    const channel = supabase
      .channel(`birthday-wishes-${employee.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'birthday_wishes', filter: `recipient_employee_id=eq.${employee.id}` },
        () => void loadWishes()
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [employee?.id, loadWishes]);

  const dismiss = async () => {
    setDismissing(true);
    const { error } = await supabase.rpc('mark_my_birthday_wishes_seen', {
      p_wish_ids: wishes.map((wish) => wish.wish_id),
    });
    if (error) {
      console.error('Unable to mark birthday wishes as seen:', error);
      setDismissing(false);
      return;
    }
    setWishes([]);
    setIsOpen(false);
    setDismissing(false);
  };

  if (!wishes.length) return null;

  const names = wishes.map((wish) => wish.sender_name);
  const senderText = names.length === 1
    ? names[0]
    : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

  return (
    <Dialog open={isOpen} onOpenChange={() => undefined}>
      <DialogContent hideCloseButton className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-background to-pink-50 text-center sm:max-w-lg">
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
          <Sparkles className="absolute left-8 top-8 h-8 w-8 text-amber-500" />
          <PartyPopper className="absolute right-8 top-12 h-9 w-9 rotate-12 text-pink-500" />
          <Sparkles className="absolute bottom-14 right-12 h-6 w-6 text-primary" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4 py-5">
          <div className="rounded-full bg-amber-100 p-5 shadow-sm">
            <Cake className="h-14 w-14 text-amber-600" />
          </div>
          <DialogTitle className="text-3xl font-bold tracking-tight">Happy Birthday, {employee?.name?.split(' ')[0]}!</DialogTitle>
          <DialogDescription className="max-w-md text-base leading-relaxed text-foreground/80">
            <strong className="text-foreground">{senderText}</strong> {wishes.length === 1 ? 'has' : 'have'} wished you a happy birthday.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">Your colleagues are celebrating you today. Have a wonderful year ahead!</p>
          <Button onClick={dismiss} disabled={dismissing} size="lg" className="mt-2 gap-2">
            <PartyPopper className="h-4 w-4" />
            {dismissing ? 'Opening…' : 'Thank you!'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdaySplash;