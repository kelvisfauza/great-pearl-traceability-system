import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { Recognition } from './lab-schema.ts';
const source = { is_quality_analysis: true, reason: 'Single lab form', form_number: 'GAC QA TEST', sampling_order_number: null, supplier_name: null, batch_number: null, analysis_date: null, lab_results: { moisture: 15.8, group1_defects: null, group2_defects: null, below12: null, pods: 0, husks: null, stones: null, fm: null, clean_d14: null, outturn: 54.7, physical_assessment_by: null, comments: null } };
Deno.test('structured scan retains exact measurements and missing readings', () => {
  const result = Recognition.parse(source);
  assertEquals(result.lab_results?.moisture, 15.8);
  assertEquals(result.lab_results?.pods, 0);
  assertEquals(result.lab_results?.stones, null);
});
Deno.test('structured scan rejects impossible percentages', () => {
  assertEquals(Recognition.safeParse({ ...source, lab_results: { ...source.lab_results, moisture: 101 } }).success, false);
});