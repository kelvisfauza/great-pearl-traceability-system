export interface WalletRecipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  wallet_account_number: string;
}

export function filterWalletRecipients(recipients: WalletRecipient[], query: string) {
  const q = query.toLowerCase().replace(/[\s-]/g, '');
  return recipients.filter(recipient => [recipient.name, recipient.email, recipient.wallet_account_number]
    .some(value => value.toLowerCase().replace(/[\s-]/g, '').includes(q)));
}