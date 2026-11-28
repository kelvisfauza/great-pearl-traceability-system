import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function NavigationActionBadge({ state, compact = false }: { state: { count: number | undefined; error: boolean } | null; compact?: boolean }) {
  if (!state) return null;
  const label = state.error ? 'Awaiting-action count unavailable' : state.count === undefined ? 'Loading awaiting-action count' : `${state.count} awaiting action`;
  return <Badge variant={state.error ? 'outline' : state.count ? 'destructive' : 'secondary'} aria-label={label} title={label} className={cn('ml-auto h-5 min-w-5 shrink-0 justify-center px-1.5 text-xs tabular-nums', compact && 'absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]')}>
    {state.error ? '!' : state.count === undefined ? '…' : state.count > 99 ? '99+' : state.count}
  </Badge>;
}