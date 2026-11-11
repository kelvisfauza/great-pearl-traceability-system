import { expect, test } from 'bun:test';
import { scaledDuration } from './useDisplayTvSettings';
test('faster speed shortens slides', () => { expect(scaledDuration(16000, 2)).toBe(8000); });
test('slides never go below 4 seconds', () => { expect(scaledDuration(9000, 5)).toBe(4000); });
