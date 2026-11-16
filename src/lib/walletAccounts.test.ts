import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterWalletRecipients } from './walletAccounts';

const recipients = [
  { id: 'a', name: 'Bwambale Benson', email: 'benson@example.com', phone: '', wallet_account_number: 'GAC-10000001' },
  { id: 'b', name: 'Musema Wyclif', email: 'wyclif@example.com', phone: '', wallet_account_number: 'GAC-10000002' },
];
test('wallet transfers find the correct recipient by account number alongside names', () => {
  assert.deepEqual(filterWalletRecipients(recipients, 'gac 10000002').map(r => r.id), ['b']);
  assert.deepEqual(filterWalletRecipients(recipients, '10000001').map(r => r.id), ['a']);
  assert.deepEqual(filterWalletRecipients(recipients, 'Bwambale').map(r => r.id), ['a']);
  assert.equal(filterWalletRecipients(recipients, 'GAC-99999999').length, 0);
});