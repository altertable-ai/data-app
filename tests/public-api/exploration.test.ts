import { expect, test } from 'vitest';
import { explorationVariable } from '@altertable/data-app/contract';
const geography = explorationVariable({
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
test('exploration filters scope independently of grouping and clears descendants atomically', () => {
  const europe = geography.filter(geography.defaultValue, { region: 'Europe' });
  expect(europe.groupBy).toBe('region');
  const countries = geography.descend(europe, 'Europe');
  expect(countries.groupBy).toBe('country');
  const customers = geography.descend(countries, 'FR');
  const customer = geography.filter(customers, { customer: 42 });
  expect(customer.groupBy).toBe('customer');
  expect(geography.filter(customer, { region: 'Europe' })).toEqual(customer);
  const america = geography.filter(customer, { region: 'America' });
  expect(america.groupBy).toBe('country');
  expect(america.selection.country).toEqual({ kind: 'all' });
  expect(america.selection.customer).toEqual({ kind: 'all' });
  expect(geography.filter(customer, { region: null })).toEqual(
    geography.defaultValue
  );
  expect(geography.navigate(customer, 'region')).toEqual(europe);
});
test('exploration validates value types, ancestry, grouping and URL state', () => {
  const countries = geography.descend(geography.defaultValue, 'Europe');
  expect(() => geography.descend(countries, 'US')).toThrow('parent');
  expect(() => geography.parse({ ...countries, groupBy: 'unknown' })).toThrow(
    'Unknown'
  );
  expect(() =>
    geography.parse({ ...geography.defaultValue, groupBy: 'country' })
  ).toThrow('ancestors');
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
