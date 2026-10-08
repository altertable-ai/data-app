import { defineDataAppConfig } from '@altertable/data-app/config';
import {
  defineOperation,
  parseEmptyInput,
  connectionCheck,
} from '@altertable/data-app/contract';

const DATA_APP_CONFIG = defineDataAppConfig({
  title: 'Typed queries',
  scope: { organization: 'demo', environment: 'test' },
  appearance: {},
  queries: {
    products: {
      statement: 'SELECT $limit',
      params: { limit: { defaultValue: 10 } },
    },
    ping: { statement: 'SELECT 1', params: {} },
    signUps: {
      statement: 'SELECT $days',
      params: { days: { defaultValue: 7 } },
    },
  },
});

const operation = defineOperation({
  queries: DATA_APP_CONFIG.queries,
  input: parseEmptyInput,
  output: (value: unknown) => value,
  checks: [{}],
  policy: { maxQueryRows: 10, maxDurationMs: 1000 },
  async run(context) {
    await context.query('ping');
    await context.query('ping', {});
    // @ts-expect-error Parameterless queries reject arbitrary parameter keys.
    await context.query('ping', { invented: [] });
    const extraParams = { invented: 1 };
    // @ts-expect-error Parameterless queries also reject keys from variables.
    await context.query('ping', extraParams);
    await context.query('products');
    // @ts-expect-error Only DATA_APP_CONFIG's declared query names are accepted.
    await context.query('inventedQuery');
    await context.query('signUps', { days: 14 });
    // @ts-expect-error Parameter keys belong to the selected query.
    await context.query('products', { days: 7 });
    // @ts-expect-error Parameters are scalar values.
    await context.query('products', { limit: [] });
    // @ts-expect-error Registered operations expose only named execution.
    await context.lakehouse.queryAll('SELECT 1');
    return context.query('products', { limit: 5 }, { limit: 2 });
  },
});

// @ts-expect-error Evidence names are derived from the same exact registry keys.
void operation.queryNames.inventedQuery;

const connection = connectionCheck({
  connection: { statement: 'SELECT 1', params: {} },
});
// @ts-expect-error Connectivity helpers preserve their query names too.
void connection.queryNames.inventedQuery;

// @ts-expect-error Every app config declares its query registry, including static apps.
defineDataAppConfig({
  title: 'Missing queries',
  scope: { organization: 'demo', environment: 'test' },
  appearance: {},
});

defineOperation({
  queries: {},
  // @ts-expect-error Query names are derived; they cannot be declared separately.
  queryNames: { custom: 'custom' },
  input: parseEmptyInput,
  output: (value: unknown) => value,
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run() {
    return true;
  },
});

defineDataAppConfig({
  title: 'Invalid config',
  scope: { organization: 'demo', environment: 'test' },
  // @ts-expect-error Config helpers reject unsupported appearance settings.
  appearance: { theme: 'invented' },
  queries: {},
});

defineDataAppConfig({
  title: 'Invalid config',
  scope: { organization: 'demo', environment: 'test' },
  appearance: {},
  // @ts-expect-error Config helpers reject unknown config fields.
  invented: true,
  queries: {},
});

defineDataAppConfig({
  title: 'Invalid declarations',
  scope: { organization: 'demo', environment: 'test' },
  appearance: {},
  queries: {
    ping: {
      statement: 'SELECT 1',
      // @ts-expect-error Parameter declarations must be a keyed object.
      params: [],
    },
    scalar: {
      statement: 'SELECT $value',
      // @ts-expect-error Defaults must be scalar SQL values.
      params: { value: { defaultValue: [] } },
    },
  },
});
