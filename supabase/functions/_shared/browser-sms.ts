import { buildPriceSms } from './station-prices.ts';
import { phoneKey, registeredPhone, ownTestDestination, SETTINGS_TEST_MESSAGE } from './message-policy.ts';

const PRICE_TYPES = new Set(['price_update', 'price_correction', 'price_update_intern', 'price_correction_intern', 'supplier_price_broadcast', 'price_update_test']);
export const MAINTENANCE_RECOVERY_EMAIL = 'fauzakusa@greatpearlcoffee.com';
const CODE_TYPES = new Set(['verification', 'verification_code', 'otp', 'login_code', 'twofa']);

export async function prepareBrowserSms(db: any, body: Record<string, any>, sender: any, privileged: boolean, priceAllowed: boolean, itAllowed: boolean): Promise<{ phone: string; userName: string; recipientEmail?: string; triggeredBy: string; message: string; messageType: string; requestId?: string }> {
  const type = String(body.messageType || '').toLowerCase();
  const recipient = await registeredPhone(db, body.phone);
  if (!recipient) throw new Error('Choose a saved active employee or supplier recipient.');
  const identity = { phone: recipient.phone, userName: recipient.name, recipientEmail: recipient.email, triggeredBy: sender.email };
  if (PRICE_TYPES.has(type)) {
    if (!priceAllowed) throw new Error('Only authorized price staff can send price notices.');
    if (type === 'price_update_test') ownTestDestination('sms', recipient.phone, sender);
    if (body.priceSource === 'market_update') {
      if (!body.requestId) throw new Error('Choose a saved market update.');
      const { data: update, error } = await db.from('market_updates').select('id,date,price,outturn,moisture,fm').eq('id', body.requestId).maybeSingle();
      if (error || !update || !Number.isFinite(Number(update.price)) || Number(update.price) <= 0) throw new Error('The saved market update is unavailable.');
      const date = String(update.date || '').slice(0, 10);
      return { ...identity, message: `Great Agro Coffee prices ${date}\nArabica UGX ${Number(update.price).toLocaleString('en-UG')}/kg\nOutturn ${Number(update.outturn)}%, moisture ${Number(update.moisture)}%, FM ${Number(update.fm)}%.`, messageType: 'price_update', requestId: update.id };
    }
    let prices;
    if (body.requestId) {
      const { data, error } = await db.from('price_approval_requests').select('*').eq('id', body.requestId).eq('status', 'approved').maybeSingle();
      if (error || !data) throw new Error('Choose an approved saved price request.');
      prices = data;
    } else {
      const { data, error } = await db.from('market_prices').select('*').eq('price_type', 'reference_prices')
        .order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (error || !data) throw new Error('No saved reference prices are available.');
      prices = data;
    }
    const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala' });
    // No caller message, price, date, correction or closing is trusted.
    return { ...identity, message: buildPriceSms(prices, date, { correction: !!prices.is_correction }), messageType: type === 'price_update_test' ? 'price_update' : type, requestId: prices.id };
  }
  if (CODE_TYPES.has(type) || body.action === 'resend_login_code') {
    if (!itAllowed && sender.email?.toLowerCase() !== recipient.email?.toLowerCase()) throw new Error('Only IT support can resend another employee code.');
    if (!recipient.email) throw new Error('Verification requires a saved employee account.');
    const { data: code, error } = await db.from('verification_codes').select('id,code,expires_at,phone')
      .ilike('email', recipient.email).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !code || phoneKey(code.phone) !== recipient.phone || !/^\d{4,6}$/.test(String(code.code))) throw new Error('No unexpired saved verification code exists for this recipient.');
    return { ...identity, message: `Great Agro Coffee verification code: ${code.code}. Do not share this code.`, messageType: 'verification', requestId: code.id };
  }
  if (type === 'loan_guarantor_request') {
    let query = db.from('loans').select('id,employee_email,employee_name,guarantor_email,guarantor_phone,guarantor_approval_code,loan_amount,duration_months,status,guarantor_approved')
      .ilike('employee_email', sender.email).eq('guarantor_approved', false);
    if (body.requestId) query = query.eq('id', body.requestId);
    else query = query.ilike('guarantor_email', recipient.email || 'no-employee@example.invalid');
    const { data: loan, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !loan || !['pending', 'pending_guarantor'].includes(String(loan.status).toLowerCase()) || phoneKey(loan.guarantor_phone) !== recipient.phone || !/^\d{6}$/.test(String(loan.guarantor_approval_code))) throw new Error('No saved pending guarantor request matches this recipient.');
    return { ...identity, message: `Great Agro Coffee: ${loan.employee_name} requests your guarantee for UGX ${Number(loan.loan_amount).toLocaleString('en-UG')} over ${loan.duration_months} months. Code: ${loan.guarantor_approval_code}. Sign in to approve or decline.`, messageType: type, requestId: loan.id };
  }
  if (type === 'maintenance_recovery') {
    // Recovery code and PIN come only from the saved active maintenance record,
    // and only go to the primary administrator's registered phone.
    if (!privileged) throw new Error('Only administrators can send the maintenance recovery code.');
    if (String(recipient.email || '').toLowerCase() !== MAINTENANCE_RECOVERY_EMAIL) throw new Error('The recovery code goes only to the primary administrator.');
    const { data: m, error } = await db.from('system_maintenance').select('id,is_active,recovery_key,recovery_pin')
      .eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !m || !m.recovery_key || !m.recovery_pin) throw new Error('No active maintenance recovery code is saved.');
    return { ...identity, message: `MAINTENANCE MODE ACTIVATED. Recovery Code: ${m.recovery_key}. PIN: ${m.recovery_pin}. Use these at the recovery page to restore the system.`, messageType: 'maintenance_recovery', requestId: m.id };
  }
  if (type === 'test') {
    if (!privileged && !itAllowed) throw new Error('Only authorized staff can run a connection test.');
    ownTestDestination('sms', recipient.phone, sender);
    return { ...identity, message: SETTINGS_TEST_MESSAGE, messageType: 'test' };
  }
  // Preserve intentional staff-managed notices, but never let ordinary accounts
  // turn them into arbitrary outbound messaging or spoof an OTP/transaction mirror.
  if (!privileged || type.startsWith('tx:') || type.startsWith('source:tx:') || /\b(?:code|password)\b/i.test(String(body.message || ''))) throw new Error('Use the saved-event notification workflow for this message.');
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 900) throw new Error('Staff notices must be between 1 and 900 characters.');
  const trimmed = body.message.trim();
  const branded = /^great agro/i.test(trimmed) ? trimmed : `Great Agro Coffee notice: ${trimmed}`;
  return { ...identity, message: branded.slice(0, 960), messageType: type || 'general' };
}