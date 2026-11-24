import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VendorAccount {
  id: string;
  vendor_number: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_category: string;
  notes: string | null;
}

export async function vendorAction(action: string, options: { vendor?: string; request?: string; details?: Record<string, string>; offset?: number } = {}) {
  const { data, error } = await (supabase as any).rpc('vendor_account_action', {
    p_action: action, p_vendor: options.vendor || null, p_request: options.request || null,
    p_details: options.details || {}, p_offset: options.offset || 0,
  });
  if (error) throw new Error(error.message);
  return data;
}

export function useVendorAccounts(enabled = true) {
  return useQuery<VendorAccount[]>({
    queryKey: ['vendor-accounts'], enabled,
    queryFn: async () => {
      const vendors: VendorAccount[] = [];
      for (let offset = 0; ; offset += 100) {
        const result = await vendorAction('list', { offset });
        const page: VendorAccount[] = result.vendors || [];
        vendors.push(...page);
        if (page.length < 100) return vendors;
      }
    },
  });
}

export async function vendorPayments(vendor: string, offset = 0) {
  const { data, error } = await (supabase as any).rpc('vendor_account_payments', { p_vendor: vendor, p_offset: offset });
  if (error) throw new Error(error.message);
  return data;
}