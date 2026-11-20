import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  activeTreasuryTransactionFilters,
  activeSearchFilter,
  DEFAULT_TREASURY_TRANSACTION_FILTERS,
} from './treasuryFilters';

const accounts = (code: string) =>
  ({ operations: 'Operations', cash_at_bank: 'Cash at Bank' })[code] ?? code;

it('shows no active filters when nothing has been picked', () => {
  assert.deepEqual(activeTreasuryTransactionFilters(DEFAULT_TREASURY_TRANSACTION_FILTERS, accounts), []);
});

it('shows a blank reference as no filter at all', () => {
  assert.deepEqual(
    activeTreasuryTransactionFilters({ ...DEFAULT_TREASURY_TRANSACTION_FILTERS, reference: '   ' }, accounts),
    [],
  );
});

it('names the chosen account and movement in plain words', () => {
  assert.deepEqual(
    activeTreasuryTransactionFilters(
      { ...DEFAULT_TREASURY_TRANSACTION_FILTERS, account: 'cash_at_bank', direction: 'debit' },
      accounts,
    ),
    [
      { key: 'account', label: 'Account', value: 'Cash at Bank' },
      { key: 'direction', label: 'Movement', value: 'Debits only' },
    ],
  );
});

it('keeps the typed reference and both dates as separate removable filters', () => {
  assert.deepEqual(
    activeTreasuryTransactionFilters(
      { ...DEFAULT_TREASURY_TRANSACTION_FILTERS, reference: '  GRN-44  ', from: '2026-11-01', to: '2026-11-20' },
      accounts,
    ),
    [
      { key: 'reference', label: 'Reference', value: 'GRN-44' },
      { key: 'from', label: 'From', value: '2026-11-01' },
      { key: 'to', label: 'To', value: '2026-11-20' },
    ],
  );
});

it('falls back to the account code when the account list has not loaded yet', () => {
  assert.deepEqual(
    activeTreasuryTransactionFilters({ ...DEFAULT_TREASURY_TRANSACTION_FILTERS, account: 'loans_overdrafts' }, accounts),
    [{ key: 'account', label: 'Account', value: 'loans_overdrafts' }],
  );
});

it('treats a search box as active only once it holds text', () => {
  assert.deepEqual(activeSearchFilter('search', 'Search', ''), []);
  assert.deepEqual(activeSearchFilter('search', 'Search', '  gac-00012  '), [
    { key: 'search', label: 'Search', value: 'gac-00012' },
  ]);
});
