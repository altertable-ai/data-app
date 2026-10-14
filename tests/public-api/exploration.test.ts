import { expect, test } from 'vitest';
import { hierarchyVariable } from '@altertable/data-app/contract';
const geography = hierarchyVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      groupLabel: 'Regions',
      valueType: 'string',
      options: [
        { value: 'Europe', label: 'Europe' },
        { value: 'America', label: 'America' },
      ],
    },
    {
      id: 'country',
      label: 'Country',
      groupLabel: 'Countries',
      valueType: 'string',
      options: [
        { value: 'FR', label: 'France', parent: 'Europe' },
        { value: 'US', label: 'United States', parent: 'America' },
      ],
    },
    {
      id: 'customer',
      label: 'Customer',
      groupLabel: 'Customers',
      valueType: 'number',
      options: [{ value: 42, label: 'Atelier', parent: 'FR' }],
    },
  ],
});
const revenueBy = geography.breakdown({ key: 'revenue-by' });
const ordersBy = geography.breakdown({ key: 'orders-by' });
test('shared hierarchy scope and independent chart breakdowns retain their ownership', () => {
  const france = geography.filter(geography.defaultValue, {
    region: 'Europe',
    country: 'FR',
    customer: 42,
  });
  expect(france).not.toHaveProperty('groupBy');
  expect(revenueBy.level('customer', france).id).toBe('customer');
  expect(ordersBy.level('region', france).id).toBe('region');
  const america = geography.filter(france, { region: 'America' });
  expect(america.selection.country).toEqual({ kind: 'all' });
  expect(america.selection.customer).toEqual({ kind: 'all' });
  expect(revenueBy.level('customer', america).id).toBe('country');
  expect(geography.filter(france, { region: null })).toEqual(
    geography.defaultValue
  );
  const params = new URLSearchParams({
    ...geography.write(france),
    ...revenueBy.write('customer'),
    ...ordersBy.write('region'),
  } as Record<string, string>);
  expect(revenueBy.read(params)).toBe('customer');
  expect(ordersBy.read(params)).toBe('region');
  expect(() => revenueBy.parse('unknown')).toThrow('Unknown');
});
test('exploration validates value types, ancestry, grouping and URL state', () => {
  const countries = geography.filter(geography.defaultValue, {
    region: 'Europe',
  });
  expect(() => geography.filter(countries, { country: 'US' })).toThrow(
    'parent'
  );
  expect(() => geography.filter(countries, { country: 'unknown' })).toThrow(
    'selection'
  );
  expect(() =>
    geography.parse({
      ...countries,
      selection: { ...countries.selection, extra: { kind: 'all' } },
    })
  ).toThrow('declared');
  expect(() =>
    geography.filter(countries, { country: null, customer: 42 })
  ).toThrow();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(geography.write(countries)))
    if (value) params.set(key, value);
  expect(geography.read(params)).toEqual(countries);
  expect(geography.write(geography.defaultValue)).toEqual({ geography: null });
  expect(geography.read(new URLSearchParams('geography=invalid'))).toEqual(
    geography.defaultValue
  );
});

test('selected parents reveal children without advancing grouping or losing deeper scope descriptions', () => {
  const root = geography.defaultValue;
  expect(geography.visibleLevels(root).map(level => level.id)).toEqual([
    'region',
  ]);
  const europe = geography.filter(root, { region: 'Europe' });
  expect(geography.visibleLevels(europe).map(level => level.id)).toEqual([
    'region',
    'country',
  ]);
  const france = geography.filter(europe, { country: 'FR' });
  expect(geography.visibleLevels(france).map(level => level.id)).toEqual([
    'region',
    'country',
    'customer',
  ]);
  const atelier = geography.filter(france, { customer: 42 });
  expect(geography.describe?.(atelier)).toContain('Country: France');
  expect(geography.describe?.(atelier)).toContain('Customer: Atelier');
  const cleared = geography.filter(atelier, { country: null });
  expect(cleared).toEqual(europe);
  expect(geography.visibleLevels(cleared).map(level => level.id)).toEqual([
    'region',
    'country',
  ]);
  expect(geography.filter(atelier, { region: null })).toEqual(root);
  expect(() =>
    geography.parse({
      ...root,
      selection: { ...root.selection, country: france.selection.country },
    })
  ).toThrow('ancestors');
});
