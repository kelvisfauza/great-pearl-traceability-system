import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PrintJob, fetchPrintJobs, subscribePrintQueue, cleanupExpiredPrintJobs } from '@/lib/printQueue';

const PrintQueueWidget = () => {
  const navigate = useNavigate();
  const [queued, setQueued] = useState<PrintJob[]>([]);

  const load = useCallback(async () => {
    setQueued(await fetchPrintJobs('queued'));
  }, []);

  useEffect(() => {
    void cleanupExpiredPrintJobs().then(load);
    const off = subscribePrintQueue(() => { void load(); });
    const i = window.setInterval(() => { void load(); }, 30000);
    return () => { off(); window.clearInterval(i); };
  }, [load]);

  return (
    <Card className="border-border/40">
      <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Printer className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Print Queue</p>
            <p className="text-[11px] text-muted-foreground">
              {queued.length === 0
                ? 'No documents waiting'
                : `${queued.length} document${queued.length > 1 ? 's' : ''} waiting — print them all at once`}
            </p>
          </div>
        </div>
        <Button size="sm" variant={queued.length ? 'default' : 'outline'} onClick={() => navigate('/print-queue')}>
          Open queue
        </Button>
      </CardContent>
    </Card>
  );
};

export default PrintQueueWidget;
