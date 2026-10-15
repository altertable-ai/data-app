import { expect, test } from 'vitest';
import { defineDataApp } from '@altertable/data-app';
import {
  hierarchyVariable,
  type Lakehouse,
} from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';
import { createDataHandler } from '@altertable/data-app/server';

const geography = hierarchyVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      options: [
        { value: 'eu', label: 'Europe' },
        { value: 'us', label: 'America' },
      ],
    },
    {
      id: 'customer',
      label: 'Customer',
      valueType: 'number',
      options: [
        { value: 1, label: 'One', parent: 'eu' },
        { value: 2, label: 'Two', parent: 'us' },
      ],
    },
    {
      id: 'order',
      label: 'Order',
      valueType: 'number',
      options: [{ value: 10, label: 'Ten', parent: 1 }],
    },
  ],
});
test('typed static hierarchy selections round trip and parent transitions clear descendants', () => {
  const selected = geography.transition(geography.defaultValue, {
    region: 'eu',
    customer: 1,
    order: 10,
  });
  expect(geography.describe!(selected)).toBe('Europe / One / Ten');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(geography.write(selected)))
    if (value !== null) params.set(key, value);
  expect(geography.read(params)).toEqual(selected);
  expect(geography.transition(selected, { region: 'us' })).toEqual({
    selection: {
      region: { kind: 'include', members: [{ kind: 'value', value: 'us' }] },
      customer: { kind: 'all' },
      order: { kind: 'all' },
    },
  });
  expect(
    geography.transition(selected, { customer: null }).selection.order
  ).toEqual({ kind: 'all' });
  expect(() =>
    geography.transition(selected, { region: 'us', customer: 1 })
  ).toThrow('Invalid Geography');
  expect(() =>
    geography.transition(geography.defaultValue, { customer: 1 })
  ).toThrow('Invalid Geography');
  expect(() =>
    geography.parse({
      selection: {
        region: { kind: 'include', members: [{ kind: 'missing' }] },
      },
    })
  ).toThrow();
});
test('chart breakdowns normalize independently against shared population', () => {
  const revenue = geography.breakdown({ key: 'revenue-by' });
  const orders = geography.breakdown({ key: 'orders-by' });
  expect(revenue.level('order', geography.defaultValue).id).toBe('order');
  expect(orders.level('region', geography.defaultValue).id).toBe('region');
  const selected = geography.transition(geography.defaultValue, {
    region: 'eu',
  });
  expect(orders.level('region', selected).id).toBe('region');
  expect(revenue.level('order', selected).id).toBe('order');
});

function sourceApp() {
  const app = defineDataApp({
    title: 'Sales',
    description: 'Sales',
    scope: { organization: 'Example', environment: 'test' },
    queries: {
      regions: {
        statement:
          'SELECT region AS value, region AS label FROM regions WHERE ($member IS NULL OR region = $member)',
        params: { member: {} },
      },
      customers: {
        statement:
          'SELECT id AS value, name AS label FROM customers WHERE region = $regionId AND tenant = $tenant AND ($member IS NULL OR id = $member)',
        params: { regionId: {}, member: {}, tenant: {} },
      },
      business: { statement: 'SELECT sales FROM sales', params: {} },
    },
  });
  const hierarchy = app.defineHierarchy({
    key: 'geography',
    label: 'Geography',
    levels: [
      {
        id: 'region',
        label: 'Region',
        valueType: 'string',
        source: { query: 'regions' },
      },
      {
        id: 'customer',
        label: 'Customer',
        valueType: 'number',
        source: { query: 'customers', parents: { regionId: 'region' } },
      },
    ],
  });
  const revenueBy = hierarchy.breakdown({ key: 'revenue-by' });
  const parse = hierarchy.input(() => ({}), { breakdowns: { revenueBy } });
  const input = {
    geography: hierarchy.transition(hierarchy.defaultValue, {
      region: 'eu',
      customer: 999,
    }),
    revenueBy: 'customer' as const,
  };
  const operations = {
    sales: app.defineOperation({
      input: parse,
      checks: [input],
      policy: { maxDurationMs: 1000, maxQueryRows: 200 },
      async run({ query }) {
        return (await query('business')).rows;
      },
    }),
  };
  return { app, hierarchy, input, operations };
}

test('source validation runs exact lookups in parent order and discloses them before the business query', async () => {
  const { operations, input } = sourceApp();
  const calls: string[] = [];
  const lakehouse: Lakehouse = {
    async queryAll(statement, { params, limit }) {
      if (statement.includes('FROM regions')) {
        calls.push('region');
        expect(params).toEqual({ member: 'eu' });
        expect(limit).toBe(2);
        return {
          columns: [{ name: 'value' }, { name: 'label' }],
          rows: [['eu', 'Europe']],
        };
      }
      if (statement.includes('FROM customers')) {
        calls.push('customer');
        expect(params).toEqual({
          member: 999,
          regionId: 'eu',
          tenant: 'trusted',
        });
        return {
          columns: [{ name: 'value' }, { name: 'label' }],
          rows: [[999, 'Beyond first page']],
        };
      }
      calls.push('business');
      return { columns: [{ name: 'sales' }], rows: [[10]] };
    },
  };
  const handler = createDataHandler(operations, async () => ({
    lakehouse,
    queryParams: { tenant: 'trusted' },
  }));
  const response = await handler(
    new Request('http://localhost/api/data/sales', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(calls).toEqual(['region', 'customer', 'business']);
  expect(body.queries.map((query: { name: string }) => query.name)).toEqual([
    'regions',
    'customers',
    'business',
  ]);
});

test('invalid memberships and failed lookups prevent business execution', async () => {
  const { operations, input } = sourceApp();
  for (const fail of [false, true]) {
    let business = false;
    const client = createDataClient({
      operations,
      lakehouse: {
        async queryAll(statement) {
          if (statement.includes('FROM regions')) {
            if (fail) throw new Error('Lookup failed');
            return {
              columns: [{ name: 'value' }, { name: 'label' }],
              rows: [],
            };
          }
          business = true;
          throw new Error('Must not run');
        },
      },
    });
    await expect(client.query('sales', input)).rejects.toMatchObject({
      code: fail ? 'query_failed' : 'invalid_input',
    });
    expect(business).toBe(false);
  }
});

test('source declarations require member and the immediate parent binding', () => {
  const { app } = sourceApp();
  expect(() =>
    app.defineHierarchy({
      key: 'bad',
      label: 'Bad',
      levels: [
        {
          id: 'region',
          label: 'Region',
          valueType: 'string',
          source: { query: 'business' },
        },
      ],
    })
  ).toThrow('declare member');
  expect(() =>
    app.defineHierarchy({
      key: 'bad',
      label: 'Bad',
      levels: [
        {
          id: 'region',
          label: 'Region',
          valueType: 'string',
          source: { query: 'regions' },
        },
        {
          id: 'customer',
          label: 'Customer',
          valueType: 'number',
          source: { query: 'customers' },
        },
      ],
    })
  ).toThrow('immediate parent');
});

test('invalid child membership under a valid parent is rejected before the business query', async () => {
  const { operations, input } = sourceApp();
  const calls: string[] = [];
  const handler = createDataHandler(operations, async () => ({
    queryParams: { tenant: 'trusted' },
    lakehouse: {
      async queryAll(statement) {
        if (statement.includes('FROM regions')) {
          calls.push('regions');
          return {
            columns: [{ name: 'value' }, { name: 'label' }],
            rows: [['eu', 'Europe']],
          };
        }
        if (statement.includes('FROM customers')) {
          calls.push('customers');
          return { columns: [{ name: 'value' }, { name: 'label' }], rows: [] };
        }
        calls.push('business');
        return { columns: [], rows: [] };
      },
    },
  }));
  const response = await handler(
    new Request('http://localhost/api/data/sales', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
  expect(response.status).toBe(400);
  expect(calls).toEqual(['regions', 'customers']);
});

test('cancellation during a membership lookup prevents late business execution', async () => {
  const { operations, hierarchy, input } = sourceApp();
  let completeLookup: (() => void) | undefined;
  let startLookup: (() => void) | undefined;
  const started = new Promise<void>(resolve => {
    startLookup = resolve;
  });
  let business = false;
  const client = createDataClient({
    operations,
    lakehouse: {
      async queryAll(statement) {
        if (statement.includes('FROM regions')) {
          startLookup!();
          await new Promise<void>(resolve => {
            completeLookup = resolve;
          });
          return {
            columns: [{ name: 'value' }, { name: 'label' }],
            rows: [['eu', 'Europe']],
          };
        }
        business = true;
        return { columns: [], rows: [] };
      },
    },
  });
  const controller = new AbortController();
  const request = client.query(
    'sales',
    {
      ...input,
      geography: hierarchy.transition(hierarchy.defaultValue, { region: 'eu' }),
    },
    { signal: controller.signal }
  );
  const rejected = expect(request).rejects.toBeDefined();
  await started;
  controller.abort();
  await rejected;
  completeLookup!();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(business).toBe(false);
});

test('HTTP automatically registers authorized selectors and exact selected labels separately from options', async () => {
  const { operations, hierarchy } = sourceApp();
  let authorized = 0;
  let queried = 0;
  const handler = createDataHandler(operations, async () => {
    authorized++;
    return {
      queryParams: { tenant: 'trusted' },
      lakehouse: {
        async queryAll(statement, { params, limit }) {
          queried++;
          if (statement.includes('FROM regions'))
            return {
              columns: [{ name: 'value' }, { name: 'label' }],
              rows: [['eu', 'Europe']],
            };
          expect(params).toEqual({
            regionId: 'eu',
            member: 999,
            tenant: 'trusted',
          });
          expect(limit).toBe(2);
          return {
            columns: [{ name: 'value' }, { name: 'label' }],
            rows: [[999, 'Beyond first page']],
          };
        },
      },
    };
  });
  // Generated controls request this selector without adding it to the author's operation registry.
  const response = await handler(
    new Request(
      'http://localhost/api/data/__hierarchy%3Ageography%3Acustomer',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: hierarchy.transition(hierarchy.defaultValue, { region: 'eu' }),
          member: 999,
        }),
      }
    )
  );
  expect(response.status).toBe(200);
  expect((await response.json()).data).toEqual([
    { value: 999, label: 'Beyond first page' },
  ]);
  expect(authorized).toBe(1);
  expect(queried).toBe(2);
});
