import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActiveFilter } from "@/lib/treasuryFilters";

/**
 * Shows which filters are currently applied so a narrowed list never looks empty
 * by accident. Each chip removes its own filter; "Clear all" removes every one.
 */
export default function ActiveFilterChips({
  filters,
  onClear,
  onClearAll,
  emptyLabel = "No filters applied — showing every record.",
}: {
  filters: ActiveFilter[];
  onClear: (key: string) => void;
  onClearAll?: () => void;
  emptyLabel?: string;
}) {
  if (filters.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5 shrink-0" />
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Filter className="h-3.5 w-3.5 shrink-0" />
        Active filters
      </span>
      {filters.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onClear(f.key)}
          aria-label={`Remove ${f.label} filter`}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
        >
          <span className="text-muted-foreground">{f.label}</span>
          <span className="font-semibold">{f.value}</span>
          <X className="h-3 w-3 shrink-0" />
        </button>
      ))}
      {onClearAll && filters.length > 1 && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs underline-offset-2 hover:underline" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
