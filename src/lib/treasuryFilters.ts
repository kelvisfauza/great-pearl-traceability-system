// Pure helpers describing which Treasury list filters a user has actually applied.
// Keeping this out of the components lets the chips, the highlighted inputs and the
// "no filters" message all agree on one definition of "active".

export type ActiveFilter = { key: string; label: string; value: string };

export type TreasuryTransactionFilters = {
  account: string;
  direction: string;
  reference: string;
  from: string;
  to: string;
};

export const DEFAULT_TREASURY_TRANSACTION_FILTERS: TreasuryTransactionFilters = {
  account: "all",
  direction: "all",
  reference: "",
  from: "",
  to: "",
};

const DIRECTION_LABELS: Record<string, string> = {
  credit: "Credits only",
  debit: "Debits only",
};

/** Filters the user has set on the treasury movements list. */
export function activeTreasuryTransactionFilters(
  state: TreasuryTransactionFilters,
  accountName: (code: string) => string = (code) => code,
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (state.account && state.account !== "all") {
    filters.push({ key: "account", label: "Account", value: accountName(state.account) });
  }
  if (state.direction && state.direction !== "all") {
    filters.push({
      key: "direction",
      label: "Movement",
      value: DIRECTION_LABELS[state.direction] ?? state.direction,
    });
  }
  const reference = state.reference.trim();
  if (reference) filters.push({ key: "reference", label: "Reference", value: reference });
  if (state.from) filters.push({ key: "from", label: "From", value: state.from });
  if (state.to) filters.push({ key: "to", label: "To", value: state.to });
  return filters;
}

/** A single free-text search box counts as one active filter once it has text. */
export function activeSearchFilter(key: string, label: string, value: string): ActiveFilter[] {
  const trimmed = value.trim();
  return trimmed ? [{ key, label, value: trimmed }] : [];
}
