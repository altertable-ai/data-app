import { expect, test } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatDateRange,
  parseDateTime,
} from '@altertable/data-app/format';

test('calendar dates stay calendar dates and reject impossible days', () => {
  expect(formatDate('2026-09-24', { locale: 'en-GB' })).toBe('24 Sept 2026');
  expect(formatDate('2024-02-29')).toBe('Feb 29, 2024');
  for (const date of [
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-09-24T00:00:00Z',
  ])
    expect(formatDate(date)).toBe('—');
  expect(formatDate(null, { missing: 'Unknown' })).toBe('Unknown');
  expect(formatDateRange({ start: '2026-02-30', end: '2026-03-01' })).toBe('—');
});

test('timestamps require an explicit offset and preserve exact instants', () => {
  expect(parseDateTime('2026-09-24T17:00:05+02:00')?.toISOString()).toBe(
    '2026-09-24T15:00:05.000Z'
  );
  for (const value of [
    '2026-09-24 15:00:05',
    '2026-09-24T15:00:05',
    '2026-02-30T15:00:05Z',
    '2026-09-24T25:00:00Z',
  ]) {
    expect(parseDateTime(value)).toBeNull();
    expect(formatDateTime(value)).toBe('—');
  }
  expect(parseDateTime(new Date('invalid'))).toBeNull();
  expect(parseDateTime(Infinity)).toBeNull();
});

test('shared timestamp formats apply locale, zone, precision and daylight saving', () => {
  const options = {
    locale: 'en-GB',
    timeZone: 'America/New_York',
    precision: 'second' as const,
  };
  expect(formatDateTime('2026-09-24T15:00:05Z', options)).toBe(
    '24 Sept 2026, 11:00:05'
  );
  expect(formatTime('2026-09-24T15:00:05Z', options)).toBe('11:00:05');
  expect(formatTime('2026-03-08T06:59:00Z', options)).toBe('01:59:00');
  expect(formatTime('2026-03-08T07:00:00Z', options)).toBe('03:00:00');
  expect(formatTime('2026-09-24T00:00:00Z')).toBe('00:00');
  expect(formatDateTime('2026-09-24T15:00:05Z', { timeZone: 'invalid' })).toBe(
    '—'
  );
});
