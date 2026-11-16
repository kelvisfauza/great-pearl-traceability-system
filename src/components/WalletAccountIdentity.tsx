import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWalletIdentity } from '@/hooks/useWalletIdentity';

export function WalletAccountIdentity() {
  const { data, error, isLoading, refetch } = useWalletIdentity();
  const { toast } = useToast();
  if (error) return <div className="text-sm text-destructive" role="alert">Could not load wallet account number. <Button variant="link" size="sm" onClick={() => refetch()}>Retry</Button></div>;
  if (isLoading || !data) return <p className="text-xs text-muted-foreground">Loading wallet account number…</p>;
  return <div className="flex items-center gap-2 min-w-0">
    <div className="min-w-0 text-sm"><p className="font-medium break-words">{data.name}</p><p className="text-xs text-muted-foreground">Wallet account <span className="font-mono text-foreground whitespace-nowrap">{data.wallet_account_number}</span></p></div>
    <Button variant="ghost" size="icon" className="shrink-0" title="Copy wallet account number" aria-label="Copy wallet account number" onClick={async () => {
      try { await navigator.clipboard.writeText(data.wallet_account_number); toast({ title: 'Wallet account number copied' }); }
      catch { toast({ title: 'Could not copy account number', variant: 'destructive' }); }
    }}><Copy className="h-4 w-4" /></Button>
  </div>;
}