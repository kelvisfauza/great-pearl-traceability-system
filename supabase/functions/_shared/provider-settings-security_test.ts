import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { DEFAULT_PROVIDER_SETTINGS, merge } from './provider-settings.ts';

Deno.test('provider settings cannot traverse inherited prototype keys', () => {
  const malicious = JSON.parse('{"__proto__":{"enabled":false},"constructor":{"prototype":{"polluted":true}},"yo":{"__proto__":{"polluted":true},"enabled":false,"unknown":42}}');
  const result = merge(DEFAULT_PROVIDER_SETTINGS, malicious);
  assertEquals(result.yo.enabled, false);
  assertEquals(result.yo.unknown, undefined);
  assertEquals(({} as Record<string, unknown>).polluted, undefined);
  assertEquals(Object.prototype.hasOwnProperty.call(result, '__proto__'), false);
  assertEquals(DEFAULT_PROVIDER_SETTINGS.yo.enabled, true);
});