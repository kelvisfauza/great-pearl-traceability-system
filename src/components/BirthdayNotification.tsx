import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignedAvatarImage } from '@/components/ui/signed-avatar-image';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cake, Check, Loader2, PartyPopper, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BirthdayPerson {
  employee_id: string;
  name: string;
  avatar_url: string | null;
  department: string;
  employee_position: string;
  already_wished: boolean;
}

const BirthdayNotification = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [birthdayPeople, setBirthdayPeople] = useState<BirthdayPerson[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!employee) return;

    const checkBirthdays = async () => {
      const today = new Date();
      const sessionKey = `birthday_shown_${today.toISOString().split('T')[0]}`;

      if (sessionStorage.getItem(sessionKey)) return;

      const { data, error } = await supabase.rpc('get_today_birthday_colleagues');
      if (error) {
        console.error('Unable to load birthday colleagues:', error);
        return;
      }

      if (data?.length) {
        setBirthdayPeople(data);
        setIsOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    };

    const timer = setTimeout(checkBirthdays, 2000);
    return () => clearTimeout(timer);
  }, [employee]);

  const sendWish = async (person: BirthdayPerson) => {
    setSendingId(person.employee_id);
    setFailedIds((current) => {
      const next = new Set(current);
      next.delete(person.employee_id);
      return next;
    });

    const { data, error } = await supabase.rpc('send_birthday_wish', {
      p_recipient_employee_id: person.employee_id,
    });
    const result = data as { ok?: boolean; error?: string } | null;

    if (error || !result?.ok) {
      setFailedIds((current) => new Set(current).add(person.employee_id));
      toast({
        variant: 'destructive',
        title: 'Wish not sent',
        description: result?.error || error?.message || 'Please try again.',
      });
    } else {
      setBirthdayPeople((current) => current.map((item) =>
        item.employee_id === person.employee_id ? { ...item, already_wished: true } : item
      ));
      toast({ title: 'Birthday wish sent', description: `${person.name} will see your greeting.` });
    }
    setSendingId(null);
  };

  if (!isOpen || birthdayPeople.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Cake className="h-6 w-6 text-primary" />
            <span>🎂 Birthday Celebration! 🎂</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {birthdayPeople.map((person) => (
            <div key={person.employee_id} className="flex flex-col gap-3 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:flex-row sm:items-center">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <SignedAvatarImage src={person.avatar_url || undefined} />
                <AvatarFallback className="text-lg bg-primary/10">
                  {person.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{person.name}</h3>
                <p className="text-sm text-muted-foreground">{person.employee_position} • {person.department}</p>
                <p className="text-sm mt-1 text-primary font-medium">
                  🎉 Today is their birthday! Wish them well!
                </p>
              </div>
              <Button
                onClick={() => sendWish(person)}
                disabled={person.already_wished || sendingId === person.employee_id}
                variant={person.already_wished ? 'secondary' : failedIds.has(person.employee_id) ? 'destructive' : 'default'}
                className="shrink-0 gap-2"
              >
                {sendingId === person.employee_id ? <Loader2 className="h-4 w-4 animate-spin" />
                  : person.already_wished ? <Check className="h-4 w-4" />
                  : failedIds.has(person.employee_id) ? <RefreshCw className="h-4 w-4" />
                  : <PartyPopper className="h-4 w-4" />}
                {person.already_wished ? 'Wish sent' : failedIds.has(person.employee_id) ? 'Retry' : 'Send wishes'}
              </Button>
            </div>
          ))}
          <p className="text-center text-sm text-muted-foreground">
            Send a warm birthday message to your colleague{birthdayPeople.length > 1 ? 's' : ''}! 🎈
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => setIsOpen(false)} variant="outline">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayNotification;
