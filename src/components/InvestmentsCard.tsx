import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import { format, differenceInDays } from 'date-fns';

export const InvestmentsCard = () => {
  const { activeInvestments, investments, totalInvested, totalExpectedReturn, withdrawEarly } = useInvestments();

  if (investments.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Investments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeInvestments.length > 0 && (
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="text-lg font-bold text-blue-700">UGX {totalInvested.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Expected Return</p>
              <p className="text-lg font-bold text-green-700">UGX {Math.round(totalExpectedReturn).toLocaleString()}</p>
            </div>
          </div>
        )}

        {investments.slice(0, 5).map(inv => {
          const daysLeft = Math.max(0, differenceInDays(new Date(inv.maturity_date), new Date()));
          const progress = Math.min(100, ((differenceInDays(new Date(), new Date(inv.start_date))) / (differenceInDays(new Date(inv.maturity_date), new Date(inv.start_date)))) * 100);

          return (
            <div key={inv.id} className="bg-white/70 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">UGX {Number(inv.amount).toLocaleString()}</span>
                <Badge variant={inv.status === 'active' ? 'default' : inv.status === 'matured' ? 'secondary' : 'outline'}
                  className={inv.status === 'active' ? 'bg-blue-100 text-blue-800' : inv.status === 'matured' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {inv.status === 'active' ? 'Active' : inv.status === 'matured' ? 'Matured' : 'Early Exit'}
                </Badge>
              </div>
              
              {inv.status === 'active' && (
                <>
                  <div className="w-full bg-blue-100 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.max(2, progress)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(inv.start_date), 'MMM dd, yyyy')}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{daysLeft} days left</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7 text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => {
                      if (window.confirm('Early withdrawal reduces your interest from 10% to 3%. Continue?')) {
                        withdrawEarly(inv.id);
                      }
                    }}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Withdraw Early (3% rate)
                  </Button>
                </>
              )}

              {inv.status !== 'active' && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Payout</span>
                  <span className="font-medium text-green-700">UGX {Number(inv.total_payout).toLocaleString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
