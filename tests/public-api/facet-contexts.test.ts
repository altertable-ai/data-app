import { createDataClient } from '@altertable/data-app/client';
import {
  defineOperation,
  facetFilter,
  parseFacetOptions,
  searchFilter,
  type DimensionOption,
} from '@altertable/data-app/contract';
import { expect, test } from 'vitest';

const filter = facetFilter({
  key: 'number',
  label: 'Number',
  valueType: 'number',
  selectionMode: 'single',
  options: 'options',
});
const policy = { maxQueryRows: 1, maxDurationMs: 1000 };
const lakehouse = {
  async queryAll() {
    return { columns: [], rows: [] };
  },
};

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

test('a facet filter loads its options from a registered operation', async () => {
  const search = searchFilter({ key: 'search' });
  const options = defineOperation({
    queries: {},
    filters: { search },
    policy,
    async run(_, input): Promise<DimensionOption<number>[]> {
      return [{ value: input.search.length, label: input.search }];
    },
  });
  const metric = defineOperation({
    queries: {},
    filters: { search, number: filter },
    policy,
    async run() {
      return 1;
    },
  });
  const client = createDataClient({
    operations: { options, metric },
    lakehouse,
  });
  expect(client.filters).toEqual({
    options: { search },
    metric: { search, number: filter },
  });
  expect((await client.query('options', { search: 'abc' })).data).toEqual([
    { value: 3, label: 'abc' },
  ]);
  expect(() =>
    // @ts-expect-error The options operation must be registered.
    createDataClient({ operations: { metric }, lakehouse })
  ).toThrow(
    'Facet filter Number loads options from an unregistered operation: options.'
  );
});
