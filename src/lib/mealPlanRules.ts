export type MealPayment = 'cash' | 'mobile_money';
export function mealPlanPayload(form: { documentNumber: string; name: string; phone: string; email: string; amount: string; description: string; payment: MealPayment }) {
  const number = form.documentNumber.trim().toUpperCase();
  if (!/^MP-\d{4}-\d{6,}$/.test(number)) throw new Error('Enter the MP document number printed on the form.');
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount < 500) throw new Error('Enter an amount of at least UGX 500.');
  if (!form.name.trim() || !form.description.trim()) throw new Error('Enter the recipient and meal details.');
  const phone = form.phone.replace(/\D/g, '');
  if (form.payment === 'mobile_money' && !/^(07\d{8}|2567\d{8}|7\d{8})$/.test(phone)) throw new Error('Enter a valid Uganda mobile money number.');
  return { request_type: 'meal_plan', paper_document_number: number, invoice_number: number,
    provider_name: form.name.trim(), phone, email: form.email.trim() || null, amount,
    description: form.description.trim(), requested_payment_method: form.payment };
}
export function mealPaymentAllowed(choice: unknown, mode: string) {
  return choice == null || (choice === 'cash' ? mode === 'cash' : choice === 'mobile_money' && ['momo', 'gosente', 'yo', 'gosentepay'].includes(mode));
}