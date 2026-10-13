import { expect, test } from 'vitest';
import {
  breakdownVariable,
  parseBreakdownPath,
} from '@altertable/data-app/contract';

test('hierarchy paths validate level order and stable identity while deriving the grouping', () => {
  const geography = breakdownVariable({
    key: 'geography',
    label: 'Geography',
    levels: [
      { id: 'region', label: 'Regions' },
      { id: 'country', label: 'Countries' },
      { id: 'customer', label: 'Customers' },
    ],
  });
  const europe = [{ level: 'region', id: 'eu', label: 'Europe' }];
  const france = [...europe, { level: 'country', id: 'fr', label: 'France' }];
  expect(geography.level([]).id).toBe('region');
  expect(geography.level(europe).id).toBe('country');
  expect(geography.level(france).id).toBe('customer');
  expect(parseBreakdownPath(france, geography)).toEqual(france);
  expect(
    geography.same(europe, [{ ...europe[0]!, label: 'European market' }])
  ).toBe(true);
  expect(geography.same(europe, [{ ...europe[0]!, id: 'na' }])).toBe(false);
  expect(() => parseBreakdownPath([france[1]], geography)).toThrow(
    'level order'
  );
  expect(() =>
    parseBreakdownPath(
      [...france, { level: 'customer', id: 'account-1', label: 'Account 1' }],
      geography
    )
  ).toThrow('grouping level');
  expect(() =>
    parseBreakdownPath([{ ...europe[0], id: NaN }], geography)
  ).toThrow('ID');
  expect(() =>
    parseBreakdownPath([{ ...europe[0], label: 'x'.repeat(257) }], geography)
  ).toThrow('bounded');
});
