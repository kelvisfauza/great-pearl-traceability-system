import * as React from "react";
import { cn } from "@/lib/utils";

interface DobInputProps {
  /** ISO value: yyyy-mm-dd (empty string when incomplete) */
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

type Part = "day" | "month" | "year";

const LENGTHS: Record<Part, number> = { day: 2, month: 2, year: 4 };
const LABELS: Record<Part, string> = { day: "Day", month: "Month", year: "Year" };
const PLACEHOLDERS: Record<Part, string> = { day: "DD", month: "MM", year: "YYYY" };
const ORDER: Part[] = ["day", "month", "year"];

/**
 * Segmented date-of-birth entry (DD / MM / YYYY) with auto-advance,
 * backspace step-back and full-date paste support.
 */
export const DobInput: React.FC<DobInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  className,
}) => {
  const parse = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? { year: m[1], month: m[2], day: m[3] } : { year: "", month: "", day: "" };
  };

  const [parts, setParts] = React.useState(() => parse(value));
  const refs = React.useRef<Record<Part, HTMLInputElement | null>>({
    day: null,
    month: null,
    year: null,
  });

  React.useEffect(() => {
    const next = parse(value);
    if (value === "") {
      setParts((p) => (p.day || p.month || p.year ? { year: "", month: "", day: "" } : p));
    } else {
      setParts(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (next: typeof parts) => {
    const complete =
      next.day.length === 2 && next.month.length === 2 && next.year.length === 4;
    const iso = complete ? `${next.year}-${next.month}-${next.day}` : "";
    onChange(iso);
    if (complete) onComplete?.(iso);
  };

  const handleChange = (part: Part, raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, LENGTHS[part]);
    const next = { ...parts, [part]: digits };
    setParts(next);
    emit(next);

    if (digits.length === LENGTHS[part]) {
      const idx = ORDER.indexOf(part);
      const nextPart = ORDER[idx + 1];
      if (nextPart) refs.current[nextPart]?.focus();
    }
  };

  const handleKeyDown = (part: Part, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !parts[part]) {
      const prev = ORDER[ORDER.indexOf(part) - 1];
      if (prev) {
        e.preventDefault();
        refs.current[prev]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    if (!iso && !dmy) return;
    e.preventDefault();
    const next = iso
      ? { year: iso[1], month: iso[2], day: iso[3] }
      : {
          day: dmy![1].padStart(2, "0"),
          month: dmy![2].padStart(2, "0"),
          year: dmy![3],
        };
    setParts(next);
    emit(next);
    refs.current.year?.focus();
  };

  return (
    <div className={cn("flex items-end justify-center gap-2", className)}>
      {ORDER.map((part, i) => (
        <React.Fragment key={part}>
          {i > 0 && (
            <span className="pb-4 text-xl font-semibold text-muted-foreground">/</span>
          )}
          <div className="flex flex-col items-center gap-1">
            <input
              ref={(el) => (refs.current[part] = el)}
              value={parts[part]}
              onChange={(e) => handleChange(part, e.target.value)}
              onKeyDown={(e) => handleKeyDown(part, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.currentTarget.select()}
              disabled={disabled}
              autoFocus={autoFocus && part === "day"}
              inputMode="numeric"
              autoComplete={part === "year" ? "bday-year" : part === "month" ? "bday-month" : "bday-day"}
              aria-label={LABELS[part]}
              placeholder={PLACEHOLDERS[part]}
              maxLength={LENGTHS[part]}
              className={cn(
                "h-14 rounded-xl border-2 border-input bg-muted/40 text-center text-2xl font-semibold tabular-nums outline-none transition-all duration-200",
                "placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground/60",
                "focus:scale-105 focus:border-primary focus:bg-background focus:shadow-lg focus:shadow-primary/20 focus:ring-4 focus:ring-primary/15",
                "disabled:cursor-not-allowed disabled:opacity-50",
                parts[part] && "border-primary/60 bg-primary/5",
                part === "year" ? "w-24" : "w-16"
              )}
            />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {LABELS[part]}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default DobInput;
