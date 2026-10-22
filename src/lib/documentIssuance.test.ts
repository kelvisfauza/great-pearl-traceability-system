import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { issuePrintStamp } from './documentIssuance';

const services = (register: (record: Record<string, unknown>) => Promise<void>) => ({
  identity: async () => ({ id: 'authenticated-user', name: 'Fauza Kelvis' }),
  code: () => 'GPCF-DOC-2026-ABC234',
  url: (code: string) => `https://greatpearlcoffeesystem.site/verify/${code}`,
  qr: async (url: string) => `encoded:${url}`,
  register,
});

describe('mandatory document print issuance', () => {
  it('uses the printing user name and registers the same code encoded in the QR', async () => {
    let record: Record<string, unknown> = {};
    const stamp = await issuePrintStamp('GRN 123', 'html', services(async data => { record = data; }));
    assert.equal(stamp.printedBy, 'Fauza Kelvis');
    assert.equal(record.created_by, 'authenticated-user');
    assert.equal(record.code, 'GPCF-DOC-2026-ABC234');
    assert.equal(stamp.qr, 'encoded:https://greatpearlcoffeesystem.site/verify/GPCF-DOC-2026-ABC234');
    assert.equal((record.meta as any).printed_by, 'Fauza Kelvis');
  });
  it('never issues a QR-stamped document if verification registration fails', async () => {
    await assert.rejects(issuePrintStamp('GRN', 'pdf', services(async () => { throw new Error('Registration failed'); })), /Registration failed/);
  });
  it('blocks issuance without the printing employee name', async () => {
    let registered = false;
    await assert.rejects(issuePrintStamp('Form', 'docx', {
      ...services(async () => { registered = true; }), identity: async () => ({ id: 'user', name: '' }),
    }), /employee account/);
    assert.equal(registered, false);
  });
});