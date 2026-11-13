// Importing this module masks personal data (emails, phone numbers, codes,
// pay amounts) in everything this function writes to the server logs.
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const PHONE = /(?<![\w-])(?:\+?256|0)?7\d{8}(?!\d)/g;
const MONEY = /\b(UGX|balance:?|salary:?|amount:?)\s*[\d,.]+/gi;
const SENSITIVE_KEY = /(email|phone|msisdn|code|otp|pin|password|token|secret|salary|amount|balance|account|name)/i;

export function redactText(s: string): string {
  return s.replace(EMAIL, "$1***@$2").replace(PHONE, (m) => "***" + m.slice(-3)).replace(MONEY, "$1 ***");
}

function redactValue(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return redactText(v);
  if (v instanceof Error) return redactText(v.message);
  if (Array.isArray(v)) return depth > 4 ? "[...]" : v.map((x) => redactValue(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 4) return "[...]";
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) && val != null && typeof val !== "boolean" ? "[redacted]" : redactValue(val, depth + 1);
    }
    return out;
  }
  return v;
}

const g = globalThis as unknown as { __logsRedacted?: boolean };
if (!g.__logsRedacted) {
  g.__logsRedacted = true;
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => orig(...args.map((a) => redactValue(a)));
  }
}
