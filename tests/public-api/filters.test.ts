import { expect, test } from 'vitest';
import {
  searchVariable,
  choiceVariable,
  multiChoiceVariable,
} from '@altertable/data-app/react';
import {
  numberFilter,
  booleanFilter,
  parseNumberSelection,
  parseBooleanSelection,
  dimensionFilter,
  dimensionPredicate,
} from '@altertable/data-app/contract';

const options = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];
test('labeled choices validate defaults and selections and canonicalize URL state', () => {
  expect(() => numberFilter({ key: '', label: 'Amount' })).toThrow();
  expect(() => booleanFilter({ key: '', label: 'Active' })).toThrow();
  const single = choiceVariable({ key: 'choice', options, defaultValue: 'a' });
  expect(single.describe?.('b')).toBe('Beta');
  expect(single.read(new URLSearchParams('choice=unknown'))).toBe('a');
  expect(single.read(new URLSearchParams('choice=b'))).toBe('b');
  expect(() =>
    choiceVariable({ key: 'choice', options, defaultValue: 'unknown' })
  ).toThrow();
  expect(() =>
    choiceVariable({
      key: 'choice',
      options: [options[0]!, options[0]!],
      defaultValue: 'a',
    })
  ).toThrow();
  const multiple = multiChoiceVariable({ key: 'tags', options });
  expect(multiple.write(['b', 'a'])).toEqual({ tags: '["a","b"]' });
  expect(multiple.same(['b', 'a'], ['a', 'b'])).toBe(true);
  expect(multiple.read(new URLSearchParams({ tags: '["a","a"]' }))).toEqual([]);
  expect(multiple.read(new URLSearchParams({ tags: '["unknown"]' }))).toEqual(
    []
  );
  expect(
    multiple.read(
      new URLSearchParams(multiple.write(['b']) as Record<string, string>)
    )
  ).toEqual(['b']);
  const search = searchVariable({ key: 'q', defaultValue: 'default' });
  expect(search.clearValue).toBe('');
  expect(
    search.read(new URLSearchParams(search.write('') as Record<string, string>))
  ).toBe('');
});

test('numeric filters preserve zero and open ranges, validate at the server boundary, and distinguish clear from reset', () => {
  const filter = numberFilter({
    key: 'amount',
    label: 'Amount',
    min: 0,
    max: 100,
    defaultValue: { kind: 'range', min: 10 },
  });
  for (const value of [
    { kind: 'all' },
    { kind: 'range', min: 0 },
    { kind: 'range', max: 2.5 },
    { kind: 'comparison', operator: 'ne', value: 0 },
  ] as const) {
    expect(parseNumberSelection(value, filter)).toEqual(value);
    expect(
      filter.read(
        new URLSearchParams(filter.write(value) as Record<string, string>)
      )
    ).toEqual(value);
  }
  for (const value of [
    { kind: 'range' },
    { kind: 'range', min: 10, max: 1 },
    { kind: 'range', min: -1 },
    { kind: 'comparison', operator: 'eq', value: Infinity },
    { kind: 'comparison', operator: ['eq'], value: 1 },
    { kind: 'comparison', operator: 'sql', value: 1 },
  ])
    expect(() => parseNumberSelection(value, filter)).toThrow();
  expect(filter.read(new URLSearchParams('amount=bad'))).toEqual(
    filter.defaultValue
  );
  expect(
    filter.read(
      new URLSearchParams(
        filter.write(filter.clearValue!) as Record<string, string>
      )
    )
  ).toEqual({ kind: 'all' });
});

test('boolean filters round trip unrestricted, false, and true without conflating clear and configured defaults', () => {
  const filter = booleanFilter({
    key: 'active',
    label: 'Active',
    defaultValue: { kind: 'is', value: true },
  });
  for (const value of [
    { kind: 'all' },
    { kind: 'is', value: false },
    { kind: 'is', value: true },
  ] as const) {
    expect(parseBooleanSelection(value, filter)).toEqual(value);
    expect(
      filter.read(
        new URLSearchParams(filter.write(value) as Record<string, string>)
      )
    ).toEqual(value);
  }
  expect(() =>
    parseBooleanSelection({ kind: 'is', value: 'false' }, filter)
  ).toThrow();
  expect(filter.read(new URLSearchParams('active=bad'))).toEqual(
    filter.defaultValue
  );
});

test('categorical exclusion explicitly handles missing records and survives URL serialization', () => {
  const filter = dimensionFilter<string>({
    key: 'country',
    label: 'Country',
    valueType: 'string',
    selectionMode: 'multiple',
    allowMissing: true,
    allowExclusion: true,
    options: [{ value: "O'Brien", label: 'Named country' }],
  });
  const selected = {
    kind: 'exclude',
    members: [{ kind: 'value', value: "O'Brien" }],
  } as const;
  expect(
    filter.read(
      new URLSearchParams(filter.write(selected) as Record<string, string>)
    )
  ).toEqual(selected);
  expect(dimensionPredicate('country', selected, ['country'])).toBe(
    "(country IS NULL OR NOT (country IN ('O''Brien')))"
  );
  expect(
    dimensionPredicate(
      'country',
      { kind: 'exclude', members: [{ kind: 'missing' }] },
      ['country']
    )
  ).toBe('NOT (country IS NULL)');
  const inclusionOnly = dimensionFilter({
    key: 'country',
    label: 'Country',
    valueType: 'string',
    selectionMode: 'single',
    options: [{ value: 'FR', label: 'France' }],
  });
  expect(
    inclusionOnly.read(new URLSearchParams({ country: '["invalid"]' }))
  ).toEqual({ kind: 'all' });
  expect(
    inclusionOnly.read(new URLSearchParams({ country: '[["v","FR"]]' }))
  ).toEqual({ kind: 'include', members: [{ kind: 'value', value: 'FR' }] });
  expect(
    inclusionOnly.valid({
      kind: 'exclude',
      members: [{ kind: 'value', value: 'FR' }],
    })
  ).toBe(false);
});
