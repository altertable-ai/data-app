import { expect, test } from 'vitest';
import { defineDataApp } from '@altertable/data-app';
import { variableInput, type Lakehouse } from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';
import { createDataHandler } from '@altertable/data-app/server';

function sourceApp(mode: 'single' | 'multiple' = 'single') {
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
          'SELECT id AS value, name AS label FROM customers WHERE tenant = $tenant AND ($member IS NULL OR id = $member)',
        params: { member: {}, tenant: { defaultValue: 'public' } },
      },
      business: { statement: 'SELECT sales FROM sales', params: {} },
    },
  });
  const region = app.defineDimension({
    key: 'region',
    label: 'Region',
    selectionMode: 'single',
    valueType: 'string',
    source: { query: 'regions' },
  });
  const customer = app.defineDimension({
    key: 'customer',
    label: 'Customer',
    selectionMode: mode,
    allowExclusion: true,
    valueType: 'number',
    source: { query: 'customers' },
  });
  const parse = variableInput(() => ({}), { region, customer });
  const input = {
    region: { kind: 'all' } as const,
    customer: {
      kind: 'include' as const,
      members: [{ kind: 'value' as const, value: 999 }],
    },
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
  return { app, region, customer, input, operations };
}

test('a selected customer validates independently and discloses its exact lookup before the business query', async () => {
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
  expect(calls).toEqual(['customer', 'business']);
  expect(body.queries.map((query: { name: string }) => query.name)).toEqual([
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
          if (statement.includes('FROM customers')) {
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

test('source declarations require an exact lookup parameter', () => {
  const { app } = sourceApp();
  expect(() =>
    app.defineDimension({
      key: 'bad',
      label: 'Bad',
      valueType: 'string',
      selectionMode: 'single',
      source: { query: 'business' },
    })
  ).toThrow('declare member');
});

test('invalid independent membership is rejected before the business query', async () => {
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
  expect(calls).toEqual(['customers']);
});

test('cancellation during a membership lookup prevents late business execution', async () => {
  const { operations, input } = sourceApp();
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
        if (statement.includes('FROM customers')) {
          startLookup!();
          await new Promise<void>(resolve => {
            completeLookup = resolve;
          });
          return {
            columns: [{ name: 'value' }, { name: 'label' }],
            rows: [[999, 'Beyond first page']],
          };
        }
        business = true;
        return { columns: [], rows: [] };
      },
    },
  });
  const controller = new AbortController();
  const request = client.query('sales', input, { signal: controller.signal });
  const rejected = expect(request).rejects.toBeDefined();
  await started;
  controller.abort();
  await rejected;
  completeLookup!();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(business).toBe(false);
});

test('HTTP automatically registers authorized selectors and exact selected labels separately from options', async () => {
  const { operations } = sourceApp();
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
    new Request('http://localhost/api/data/__dimension%3Acustomer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        member: 999,
      }),
    })
  );
  expect(response.status).toBe(200);
  expect((await response.json()).data).toEqual([
    { value: 999, label: 'Beyond first page' },
  ]);
  expect(authorized).toBe(1);
  expect(queried).toBe(1);
});

for (const kind of ['include', 'exclude'] as const) {
  test(`every ${kind} member validates independently before business execution`, async () => {
    const { operations, input } = sourceApp('multiple');
    const calls: (number | string)[] = [];
    const client = createDataClient({
      operations,
      lakehouse: {
        async queryAll(statement, { params }) {
          if (statement.includes('FROM customers')) {
            calls.push(params!.member as number);
            return {
              columns: [{ name: 'value' }, { name: 'label' }],
              rows: [[params!.member, `Customer ${params!.member}`]],
            };
          }
          calls.push('business');
          return { columns: [], rows: [] };
        },
      },
    });
    await client.query('sales', {
      ...input,
      customer: {
        kind,
        members: [
          { kind: 'value', value: 999 },
          { kind: 'value', value: 1000 },
        ],
      },
    });
    expect(calls).toEqual([999, 1000, 'business']);
  });
}

test('malformed selections fail at the parser boundary', () => {
  const { operations, input } = sourceApp();
  for (const members of [
    [null],
    [{ kind: 'value', value: 'wrong type' }],
    [{ kind: 'missing' }],
  ])
    expect(() =>
      operations.sales.input({
        ...input,
        customer: { kind: 'include', members },
      })
    ).toThrow('Invalid Customer');
});

test('composed parsers retain source validation and reject replacement variables', () => {
  const { operations, region, customer } = sourceApp();
  expect(() =>
    variableInput(operations.sales.input, { customer, region })
  ).not.toThrow();
  const other = sourceApp().customer;
  expect(() =>
    variableInput(operations.sales.input, { customer: other })
  ).toThrow('already declared');
});
