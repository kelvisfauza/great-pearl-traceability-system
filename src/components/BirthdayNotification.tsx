import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cake, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BirthdayPerson {
  name: string;
  avatar_url: string | null;
  department: string;
  position: string;
  email: string;
}

const BirthdayNotification = () => {
  const { employee } = useAuth();
  const [birthdayPeople, setBirthdayPeople] = useState<BirthdayPerson[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!employee) return;

    const checkBirthdays = async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const sessionKey = `birthday_shown_${today.toISOString().split('T')[0]}`;

      if (sessionStorage.getItem(sessionKey)) return;

      // Find employees whose birthday is today (excluding current user)
      const { data } = await supabase
        .from('employees')
        .select('name, avatar_url, department, position, email, date_of_birth')
        .neq('email', employee.email) as { data: any[] | null };

      if (!data) return;

      const todayBirthdays = data.filter((emp: any) => {
        if (!emp.date_of_birth) return false;
        const dob = new Date(emp.date_of_birth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
      });

      if (todayBirthdays.length > 0) {
        setBirthdayPeople(todayBirthdays.map((p: any) => ({
          name: p.name,
          avatar_url: p.avatar_url,
          department: p.department,
          position: p.position,
          email: p.email
        })));
        setIsOpen(true);
        sessionStorage.setItem(sessionKey, 'true');

        // Confetti!
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    };

    const timer = setTimeout(checkBirthdays, 2000);
    return () => clearTimeout(timer);
  }, [employee]);

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
          {birthdayPeople.map((person, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <AvatarImage src={person.avatar_url || undefined} />
                <AvatarFallback className="text-lg bg-primary/10">
                  {person.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{person.name}</h3>
                <p className="text-sm text-muted-foreground">{person.position} • {person.department}</p>
                <p className="text-sm mt-1 text-primary font-medium">
                  🎉 Today is their birthday! Wish them well!
                </p>
              </div>
            </div>
          ))}
          <p className="text-center text-sm text-muted-foreground">
            Send a warm birthday message to your colleague{birthdayPeople.length > 1 ? 's' : ''}! 🎈
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => setIsOpen(false)} className="gap-2">
            <PartyPopper className="h-4 w-4" />
            Happy Birthday! 🎂
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayNotification;
