export function withdrawalCodeSms(firstName: string, code: string): string {
  const safeName = firstName.trim().split(/\s+/)[0] || 'Employee';
  return `${safeName} - Great Agro Coffee\nWithdrawal code: ${code}\nValid for 10 minutes. Do not share.`;
}

type DeliveryAttempt = () => Promise<boolean>;

/** SMS is primary; the slower email service is only a fallback. */
export async function deliverWithdrawalCode(sendSms: DeliveryAttempt, sendEmail: DeliveryAttempt) {
  if (await sendSms()) return { ok: true as const, channel: 'sms' as const };
  if (await sendEmail()) return { ok: true as const, channel: 'email' as const };
  return { ok: false as const, channel: null };
}
