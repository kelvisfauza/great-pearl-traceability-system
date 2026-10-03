// Shared WhatsApp send helper (connector gateway).
// OTP/verification codes only — best-effort, never throws.
// SMS remains the primary channel; WhatsApp is a parallel delivery path.

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/whatsapp';

// Normalize Ugandan phone numbers to E.164 digits without a leading '+'
// (0779448188 -> 256779448188; +256... -> 256...; 256... -> 256...)
export function normalizeUgPhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('256')) return digits;
  if (digits.startsWith('0')) return '256' + digits.slice(1);
  if (digits.length === 9) return '256' + digits;
  return digits;
}

export async function sendWhatsAppOtp(phone: string, code: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY');
  if (!LOVABLE_API_KEY || !WHATSAPP_API_KEY) {
    console.warn('WhatsApp not configured — skipping WhatsApp OTP delivery');
    return false;
  }

  const to = normalizeUgPhone(phone);
  if (!to || to.length < 10) {
    console.warn('WhatsApp OTP skipped — unusable phone number');
    return false;
  }

  try {
    // Meta Direct Send: no pre-approved template. Authentication is access-restricted
    // (beta), so fall back to utility if Meta rejects the authentication category.
    for (const category of ['authentication', 'utility']) {
      const response = await fetch(`${GATEWAY_URL}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': WHATSAPP_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: `Great Agro Coffee: your verification code is ${code}. It expires in 5 minutes. Do not share it.` },
          category,
        }),
      });
      const body = await response.text();
      if (response.ok) {
        console.log(`WhatsApp OTP (${category}) dispatched to`, to.slice(0, 6) + '***');
        return true;
      }
      console.error(`WhatsApp OTP ${category} send failed (${response.status}): ${body}`);
    }
    return false;
  } catch (error) {
    console.error('WhatsApp OTP send error:', error);
    return false;
  }
}
