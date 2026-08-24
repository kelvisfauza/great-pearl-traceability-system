// Shared runtime configuration for payment + SMS providers.
// Values are managed by admins in Admin > System Settings > Providers
// and stored in public.system_settings under the key `provider_settings`.

export type FeeTier = { up_to: number; fee: number };

export type ProviderSettings = {
  yo: {
    enabled: boolean;
    min_amount: number;
    max_amount: number;
    service_fee: number;
    require_admin_approval: boolean;
  };
  gosente: {
    enabled: boolean;
    min_amount: number;
    /** Amounts below this route through GosentePay; at/above go to Yo Payments. */
    routing_threshold: number;
    max_amount: number;
    require_admin_approval: boolean;
    fee_tiers: FeeTier[];
  };
  sms: {
    yoola_enabled: boolean;
    infobip_fallback: boolean;
    bulksms_premium: boolean;
    dedup_window_seconds: number;
  };
};

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  yo: {
    enabled: true,
    min_amount: 50000,
    max_amount: 5000000,
    service_fee: 0,
    require_admin_approval: true,
  },
  gosente: {
    enabled: true,
    min_amount: 500,
    routing_threshold: 50000,
    max_amount: 1000000,
    require_admin_approval: true,
    fee_tiers: [
      { up_to: 500, fee: 0 },
      { up_to: 60000, fee: 1100 },
      { up_to: 500000, fee: 1700 },
      { up_to: 1000000, fee: 2500 },
      { up_to: Number.MAX_SAFE_INTEGER, fee: 2900 },
    ],
  },
  sms: {
    yoola_enabled: true,
    infobip_fallback: true,
    bulksms_premium: true,
    dedup_window_seconds: 300,
  },
};

function merge(base: any, override: any): any {
  if (!override || typeof override !== 'object') return base;
  const out: any = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(override)) {
    const v = override[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = merge(base?.[k] ?? {}, v);
    else if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Loads admin-configured provider settings, falling back to safe defaults. */
export async function loadProviderSettings(supabase: any): Promise<ProviderSettings> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'provider_settings')
      .maybeSingle();
    return merge(DEFAULT_PROVIDER_SETTINGS, data?.setting_value) as ProviderSettings;
  } catch (_) {
    return DEFAULT_PROVIDER_SETTINGS;
  }
}

/** Tiered withdrawal fee based on admin-configured tiers. */
export function feeFromTiers(amount: number, tiers: FeeTier[]): number {
  const a = Number(amount) || 0;
  const sorted = [...(tiers || [])].sort((x, y) => x.up_to - y.up_to);
  for (const t of sorted) {
    if (a <= Number(t.up_to)) return Math.max(0, Number(t.fee) || 0);
  }
  return Math.max(0, Number(sorted[sorted.length - 1]?.fee) || 0);
}
