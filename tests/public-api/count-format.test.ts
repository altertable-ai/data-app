import { formatCount, formatMetric } from '@altertable/data-app/format';
import { expect, test } from 'vitest';

test('count metrics format fractional averages with the requested locale', () => {
  expect(formatMetric(1750.25, { kind: 'count' })).toBe('1,750.25');
  expect(formatCount(1750.25, { locale: 'de-DE' })).toBe('1.750,25');
});

test('counts retain integer, compact, and missing-value formatting', () => {
  expect(formatCount(1750)).toBe('1,750');
  expect(formatCount(-0)).toBe('0');
  expect(formatCount(1750.25, { compact: true })).toBe('1.8K');
  for (const value of [null, undefined, NaN, Infinity, -Infinity, -0.25]) {
    expect(formatCount(value)).toBe('—');
    expect(formatCount(value, { missing: 'Unknown' })).toBe('Unknown');
  }
});
