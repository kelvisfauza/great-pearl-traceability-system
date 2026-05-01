import { useState } from 'react';
import { Wifi, WifiOff, CloudUpload, AlertCircle, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useOnlineStatus } from '@/lib/offline/useOnlineStatus';
import { useQueueStatus } from '@/lib/offline/useQueueStatus';
import { syncQueue, retryOp, discardOp } from '@/lib/offline/queue';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const KIND_LABEL: Record<string, string> = {
  coffee_receipt: 'Coffee Receipt',
  quality_assessment: 'Quality Assessment',
  milling_job: 'Milling Job',
};

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const { items, pendingCount, failedCount, conflictCount, refresh } = useQueueStatus();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const total = pendingCount + failedCount + conflictCount;

  // Hide entirely when fully online and queue empty
  if (online && total === 0) {
    return (
      <div className="fixed bottom-3 right-3 z-50 hidden md:flex items-center gap-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 text-xs">
        <Wifi className="h-3 w-3" /> Online
      </div>
    );
  }

  const handleSyncNow = async () => {
    setSyncing(true);
    const r = await syncQueue();
    setSyncing(false);
    await refresh();
    toast({
      title: 'Sync complete',
      description: `${r.synced} synced • ${r.failed} failed • ${r.conflicts} conflicts`,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            'fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-lg border',
            !online
              ? 'bg-amber-500 text-white border-amber-600'
              : conflictCount > 0
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-primary text-primary-foreground border-primary'
          )}
        >
          {!online ? <WifiOff className="h-4 w-4" /> : <CloudUpload className="h-4 w-4" />}
          <span>
            {!online ? 'Offline' : 'Pending sync'}
            {total > 0 && ` • ${total}`}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {online ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-amber-600" />}
            {online ? 'Online' : 'You are offline'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border p-3 bg-muted/40 text-sm">
            {online
              ? 'Your device has internet. Pending submissions will upload automatically.'
              : 'Submissions you make while offline are saved on this device and will upload automatically when you reconnect.'}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {pendingCount > 0  && <Badge variant="secondary">{pendingCount} pending</Badge>}
              {failedCount > 0   && <Badge variant="destructive">{failedCount} failed</Badge>}
              {conflictCount > 0 && <Badge className="bg-orange-600 hover:bg-orange-700">{conflictCount} conflicts</Badge>}
              {total === 0       && <Badge className="bg-green-600 hover:bg-green-700">All synced</Badge>}
            </div>
            <Button size="sm" onClick={handleSyncNow} disabled={!online || syncing}>
              <RefreshCw className={cn('mr-1 h-3 w-3', syncing && 'animate-spin')} />
              Sync now
            </Button>
          </div>

          <div className="space-y-2">
            {items.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Nothing waiting to sync.
              </div>
            )}
            {items.map(op => (
              <div key={op.id} className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{KIND_LABEL[op.kind] || op.kind}</span>
                  <Badge variant={
                    op.status === 'conflict' ? 'destructive'
                    : op.status === 'failed' ? 'destructive'
                    : op.status === 'syncing' ? 'default'
                    : 'secondary'
                  }>{op.status}</Badge>
                </div>
                {op.user_label && <div className="text-muted-foreground">{op.user_label}</div>}
                <div className="text-xs text-muted-foreground">
                  Saved {new Date(op.created_at).toLocaleString()}
                </div>
                {op.last_error && (
                  <div className="flex items-start gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="break-words">{op.last_error}</span>
                  </div>
                )}
                {(op.status === 'failed' || op.status === 'conflict') && (
                  <div className="flex gap-2 pt-1">
                    {op.status === 'failed' && (
                      <Button size="sm" variant="outline" onClick={() => retryOp(op.id!)}>
                        <RefreshCw className="mr-1 h-3 w-3" /> Retry
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive"
                      onClick={() => discardOp(op.id!)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Discard
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}