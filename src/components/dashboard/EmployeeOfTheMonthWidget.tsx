import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const EmployeeOfTheMonthWidget = () => {
  const { data: winners = [], isLoading } = useQuery({
    queryKey: ['employee-of-the-month'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_of_the_month')
        .select('*')
        .eq('is_active', true)
        .order('rank', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || winners.length === 0) return null;

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const firstWinner = winners[0];
  const monthLabel = `${monthNames[firstWinner?.month] || ''} ${firstWinner?.year || ''}`;

  const rankIcons = [
    <Crown className="h-5 w-5 text-amber-500" />,
    <Star className="h-4 w-4 text-slate-400" />,
    <Star className="h-4 w-4 text-amber-700" />,
  ];

  const rankColors = [
    'from-amber-500/20 via-yellow-400/10 to-amber-600/20 border-amber-400/40',
    'from-slate-300/20 via-gray-200/10 to-slate-400/20 border-slate-300/40',
    'from-amber-700/15 via-orange-300/10 to-amber-800/15 border-amber-600/30',
  ];

  const rankBadgeColors = [
    'bg-amber-500 text-white',
    'bg-slate-400 text-white',
    'bg-amber-700 text-white',
  ];

  return (
    <Card className="border-border/30 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
      <CardHeader className="pb-3 border-b border-border/20 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Employee of the Month</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">{monthLabel}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] border-amber-400/30 text-amber-600 bg-amber-50">
            <Trophy className="h-2.5 w-2.5 mr-0.5" />Recognition
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {winners.map((winner: any, idx: number) => (
            <div
              key={winner.id}
              className={`relative rounded-xl border bg-gradient-to-br ${rankColors[idx] || rankColors[2]} p-4 transition-all hover:scale-[1.02] ${idx === 0 ? 'sm:col-span-2' : ''}`}
            >
              {idx === 0 && (
                <div className="absolute -top-1 -right-1 animate-pulse">
                  <span className="text-2xl">🏆</span>
                </div>
              )}
              <div className={`flex ${idx === 0 ? 'flex-row items-center gap-5' : 'flex-col items-center text-center gap-3'}`}>
                <div className="relative">
                  <Avatar className={`${idx === 0 ? 'h-20 w-20' : 'h-14 w-14'} border-3 ${idx === 0 ? 'border-amber-400' : 'border-border'} shadow-lg`}>
                    <AvatarImage src={winner.employee_avatar_url} alt={winner.employee_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {winner.employee_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 ${idx === 0 ? 'h-7 w-7' : 'h-5 w-5'} rounded-full ${rankBadgeColors[idx]} flex items-center justify-center text-[10px] font-bold shadow-md`}>
                    #{winner.rank}
                  </div>
                </div>
                <div className={idx === 0 ? '' : 'w-full'}>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    {rankIcons[idx]}
                    <h3 className={`${idx === 0 ? 'text-base' : 'text-sm'} font-bold capitalize`}>
                      {winner.employee_name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {winner.department} • {winner.position || 'Staff'}
                  </p>
                  {winner.reason && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1 italic line-clamp-2">
                      "{winner.reason}"
                    </p>
                  )}
                  {winner.bonus_amount > 0 && (
                    <Badge className="mt-2 bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                      💰 UGX {Number(winner.bonus_amount).toLocaleString()} bonus
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeOfTheMonthWidget;
