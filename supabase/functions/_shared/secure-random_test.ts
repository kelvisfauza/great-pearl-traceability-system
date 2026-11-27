import { assertEquals, assertMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fiveDigitCode, fourDigitCode, sixDigitCode, temporaryPassword } from './secure-random.ts';

Deno.test('temporary credentials use sixteen random bytes', () => {
  assertMatch(temporaryPassword(), /^Temp[0-9a-f]{32}!$/);
});
Deno.test('confirmation codes retain exactly six digits', () => {
  for (let i = 0; i < 100; i++) assertEquals(sixDigitCode().length, 6);
});

Deno.test('email verification keeps its four-digit nonzero format', () => {
  for (let i = 0; i < 100; i++) assertMatch(fourDigitCode(), /^[1-9]\d{3}$/);
});

Deno.test('withdrawal verification keeps its five-digit nonzero format', () => {
  for (let i = 0; i < 100; i++) assertMatch(fiveDigitCode(), /^[1-9]\d{4}$/);
});