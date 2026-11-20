import { supabase } from '@/integrations/supabase/client';
import { printableLabPosting, type LabPosting } from '@/lib/qualityLabReport';

export async function fetchDeliveryLabReports(deliveryId?: string | null, batchNumber?: string | null): Promise<LabPosting[]> {
  if (!deliveryId && !batchNumber) return [];
  const { data, error } = await (supabase as any).rpc('delivery_lab_reports', {
    p_delivery_id: deliveryId || null, p_batch_number: batchNumber || null,
  });
  if (error) throw new Error(`Could not load attached lab reports: ${error.message}`);
  return (data ?? []).filter((p: LabPosting) => printableLabPosting(p, deliveryId || p.linked_delivery_id || ''));
}