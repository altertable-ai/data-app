import { expect, test } from 'vitest';
import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import { createDataHandler } from '@altertable/data-app/server';
import type { Lakehouse } from '@altertable/data-app/contract';
const app = defineDataApp({
  title: 'Service teams',
  description: 'Explore dynamic teams.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    regions: {
      statement:
        'SELECT region AS value, region AS label FROM regions WHERE ($member IS NULL OR region=$member)',
      params: { member: { defaultValue: null } },
    },
    teams: {
      statement:
        'SELECT id AS value, name AS label FROM teams WHERE region=$region AND ($member IS NULL OR id=$member)',
      params: { region: {}, member: { defaultValue: null } },
    },
    summary: { statement: 'SELECT count(*) FROM tickets', params: {} },
  },
});
const hierarchy = app.defineExploration({
  key: 'team',
  label: 'Teams',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      source: { query: 'regions' },
    },
    {
      id: 'team',
      label: 'Team',
      valueType: 'number',
      source: {
        query: 'teams',
      },
    },
  ],
});
const checks = { team: hierarchy.defaultValue };
const overview = app.defineOperation({
  input: hierarchy.input(() => ({})),
  output: value => value,
  checks: [checks],
  policy: { maxQueryRows: 200, maxDurationMs: 1000 },
  async run({ query }) {
    return query('summary');
  },
});
function source(
  log: { name: string; params: unknown; limit: number }[],
  fail = false
): Lakehouse {
  return {
    async queryAll(statement, { params, limit }) {
      const name = statement.includes('FROM regions')
        ? 'regions'
        : statement.includes('FROM teams')
          ? 'teams'
          : 'summary';
      log.push({ name, params, limit });
      if (fail) throw Error('Source unavailable');
      if (name === 'summary')
        return { columns: [{ name: 'count' }], rows: [[5]] };
      const member = params?.member;
      if (name === 'regions')
        return {
          columns: [{ name: 'value' }, { name: 'label' }],
          rows:
            member === null || member === 'Europe'
              ? [['Europe', 'Europe']]
              : [],
        };
      const valid = params?.region === 'Europe' && member === 250;
      return {
        columns: [{ name: 'value' }, { name: 'label' }],
        rows:
          member === null
            ? [[1, 'First team']]
            : valid
              ? [[250, 'Team outside the first page']]
              : [],
      };
    },
  };
}
function selected(id: number) {
  return hierarchy.filter(
    hierarchy.filter(hierarchy.defaultValue, { region: 'Europe' }),
    { team: id }
  );
}
test('source-backed input validates exact membership before business queries in browser and HTTP execution', async () => {
  const log: { name: string; params: unknown; limit: number }[] = [];
  const operations = { overview };
  const client = createDataClient({ operations, lakehouse: source(log) });
  const options = await createDataClient({
    operations: hierarchy.operations,
    lakehouse: source(log),
  }).query('team.team', {
    region: 'Europe',
    team: null,
  });
  expect(options.data).toEqual([{ value: 1, label: 'First team' }]);
  log.length = 0;
  await client.query('overview', { team: selected(250) });
  expect(log.map(entry => entry.name)).toEqual(['regions', 'teams', 'summary']);
  expect(log[1]).toEqual({
    name: 'teams',
    params: { region: 'Europe', member: 250 },
    limit: 2,
  });
  log.length = 0;
  await expect(
    client.query('overview', { team: selected(999) })
  ).rejects.toThrow('selected team');
  expect(log.map(entry => entry.name)).toEqual(['regions', 'teams']);
  const handler = createDataHandler(operations, async () => ({
    lakehouse: source(log),
  }));
  const response = await handler(
    new Request('http://localhost/api/data/overview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ team: selected(999) }),
    })
  );
  expect(response.status).toBe(400);
});
test('membership validation fails closed and source registry mismatches fail at declaration', async () => {
  const log: { name: string; params: unknown; limit: number }[] = [];
  await expect(
    createDataClient({
      operations: { overview },
      lakehouse: source(log, true),
    }).query('overview', { team: selected(250) })
  ).rejects.toThrow();
  expect(log.map(entry => entry.name)).toEqual(['regions']);
  const other = defineDataApp({
    title: 'Wrong source',
    description: 'Different source',
    scope: { organization: 'demo', environment: 'test' },
    queries: {
      regions: {
        statement: 'SELECT 1',
        params: { member: { defaultValue: null } },
      },
    },
  });
  expect(() =>
    other.defineOperation({
      input: hierarchy.input(() => ({})),
      output: value => value,
      checks: [checks],
      policy: { maxQueryRows: 10, maxDurationMs: 1000 },
      async run() {
        return 0;
      },
    })
  ).toThrow('declared source');
});

test('input contracts register selector operations automatically with authorization and collision checks', async () => {
  const log: { name: string; params: unknown; limit: number }[] = [];
  const authorized: string[] = [];
  const handler = createDataHandler({ overview }, async (_request, name) => {
    authorized.push(name);
    return { lakehouse: source(log) };
  });
  const response = await handler(
    new Request('http://localhost/api/data/team.team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ region: 'Europe', team: null }),
    })
  );
  expect(response.status).toBe(200);
  expect(authorized).toEqual(['team.team']);
  expect(log.map(entry => entry.name)).toEqual(['regions', 'teams']);
  expect(log.at(-1)?.params).toEqual({ region: 'Europe', member: null });
  expect(() =>
    createDataClient({
      operations: { overview, 'team.team': overview },
      lakehouse: source(log),
    })
  ).toThrow('reserved by exploration');
});

test('input wrappers compose membership validation and cancellation prevents business execution', async () => {
  const other = app.defineExploration({
    key: 'second',
    label: 'Second',
    levels: [
      {
        id: 'region',
        label: 'Region',
        valueType: 'string',
        source: { query: 'regions' },
      },
    ],
  });
  const composed = app.defineOperation({
    input: other.input(hierarchy.input(() => ({}))),
    output: value => value,
    checks: [{ team: hierarchy.defaultValue, second: other.defaultValue }],
    policy: { maxQueryRows: 200, maxDurationMs: 1000 },
    async run({ query }) {
      return query('summary');
    },
  });
  const log: { name: string; params: unknown; limit: number }[] = [];
  await createDataClient({
    operations: { composed },
    lakehouse: source(log),
  }).query('composed', {
    team: selected(250),
    second: other.filter(other.defaultValue, { region: 'Europe' }),
  });
  expect(log.map(entry => entry.name)).toEqual([
    'regions',
    'teams',
    'regions',
    'summary',
  ]);
  const controller = new AbortController();
  let entered!: () => void;
  const ready = new Promise<void>(resolve => {
    entered = resolve;
  });
  let observed: AbortSignal | undefined;
  const client = createDataClient({
    operations: { overview },
    lakehouse: {
      async queryAll(_sql, { signal }) {
        observed = signal;
        entered();
        return new Promise(() => {});
      },
    },
  });
  const pending = client.query(
    'overview',
    { team: selected(250) },
    { signal: controller.signal }
  );
  await ready;
  controller.abort();
  await expect(pending).rejects.toThrow();
  expect(observed?.aborted).toBe(true);
});

test('hierarchy input wrappers own their field and reject asynchronous base parsers', () => {
  expect(() =>
    hierarchy.input(() => ({ team: hierarchy.defaultValue }))({
      team: hierarchy.defaultValue,
    })
  ).toThrow('owns');
  expect(() =>
    hierarchy.input(async () => ({}))({ team: hierarchy.defaultValue })
  ).toThrow('synchronous');
});

test('generated selectors resolve selected members outside the options page with exact bounds', async () => {
  const log: { name: string; params: unknown; limit: number }[] = [];
  const client = createDataClient({
    operations: hierarchy.operations,
    lakehouse: source(log),
  });
  const result = await client.query('team.team', {
    region: 'Europe',
    team: 250,
  });
  expect(result.data).toEqual([
    { value: 250, label: 'Team outside the first page' },
  ]);
  expect(log.at(-1)).toEqual({
    name: 'teams',
    params: { region: 'Europe', member: 250 },
    limit: 2,
  });
  await expect(
    client.query('team.team', { region: 'Europe', team: 999 })
  ).rejects.toThrow('selected team');
});

test('selector endpoints validate sourced ancestors before querying child labels', async () => {
  const log: { name: string; params: unknown; limit: number }[] = [];
  const client = createDataClient({
    operations: hierarchy.operations,
    lakehouse: source(log),
  });
  await expect(
    client.query('team.team', { region: 'Unknown', team: null })
  ).rejects.toThrow('selected region');
  expect(log.map(entry => entry.name)).toEqual(['regions']);
  log.length = 0;
  await expect(
    client.query('team.team', { region: null, team: null })
  ).rejects.toMatchObject({ code: 'invalid_input' });
  expect(log).toEqual([]);
  const handler = createDataHandler({ overview }, async () => ({
    lakehouse: source(log),
  }));
  const response = await handler(
    new Request('http://localhost/api/data/team.team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ region: 'Unknown', team: 250 }),
    })
  );
  expect(response.status).toBe(400);
  expect(log.map(entry => entry.name)).toEqual(['regions']);
});

test('source selectors enforce fixed ancestor membership and parent bindings', async () => {
  const fixed = app.defineExploration({
    key: 'fixed',
    label: 'Fixed regions',
    levels: [
      {
        id: 'region',
        label: 'Region',
        valueType: 'string',
        options: [{ value: 'Europe', label: 'Europe' }],
      },
      {
        id: 'team',
        label: 'Team',
        valueType: 'number',
        source: { query: 'teams' },
      },
    ],
  });
  const log: { name: string; params: unknown; limit: number }[] = [];
  await expect(
    createDataClient({
      operations: fixed.operations,
      lakehouse: source(log),
    }).query('fixed.team', { region: 'Unknown', team: null })
  ).rejects.toMatchObject({ code: 'invalid_input' });
  expect(log).toEqual([]);
  expect(() =>
    app.defineExploration({
      key: 'unbound',
      label: 'Unbound',
      levels: [
        {
          id: 'team',
          label: 'Team',
          valueType: 'number',
          options: [{ value: 1, label: 'Team' }],
        },
        {
          id: 'region',
          label: 'Region',
          valueType: 'string',
          source: { query: 'regions' },
        },
      ],
    })
  ).toThrow('bind their parent');
});
