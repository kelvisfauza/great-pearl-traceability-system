export function mealPaymentAllowed(choice: unknown, mode: string) {
  return choice == null || (choice === 'cash' ? mode === 'cash' : choice === 'mobile_money' && ['momo', 'gosente', 'yo', 'gosentepay'].includes(mode));
}