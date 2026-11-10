import { useAppFilters } from '@altertable/data-app-react/ui';
import {
  searchFilter,
  choiceFilter,
  multiChoiceFilter,
  dateRangeFilter,
  type FilterPresentation,
  numberFilter,
  booleanFilter,
  parseNumberSelection,
  parseBooleanSelection,
  dimensionFilter,
  dimensionPredicate,
  defineDateRangeContract,
} from '@altertable/data-app/contract';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

const options = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];

test('filter collections reject malformed presentation metadata from JavaScript callers', () => {
  for (const presentation of [
    null,
    [],
    { group: 'toolbar' },
    { prominence: 'hidden' },
  ]) {
    function App() {
      useAppFilters({
        choice: choiceFilter({
          key: 'choice',
          options,
          defaultValue: 'a',
          presentation: presentation as FilterPresentation,
        }),
      });
      return null;
    }
    expect(() => renderToStaticMarkup(createElement(App))).toThrow(
      'Filter choice has invalid presentation.'
    );
  }
});

test('presentation intent is retained by each filter constructor without changing URL values', () => {
  const presentation = { control: 'widget', prominence: 'secondary' } as const;
  const filters = [
    choiceFilter({ key: 'choice', options, defaultValue: 'a', presentation }),
    multiChoiceFilter({ key: 'tags', options, presentation }),
    numberFilter({ key: 'amount', label: 'Amount', presentation }),
    booleanFilter({ key: 'active', label: 'Active', presentation }),
    dimensionFilter<string>({
      key: 'country',
      label: 'Country',
      valueType: 'string',
      selectionMode: 'single',
      options: [{ value: 'FR', label: 'France' }],
      presentation,
    }),
    dateRangeFilter({
      key: 'period',
      contract: defineDateRangeContract({
        minDate: '2026-01-01',
        maxDate: '2026-01-31',
        maxRangeDays: 31,
        timeZone: 'UTC',
      }),
      defaultValue: { kind: 'dates', start: '2026-01-01', end: '2026-01-31' },
      presentation,
    }),
  ];
  for (const filter of filters) {
    expect(filter.presentation).toEqual(presentation);
    const value = filter.read(new URLSearchParams());
    expect(value).toEqual(filter.defaultValue);
  }
});

test('dimension limits remain validated for unchecked single selections and dynamic multiple selections', () => {
  const filter = {
    key: 'region',
    label: 'Region',
    valueType: 'string' as const,
    options: [],
  };
  expect(() =>
    // @ts-expect-error JavaScript callers can supply incompatible cardinality.
    dimensionFilter({ ...filter, selectionMode: 'single', maxSelected: 2 })
  ).toThrow('Dimension selection limit is invalid');
  for (const maxSelected of [0, 51, 1.5, Infinity, NaN]) {
    expect(() =>
      dimensionFilter({ ...filter, selectionMode: 'multiple', maxSelected })
    ).toThrow('Dimension selection limit is invalid');
  }
});
test('labeled choices validate defaults and selections and canonicalize URL state', () => {
  expect(() => numberFilter({ key: '', label: 'Amount' })).toThrow();
  expect(() => booleanFilter({ key: '', label: 'Active' })).toThrow();
  const single = choiceFilter({ key: 'choice', options, defaultValue: 'a' });
  expect(single.describe?.('b')).toBe('Beta');
  expect(single.read(new URLSearchParams('choice=unknown'))).toBe('a');
  expect(single.read(new URLSearchParams('choice=b'))).toBe('b');
  expect(() =>
    choiceFilter({ key: 'choice', options, defaultValue: 'unknown' })
  ).toThrow();
  expect(() =>
    choiceFilter({
      key: 'choice',
      options: [options[0]!, options[0]!],
      defaultValue: 'a',
    })
  ).toThrow();
  const multiple = multiChoiceFilter({ key: 'tags', options });
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
  const search = searchFilter({ key: 'q', defaultValue: 'default' });
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

test('a dimension starts from its default selection and records every other choice', () => {
  const status = dimensionFilter({
    key: 'status',
    label: 'Status',
    valueType: 'string',
    selectionMode: 'multiple',
    options: [
      { value: 'paid', label: 'Paid' },
      { value: 'refunded', label: 'Refunded' },
    ],
    defaultValue: {
      kind: 'include',
      members: [{ kind: 'value', value: 'paid' }],
    },
  });
  const none = new URLSearchParams();
  expect(status.read(none)).toEqual(status.defaultValue);
  expect(status.write(status.defaultValue)).toEqual({ status: null });
  // Every member is a deliberate choice that differs from the default.
  const all = new URLSearchParams(
    status.write({ kind: 'all' }) as Record<string, string>
  );
  expect(status.read(all)).toEqual({ kind: 'all' });
  expect(status.clearValue).toEqual({ kind: 'all' });
  expect(() =>
    dimensionFilter({
      key: 'status',
      label: 'Status',
      valueType: 'string',
      selectionMode: 'single',
      options: [{ value: 'paid', label: 'Paid' }],
      // Types reject members outside the options; JavaScript callers fail at runtime.
      defaultValue: {
        kind: 'include',
        members: [{ kind: 'value', value: 'pending' }],
      } as never,
    })
  ).toThrow('Invalid default selection for Status.');
});

test('a date range can start with its comparison on and readers can turn it off', () => {
  const contract = defineDateRangeContract({
    maxDate: '2026-03-31',
    maxRangeDays: 31,
    timeZone: 'UTC',
  });
  const period = dateRangeFilter({
    key: 'period',
    contract,
    comparison: true,
    defaultValue: { kind: 'preset', id: 'last-7', comparison: 'previous' },
  });
  expect(period.read(new URLSearchParams())).toEqual({
    kind: 'preset',
    id: 'last-7',
    comparison: 'previous',
  });
  const off = period.write({ kind: 'preset', id: 'last-7' });
  expect(off).toMatchObject({ compare: 'off' });
  expect(
    period.read(new URLSearchParams(off as Record<string, string>))
  ).toEqual({ kind: 'preset', id: 'last-7' });
  expect(period.input(period.defaultValue).comparison).not.toBeNull();
  expect(() =>
    dateRangeFilter({
      key: 'period',
      contract,
      defaultValue: { kind: 'preset', id: 'last-7', comparison: 'previous' },
    })
  ).toThrow(
    'Date filter period needs comparison: true to start with the comparison on.'
  );
});
