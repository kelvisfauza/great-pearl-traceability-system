import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { labRows, printableLabPosting, type LabPosting } from './qualityLabReport';
const p: LabPosting = { id: 'lab-1', status: 'reviewed', linked_delivery_id: 'delivery-1', lab_results: { moisture: 13.5, pods: 0 } };
it('prints the actual lab moisture and preserves measured zero, leaving absent results blank', () => {
  const rows = Object.fromEntries(labRows(p));
  assert.equal(rows.Moisture, '13.5%'); assert.equal(rows.Pods, '0%'); assert.equal(rows.Outturn, '—');
});
it('requires the reviewed report attached to the exact delivery', () => {
  assert.equal(printableLabPosting(p, 'delivery-1'), true);
  assert.equal(printableLabPosting(p, 'delivery-2'), false);
  assert.equal(printableLabPosting({ ...p, status: 'pending' }, 'delivery-1'), false);
  assert.equal(printableLabPosting({ ...p, status: 'needs_correction' }, 'delivery-1'), false);
});
it('never fabricates readings from an empty or invalid scan', () => {
  assert.equal(printableLabPosting({ ...p, lab_results: { moisture: 101, pods: null } }, 'delivery-1'), false);
});