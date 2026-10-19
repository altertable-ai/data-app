import { defineDataApp } from '@altertable/data-app';
import {
  parseEmptyInput,
  type QueryParameters,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';
import { expect, test } from 'vitest';

const app = defineDataApp({
  title: 'Parameters',
  description: 'Resolve typed parameters from host, caller, and defaults.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    values: {
      statement: 'SELECT $search, $limit, $enabled, $region, $orgId',
      projections: { value: { type: 'number' } },
      params: {
        search: { type: 'string' },
        limit: { type: 'number', defaultValue: 10 },
        enabled: { type: 'boolean', defaultValue: false },
        region: {
          type: 'string',
          nullable: true,
          defaultValue: null,
        },
        orgId: { type: 'string' },
      },
    },
  },
});
async function execute(
  values: Record<string, unknown>,
  context: QueryParameters
) {
  const delivered: QueryParameters[] = [];
  const operation = app.defineOperation({
    input: parseEmptyInput,
    checks: [{}],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run({ query }) {
      // @ts-expect-error Exercise malformed input at the runtime boundary.
      return (await query('values', values)).rows;
    },
  });
  const handler = createDataHandler({ values: operation }, async () => ({
    queryParams: context,
    lakehouse: {
      async queryAll(_statement, { params }) {
        delivered.push(params!);
        return { columns: [{ name: 'value' }], rows: [[1]] };
      },
    },
  }));
  const response = await handler(
    new Request('https://app.example/api/data/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
  );
  return { status: response.status, delivered };
}

test('host values are protected and caller values and defaults preserve falsy values', async () => {
  expect(
    await execute(
      { search: '', limit: 0, enabled: false, region: null },
      {
        orgId: 'trusted',
        unrelated: 'ignored',
      }
    )
  ).toEqual({
    status: 200,
    delivered: [
      { search: '', limit: 0, enabled: false, region: null, orgId: 'trusted' },
    ],
  });
  expect(
    await execute(
      {
        search: 'text',
        limit: undefined,
        enabled: undefined,
        region: undefined,
      },
      { orgId: 'trusted' }
    )
  ).toEqual({
    status: 200,
    delivered: [
      {
        search: 'text',
        limit: 10,
        enabled: false,
        region: null,
        orgId: 'trusted',
      },
    ],
  });
});
test('malformed parameters and context overrides fail before SQL execution', async () => {
  for (const [values, context] of [
    [{}, { orgId: 'trusted' }],
    [{ search: 'text' }, {}],
    [{ search: 'text' }, { orgId: 123 }],
    [{ search: 'text', orgId: 'spoofed' }, { orgId: 'trusted' }],
    [{ search: 'text', limit: '10' }, { orgId: 'trusted' }],
    [{ search: 'text', limit: Infinity }, { orgId: 'trusted' }],
    [{ search: 'text', enabled: 0 }, { orgId: 'trusted' }],
    [{ search: null }, { orgId: 'trusted' }],
    [{ search: 'text', region: 0 }, { orgId: 'trusted' }],
  ] satisfies [Record<string, unknown>, QueryParameters][]) {
    expect(await execute(values, context)).toEqual({
      status: 502,
      delivered: [],
    });
  }
});

test('host context can supply any declared parameter', async () => {
  expect(
    await execute({}, { orgId: 'trusted', search: 'host', limit: 5 })
  ).toEqual({
    status: 200,
    delivered: [
      {
        orgId: 'trusted',
        search: 'host',
        limit: 5,
        enabled: false,
        region: null,
      },
    ],
  });
});
