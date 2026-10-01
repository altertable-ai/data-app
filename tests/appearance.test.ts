import { expect, test } from 'bun:test';
import {
  normalizeAppearance,
  parseAppearance,
} from '@altertable/data-app/appearance';

test('appearance defaults merge typed overrides and ignore unrelated parsed fields', () => {
  const settings = normalizeAppearance({ typography: { heading: 'Georgia' } });
  expect(settings.typography).toEqual({ body: 'system', heading: 'Georgia' });
  settings.chartColors.length = 0;
  expect(normalizeAppearance().chartColors.length).toBeGreaterThan(0);
  expect(
    parseAppearance({
      theme: 'dark',
      future: true,
      typography: { future: true },
    }).theme
  ).toBe('dark');
  expect(() => parseAppearance(null)).toThrow('Invalid appearance');
  expect(() => parseAppearance({ theme: 'invalid' })).toThrow(
    'Invalid appearance'
  );
});
