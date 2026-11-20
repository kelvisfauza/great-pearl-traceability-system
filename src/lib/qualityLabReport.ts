export const labFields = [
  ['moisture', 'Moisture'], ['group1_defects', 'Group 1 defects'],
  ['group2_defects', 'Group 2 defects'], ['below12', 'Below screen 12'],
  ['pods', 'Pods'], ['husks', 'Husks'], ['stones', 'Stones'],
  ['fm', 'Foreign matter'], ['clean_d14', 'Clean D14'], ['outturn', 'Outturn'],
] as const;

export type LabPosting = {
  id: string; form_number?: string | null; supplier_name?: string | null;
  analysis_date?: string | null; sender_name?: string | null; sender_email?: string | null;
  status: string; linked_delivery_id?: string | null; lab_results?: Record<string, unknown> | null;
};

export function labRows(posting: LabPosting): [string, string][] {
  return labFields.map(([key, label]) => {
    const value = posting.lab_results?.[key];
    return [label, typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? `${value}%` : '—'];
  });
}

export function printableLabPosting(posting: LabPosting, deliveryId: string) {
  return posting.status === 'reviewed' && posting.linked_delivery_id === deliveryId &&
    labRows(posting).some(([, value]) => value !== '—');
}