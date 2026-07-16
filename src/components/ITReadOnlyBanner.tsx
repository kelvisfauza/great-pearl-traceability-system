import { Eye, ShieldAlert } from 'lucide-react';
import { useITReadOnly } from '@/hooks/useITReadOnly';

/**
 * Informational banner shown to IT Officers on restricted pages.
 * Purely presentational — enforcement is handled by ITReadOnlyEnforcer.
 */
export function ITReadOnlyBanner() {
  const readOnly = useITReadOnly();
  if (!readOnly) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <div className="font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" /> Read-only access (IT Officer)
        </div>
        <div className="text-xs opacity-90">
          You can view records on this page, but creating, editing, deleting or
          approving requires an Administrator. Contact an admin to request changes.
        </div>
      </div>
    </div>
  );
}

export default ITReadOnlyBanner;