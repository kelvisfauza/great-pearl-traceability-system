import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import { format, differenceInDays } from 'date-fns';

export const InvestmentsCard = () => {
  const { activeInvestments, investments, totalInvested, totalExpectedReturn, withdrawEarly } = useInvestments();
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (investments.length === 0) return null;

  const completedInvestments = investments.filter(i => i.status !== 'active');
  const visibleInvestments = expanded ? activeInvestments : activeInvestments.slice(0, 1);

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Investments
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-1">
              {activeInvestments.length} active
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeInvestments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No active investments</p>
        )}
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

        {visibleInvestments.map(inv => {
          const daysLeft = Math.max(0, differenceInDays(new Date(inv.maturity_date), new Date()));
          const progress = Math.min(100, ((differenceInDays(new Date(), new Date(inv.start_date))) / (differenceInDays(new Date(inv.maturity_date), new Date(inv.start_date)))) * 100);

          return (
            <div key={inv.id} className="bg-white/70 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">UGX {Number(inv.amount).toLocaleString()}</span>
                <Badge className="bg-blue-100 text-blue-800">Active</Badge>
              </div>
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
                  if (window.confirm('Early withdrawal will give you pro-rated 25% interest based on days completed. Continue?')) {
                    withdrawEarly(inv.id);
                  }
                }}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Withdraw Early (Pro-rated)
              </Button>
            </div>
          );
        })}

        {activeInvestments.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8 text-blue-700 hover:bg-blue-100/50"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" /> Show less</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" /> Show all {activeInvestments.length} active</>
            )}
          </Button>
        )}

        {completedInvestments.length > 0 && (
          <div className="pt-2 border-t border-blue-200">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8 text-muted-foreground hover:bg-blue-100/50"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-3 w-3 mr-1" />
              {showHistory ? 'Hide' : 'Show'} history ({completedInvestments.length})
              {showHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
            {showHistory && (
              <div className="space-y-2 mt-2">
                {completedInvestments.map(inv => (
                  <div key={inv.id} className="bg-white/50 rounded-lg p-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">UGX {Number(inv.amount).toLocaleString()}</span>
                      <Badge variant="outline" className={inv.status === 'matured' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}>
                        {inv.status === 'matured' ? 'Matured' : 'Early Exit'}
                      </Badge>
                    </div>
                    <div className="flex justify-between mt-1 text-muted-foreground">
                      <span>{format(new Date(inv.withdrawn_at || inv.maturity_date), 'MMM dd, yyyy')}</span>
                      <span className="font-medium text-green-700">Payout: UGX {Number(inv.total_payout).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
