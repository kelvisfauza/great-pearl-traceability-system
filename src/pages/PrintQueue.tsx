import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Printer, Trash2, RotateCcw, History, Inbox } from 'lucide-react';
import {
  PrintJob, fetchPrintJobs, markPrinted, deleteJobs, requeueJob,
  cleanupExpiredPrintJobs, printHtmlJobs, printPdfJob, subscribePrintQueue,
} from '@/lib/printQueue';

const PrintQueuePage = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const all = await fetchPrintJobs();
    setJobs(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    void cleanupExpiredPrintJobs().then(load);
    const off = subscribePrintQueue(() => { void load(); });
    const i = window.setInterval(() => { void load(); }, 20000);
    return () => { off(); window.clearInterval(i); };
  }, [load]);

  const queued = jobs.filter(j => j.status === 'queued');
  const history = jobs.filter(j => j.status === 'printed');

  const toggle = (id: string) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const runPrint = async (items: PrintJob[]) => {
    if (!items.length) return;
    const htmlJobs = items.filter(j => j.format === 'html');
    const pdfJobs = items.filter(j => j.format === 'pdf');
    let ok = true;
    if (htmlJobs.length) ok = printHtmlJobs(htmlJobs) && ok;
    pdfJobs.forEach(j => { ok = printPdfJob(j) && ok; });
    if (!ok) {
      toast({ title: 'Pop-up blocked', description: 'Allow pop-ups for this site to print.', variant: 'destructive' });
      return;
    }
    await markPrinted(items.map(j => j.id));
    setSelected([]);
    await load();
    toast({ title: 'Sent to printer', description: `${items.length} document(s) printed and cleared from the queue.` });
  };

  const JobRow = ({ job, showCheckbox }: { job: PrintJob; showCheckbox: boolean }) => (
    <div className="flex items-center gap-3 border border-border/40 rounded-lg px-3 py-2">
      {showCheckbox && (
        <Checkbox checked={selected.includes(job.id)} onCheckedChange={() => toggle(job.id)} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{job.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {job.doc_type} · {format(new Date(job.created_at), 'dd MMM yyyy HH:mm')}
          {job.printed_at && ` · printed ${format(new Date(job.printed_at), 'dd MMM HH:mm')}`}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] uppercase">{job.format}</Badge>
      <Button size="sm" variant="outline" onClick={() => runPrint([job])}>
        <Printer className="h-3.5 w-3.5 mr-1" /> Print
      </Button>
      {job.status === 'printed' && (
        <Button size="sm" variant="ghost" onClick={async () => { await requeueJob(job.id); await load(); }}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={async () => { await deleteJobs([job.id]); await load(); }}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );

  return (
    <DashboardLayout title="Print Queue" subtitle="Queue documents and print them all at once">
      <div className="space-y-4 pb-10">
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4 text-primary" /> Pending ({queued.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={!selected.length}
                onClick={() => runPrint(queued.filter(j => selected.includes(j.id)))}>
                Print selected ({selected.length})
              </Button>
              <Button size="sm" disabled={!queued.length} onClick={() => runPrint(queued)}>
                <Printer className="h-4 w-4 mr-1" /> Print all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading queue...</p>
            ) : queued.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing waiting. Documents you send to the queue from anywhere in the system appear here on any device.
              </p>
            ) : (
              queued.map(job => <JobRow key={job.id} job={job} showCheckbox />)
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" /> History ({history.length})
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">Kept for 7 days, then removed automatically.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No printed documents yet.</p>
            ) : (
              history.map(job => <JobRow key={job.id} job={job} showCheckbox={false} />)
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PrintQueuePage;
