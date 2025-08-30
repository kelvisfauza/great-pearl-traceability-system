import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, DollarSign, Play, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export const DailySalaryManager = () => {
  const [processing, setProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);
  const [lastBackfill, setLastBackfill] = useState<string | null>(null);
  const { toast } = useToast();

  const triggerDailySalaryProcessing = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-daily-salary', {
        body: { manual_trigger: true }
      });

      if (error) throw error;

      toast({
        title: "Daily Salary Processing Triggered",
        description: `${data.processed_count || 0} employees processed successfully`,
      });

      setLastProcessed(new Date().toLocaleString());

    } catch (error: any) {
      console.error('Error triggering daily salary processing:', error);
      toast({
        title: "Error",
        description: "Failed to trigger daily salary processing",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const triggerBackfillProcessing = async () => {
    setProcessing(true);
    try {
      const currentDate = new Date();
      const { data, error } = await supabase.functions.invoke('backfill-salary-credits', {
        body: { 
          month: currentDate.getMonth() + 1, // Current month
          year: currentDate.getFullYear()
        }
      });

      if (error) throw error;

      toast({
        title: "Backfill Processing Complete",
        description: `${data.total_processed || 0} credits processed across ${data.working_days || 0} working days`,
        duration: 6000,
      });

      setLastBackfill(new Date().toLocaleString());

    } catch (error: any) {
      console.error('Error triggering backfill processing:', error);
      toast({
        title: "Error",
        description: "Failed to trigger backfill processing",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Daily Salary Management</h2>
        <Badge variant="outline" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Auto-runs 8 AM Mon-Sat
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* System Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Schedule:</span>
                <span className="font-medium">Mon-Sat 8:00 AM</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Rest Day:</span>
                <span className="font-medium">Sunday</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Calculation:</span>
                <span className="font-medium">Salary ÷ 26 days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Processing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Play className="h-4 w-4" />
              Manual Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Trigger daily salary processing manually for all active employees
              </p>
              <Button 
                onClick={triggerDailySalaryProcessing}
                disabled={processing}
                className="w-full"
              >
                {processing ? 'Processing...' : 'Process Today'}
              </Button>
              <Button 
                onClick={triggerBackfillProcessing}
                disabled={processing}
                variant="outline"
                className="w-full"
              >
                {processing ? 'Processing...' : 'Backfill This Month'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last Processed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Last Manual Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {lastProcessed ? (
                <div>
                  <div className="text-lg font-semibold text-green-600">Complete</div>
                  <div className="text-sm text-muted-foreground">{lastProcessed}</div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-semibold text-muted-foreground">Not Run</div>
                  <div className="text-sm text-muted-foreground">No manual runs yet</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Backfill */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last Backfill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {lastBackfill ? (
                <div>
                  <div className="text-lg font-semibold text-blue-600">Complete</div>
                  <div className="text-sm text-muted-foreground">{lastBackfill}</div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-semibold text-muted-foreground">Not Run</div>
                  <div className="text-sm text-muted-foreground">No backfill yet</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            How Daily Salary Credits Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Automatic Processing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Runs every Monday through Saturday at 8:00 AM</li>
                <li>• Skips Sundays (rest day)</li>
                <li>• Only processes active employees with salaries</li>
                <li>• Prevents duplicate credits for the same day</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Backfill Processing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Credits all past working days of current month</li>
                <li>• Skips Sundays and days already credited</li>
                <li>• Useful for new system setup or missed days</li>
                <li>• Run once per month maximum</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};