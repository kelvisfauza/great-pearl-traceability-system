import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ownsRecordingPath } from './recording-path.ts';

Deno.test('recording belongs to both the host and selected call', () => {
  assertEquals(ownsRecordingPath('host/call-123.webm', 'host', 'call'), true);
  assertEquals(ownsRecordingPath('other/call-123.webm', 'host', 'call'), false);
  assertEquals(ownsRecordingPath('host/other-123.webm', 'host', 'call'), false);
  assertEquals(ownsRecordingPath('host/call-../other.webm', 'host', 'call'), false);
  assertEquals(ownsRecordingPath('host/call-123.webm/extra', 'host', 'call'), false);
});