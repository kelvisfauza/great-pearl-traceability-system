import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { supabase } from '../../integrations/supabase/client';

it('flags missing analysis only when a sampling order exists', async () => {
  const { data, error } = await (supabase as any).rpc('red_flag_missing_analysis', { has_sampling: true, has_file: false });
  assert.equal(error, null);
  assert.equal(data, true);
});
it('does not flag an assessment with its analysis attached', async () => {
  const { data, error } = await (supabase as any).rpc('red_flag_missing_analysis', { has_sampling: true, has_file: true });
  assert.equal(error, null);
  assert.equal(data, false);
});
it('does not claim a sampling violation without a linked order', async () => {
  const { data, error } = await (supabase as any).rpc('red_flag_missing_analysis', { has_sampling: false, has_file: false });
  assert.equal(error, null);
  assert.equal(data, false);
});
it('recognises the same clearance number despite edge spaces', async () => {
  const a = await (supabase as any).rpc('red_flag_form_key', { value: ' 4016 ' });
  const b = await (supabase as any).rpc('red_flag_form_key', { value: '4016' });
  assert.equal(a.error, null);
  assert.equal(b.error, null);
  assert.equal(a.data, '4016');
  assert.equal(a.data, b.data);
});
it('denies anonymous access to red-flag scanning', async () => {
  const { error } = await supabase.rpc('scan_system_red_flags');
  assert.ok(error);
});