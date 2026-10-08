import { expect, test } from 'vitest';
import { defineDataApp } from '@altertable/data-app/config';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineOperation,
  parseEmptyInput,
  type Lakehouse,
  type QueryDefinitions,
  type QueryParameters,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';

const dataApp = defineDataApp({
  title: 'Products',
  scope: { organization: 'demo', environment: 'test' },
  appearance: { theme: 'system' },
  queries: {
    products: {
      statement: 'SELECT * FROM products WHERE org_id = $orgId LIMIT $limit',
      params: { orgId: {}, limit: { defaultValue: 10 } },
    },
  },
});

function products(values: Record<string, unknown> = {}) {
  return dataApp.defineOperation({
    input: parseEmptyInput,
    output: (value: unknown) => value,
    checks: [{}],
    policy: { maxQueryRows: 20, maxDurationMs: 1000 },
    async run({ query }) {
      return query('products', values);
    },
  });
}

type DeliveredQuery = { statement: string; params?: QueryParameters };

function source(statements: DeliveredQuery[]): Lakehouse {
  return {
    async queryAll(statement, { limit, params }) {
      statements.push({ statement, params });
      expect(limit).toBe(20);
      return {
        columns: [{ name: 'org_id' }],
        rows: [['org-1']],
        queryId: 'q1',
      };
    },
  };
}

test('config queries execute defaults and overrides with shared browser and HTTP evidence', async () => {
  const statements: DeliveredQuery[] = [];
  const operations = { products: products({ orgId: 'org-1' }) };
  expect(operations.products.queryNames).toEqual({ products: 'products' });
  const browser = createDataClient({
    operations,
    lakehouse: source(statements),
  });
  const result = await browser.query('products', {});
  expect(result.queries).toEqual([
    {
      name: 'products',
      statement: dataApp.config.queries.products.statement,
      params: { orgId: 'org-1', limit: 10 },
      queryId: 'q1',
    },
  ]);
  const handler = createDataHandler(operations, async () => ({
    lakehouse: source(statements),
  }));
  const response = await handler(
    new Request('http://localhost/api/data/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    queries: result.queries,
    data: result.data,
  });
  const overridden = createDataClient({
    operations: { products: products({ orgId: 'org-1', limit: 5 }) },
    lakehouse: source(statements),
  });
  await overridden.query('products', {});
  expect(statements).toEqual([
    {
      statement: dataApp.config.queries.products.statement,
      params: { orgId: 'org-1', limit: 10 },
    },
    {
      statement: dataApp.config.queries.products.statement,
      params: { orgId: 'org-1', limit: 10 },
    },
    {
      statement: dataApp.config.queries.products.statement,
      params: { orgId: 'org-1', limit: 5 },
    },
  ]);
});

test('query failures reject missing, extra, invalid, and inherited parameters before source execution', async () => {
  const statements: DeliveredQuery[] = [];
  for (const values of [
    {},
    { orgId: 'org-1', days: 7 },
    { orgId: undefined },
    { orgId: [] },
    { orgId: 'org-1', limit: NaN },
    Object.create({ orgId: 'org-1' }) as Record<string, unknown>,
  ]) {
    const client = createDataClient({
      operations: { products: products(values) },
      lakehouse: source(statements),
    });
    await expect(client.query('products', {})).rejects.toMatchObject({
      code: 'query_failed',
    });
  }
  expect(statements).toEqual([]);
});

test('HTTP authorization supplies protected parameter values and callers cannot override them', async () => {
  const statements: DeliveredQuery[] = [];
  for (const values of [{}, { orgId: 'other-org' }]) {
    const handler = createDataHandler(
      { products: products(values) },
      async () => ({
        lakehouse: source(statements),

        queryParams: { orgId: 'org-1', environment: 'test' },
      })
    );
    const response = await handler(
      new Request('http://localhost/api/data/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
    );
    expect(response.status).toBe(Object.hasOwn(values, 'orgId') ? 502 : 200);
  }
  expect(statements).toEqual([
    {
      statement: dataApp.config.queries.products.statement,
      params: { orgId: 'org-1', limit: 10 },
    },
  ]);
});

test('registry validation checks declarations and defaults without interpreting SQL', () => {
  const malformed: QueryDefinitions[string][] = [
    { statement: '', params: {} },
    {
      statement: 'SELECT $value',
      params: { value: { defaultValue: Infinity } },
    },
  ];
  for (const query of malformed) {
    expect(() =>
      defineOperation({
        queries: { query },
        input: parseEmptyInput,
        output: (value: unknown) => value,
        checks: [{}],
        policy: { maxQueryRows: 20, maxDurationMs: 1000 },
        async run() {
          return true;
        },
      })
    ).toThrow();
  }
});

test('query delivery preserves SQL and parameter values for backend interpretation', async () => {
  const statement = `SELECT $text, $number, $boolean, $nullable, $text,
'$ignored', "column$ignored", $$ $ignored $$, $tag$ $ignored $tag$, E'escaped\\' $ignored'
-- $ignored
/* $ignored /* $ignored */ $ignored */`;
  const statements: DeliveredQuery[] = [];
  const operation = defineOperation({
    queries: {
      scalars: {
        statement,
        params: {
          text: {},
          number: { defaultValue: 0 },
          boolean: { defaultValue: false },
          nullable: { defaultValue: null },
        },
      },
    },
    input: parseEmptyInput,
    output: (value: unknown) => value,
    checks: [{}],
    policy: { maxQueryRows: 20, maxDurationMs: 1000 },
    async run({ query }) {
      return query('scalars', {
        text: "a'; DROP TABLE products; -- \\ $number",
      });
    },
  });
  await createDataClient({
    operations: { scalars: operation },
    lakehouse: source(statements),
  }).query('scalars', {});
  expect(statements).toEqual([
    {
      statement,
      params: {
        text: "a'; DROP TABLE products; -- \\ $number",
        number: 0,
        boolean: false,
        nullable: null,
      },
    },
  ]);
});

test('registered operation context exposes only named execution and rejects raw SQL and unknown names', async () => {
  const statements: DeliveredQuery[] = [];
  for (const raw of [true, false]) {
    const operation = dataApp.defineOperation({
      input: parseEmptyInput,
      output: (value: unknown) => value,
      checks: [{}],
      policy: { maxQueryRows: 20, maxDurationMs: 1000 },
      async run(context) {
        expect(context).not.toHaveProperty('lakehouse');

        if (raw) {
          // @ts-expect-error Registered queries do not accept SQL.
          return context.query('products', 'SELECT 1');
        }
        // @ts-expect-error Only declared names are accepted.
        return context.query('__proto__');
      },
    });
    await expect(
      createDataClient({
        operations: { products: operation },
        lakehouse: source(statements),
      }).query('products', {})
    ).rejects.toMatchObject({ code: 'query_failed' });
  }
  expect(statements).toEqual([]);
});

test('SQL placeholders and syntax are passed to the backend without inspection', async () => {
  const statements: DeliveredQuery[] = [];
  const definitions = {
    backendSyntax: {
      statement: "SELECT $backendOnly, $1, 'unterminated /* $value",
      params: { value: { defaultValue: 'raw\nvalue\0' } },
    },
  };
  const operation = defineOperation({
    queries: definitions,
    input: parseEmptyInput,
    output: (value: unknown) => value,
    checks: [{}],
    policy: { maxQueryRows: 20, maxDurationMs: 1000 },
    async run({ query }) {
      return query('backendSyntax');
    },
  });
  await createDataClient({
    operations: { query: operation },
    lakehouse: source(statements),
  }).query('query', {});
  expect(statements).toEqual([
    {
      statement: definitions.backendSyntax.statement,
      params: { value: 'raw\nvalue\0' },
    },
  ]);
});

test('app definitions keep their query registries independent', async () => {
  const firstApp = defineDataApp({
    title: 'First',
    scope: { organization: 'demo', environment: 'test' },
    appearance: {},
    queries: {
      count: {
        statement: 'SELECT $limit',
        params: { limit: { defaultValue: 3 } },
      },
    },
  });
  const secondApp = defineDataApp({
    title: 'Second',
    scope: { organization: 'demo', environment: 'test' },
    appearance: {},
    queries: {
      count: {
        statement: 'SELECT $limit + 1',
        params: { limit: { defaultValue: 7 } },
      },
    },
  });
  const statements: DeliveredQuery[] = [];
  for (const app of [firstApp, secondApp]) {
    const count = app.defineOperation({
      input: parseEmptyInput,
      output: (value: unknown) => value,
      checks: [{}],
      policy: { maxQueryRows: 20, maxDurationMs: 1000 },
      async run({ query }) {
        return query('count');
      },
    });
    await createDataClient({
      operations: { count },
      lakehouse: source(statements),
    }).query('count', {});
  }
  expect(statements).toEqual([
    { statement: 'SELECT $limit', params: { limit: 3 } },
    { statement: 'SELECT $limit + 1', params: { limit: 7 } },
  ]);
  expect(firstApp.config.title).toBe('First');
  expect(secondApp.config.title).toBe('Second');
});
