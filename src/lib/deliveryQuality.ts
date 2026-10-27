export interface DeliveryQuality {
  store_record_id: string | null;
  batch_number: string;
  moisture: number | null;
  final_price: number | null;
  suggested_price: number | null;
  calculator_price: number | null;
  group1_defects: number | null;
  group2_defects: number | null;
  fm: number | null;
  pods: number | null;
  husks: number | null;
  stones: number | null;
  updated_at: string;
}

export function savedDeliveryQuality(record: { id: string; batch_number: string }, assessments: DeliveryQuality[]) {
  const linked = assessments.filter(a => a.store_record_id === record.id);
  const batchMatches = assessments.filter(a => !a.store_record_id && a.batch_number === record.batch_number);
  // Legacy batch-only matches must be unique; never borrow another delivery's assessment.
  const assessment = linked.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
    ?? (batchMatches.length === 1 ? batchMatches[0] : undefined);
  const fields = [
    ['GP1', assessment?.group1_defects], ['GP2', assessment?.group2_defects],
    ['FM', assessment?.fm], ['Pods', assessment?.pods],
    ['Husks', assessment?.husks], ['Stones', assessment?.stones],
  ] as const;
  const defects = fields.filter(([, value]) => value != null)
    .map(([label, value]) => `${label}: ${value}%`).join(', ');
  return {
    moistureContent: assessment?.moisture ?? null,
    defects: defects || null,
    pricePerKg: assessment?.final_price ?? assessment?.suggested_price ?? assessment?.calculator_price ?? null,
  };
}