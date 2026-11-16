import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWalletIdentity } from '@/hooks/useWalletIdentity';

export function WalletAccountIdentity() {
  const { data, error, isLoading, refetch } = useWalletIdentity();
  const { toast } = useToast();
  if (error) return <div className="text-sm text-destructive" role="alert">Could not load wallet account number. <Button variant="link" size="sm" onClick={() => refetch()}>Retry</Button></div>;
  if (isLoading || !data) return <p className="text-xs text-muted-foreground">Loading wallet account number…</p>;
  return <section aria-label="Your wallet account" className="flex items-center justify-between gap-3 min-w-0 border-l-4 border-primary bg-primary/5 px-4 py-3">
    <div className="min-w-0 space-y-1"><p className="text-sm font-medium break-words text-foreground">{data.name}</p><p className="text-xs text-muted-foreground">Wallet account number</p><p className="font-mono text-xl sm:text-2xl font-semibold text-primary break-all select-all">{data.wallet_account_number}</p></div>
    <Button variant="ghost" size="icon" className="shrink-0" title="Copy wallet account number" aria-label="Copy wallet account number" onClick={async () => {
      try { await navigator.clipboard.writeText(data.wallet_account_number); toast({ title: 'Wallet account number copied' }); }
      catch { toast({ title: 'Could not copy account number', variant: 'destructive' }); }
    }}><Copy className="h-4 w-4" /></Button>
  </section>;
}