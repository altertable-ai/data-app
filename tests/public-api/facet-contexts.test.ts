import { createDataHooks, searchVariable } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  parseFacetOptions,
  type DataOperation,
  type DimensionOption,
} from '@altertable/data-app/contract';
import { expect, test } from 'vitest';

type Operations = {
  options: DataOperation<{ search: string }, DimensionOption<number>[]>;
};
const hooks = createDataHooks(createDataClient<Operations>());
const search = searchVariable({ key: 'search' });
const filter = hooks.defineFacetFilter({
  key: 'number',
  label: 'Number',
  valueType: 'number',
  selectionMode: 'single',
  facet: {
    context: { search },
    operation: 'options',
    input: values => ({ search: values.search }),
  },
});

test('facet result boundaries retain typed option, count, and uniqueness validation', () => {
  expect(
    parseFacetOptions([{ value: 0, label: 'Zero', count: 0 }], filter)
  ).toEqual([{ value: 0, label: 'Zero', count: 0 }]);
  for (const result of [
    null,
    [{ value: '0', label: 'Zero' }],
    [{ value: 0, label: '' }],
    [{ value: 0, label: 'Zero', count: -1 }],
    [{ value: 0, label: 'Zero', count: 0.5 }],
    [
      { value: 0, label: 'Zero' },
      { value: 0, label: 'Duplicate' },
    ],
    Array.from({ length: 201 }, (_, value) => ({
      value,
      label: String(value),
    })),
  ])
    expect(() => parseFacetOptions(result, filter)).toThrow();
});
