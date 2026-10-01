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
  for (const value of [undefined, null, [], 'invalid', { theme: 'invalid' }])
    expect(parseAppearance(value)).toEqual(normalizeAppearance());
});

test('invalid appearance fields fall back without discarding supported settings', () => {
  const defaults = normalizeAppearance();
  expect(
    parseAppearance({
      theme: 'dark',
      baseColor: 'invalid',
      accentColor: 'invalid',
      darkAccentColor: 42,
      chartColors: ['invalid'],
      density: 'compact',
      cornerRadius: 'invalid',
      elevation: null,
      typography: { body: ';invalid', heading: 'Georgia' },
    })
  ).toEqual({
    ...defaults,
    theme: 'dark',
    density: 'compact',
    typography: { body: defaults.typography.body, heading: 'Georgia' },
  });
  expect(parseAppearance({ typography: null }).typography).toEqual(
    defaults.typography
  );
  for (const chartColors of [[], Array(9).fill('#112233'), null])
    expect(parseAppearance({ chartColors }).chartColors).toEqual(
      defaults.chartColors
    );
  expect(
    parseAppearance({ accentColor: '#112233', darkAccentColor: 'invalid' })
  ).toMatchObject({
    accentColor: '#112233',
    darkAccentColor: undefined,
  });
});
