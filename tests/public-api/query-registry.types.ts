import { defineDataApp } from '@altertable/data-app';
import {
  defineOperation,
  parseEmptyInput,
  connectionCheck,
} from '@altertable/data-app/contract';

const dataApp = defineDataApp({
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

const operation = dataApp.defineOperation({
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
    // @ts-expect-error Parameter values must be a keyed object, not a callback.
    await context.query('products', () => {});
    // @ts-expect-error Parameterless queries reject callbacks too.
    await context.query('ping', () => {});
    interface ProductParams {
      limit: number;
    }
    const typedParams: ProductParams = { limit: 1 };
    await context.query('products', typedParams);
    const validParams = { limit: 1 };
    await context.query('products', validParams);
    const unexpectedParams = { limit: 1, invented: [] };
    // @ts-expect-error Declared queries reject extra keys carried through variables.
    await context.query('products', unexpectedParams);
    // @ts-expect-error Spreads must not bypass the selected parameter declaration.
    await context.query('products', { ...unexpectedParams });
    const scalarExtra = { limit: 1, invented: 2 };
    // @ts-expect-error Extra scalar parameters also remain undeclared.
    await context.query('products', scalarExtra);
    // @ts-expect-error Only dataApp's declared query names are accepted.
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
defineDataApp({
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

defineDataApp({
  title: 'Invalid config',
  scope: { organization: 'demo', environment: 'test' },
  // @ts-expect-error Config helpers reject unsupported appearance settings.
  appearance: { theme: 'invented' },
  queries: {},
});

defineDataApp({
  title: 'Invalid config',
  scope: { organization: 'demo', environment: 'test' },
  appearance: {},
  // @ts-expect-error Config helpers reject unknown config fields.
  invented: true,
  queries: {},
});

defineDataApp({
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

const typedOperation = dataApp.defineOperation({
  input: (value: unknown) => Number(value),
  output: (value: unknown) => String(value),
  checks: [2],
  policy: { maxQueryRows: 10, maxDurationMs: 1000 },
  async run({ query }, input) {
    await query('products', { limit: input });
    return String(input);
  },
});
const typedInput: number = typedOperation.input(2);
const typedOutput: string = typedOperation.output('2');
void typedInput;
void typedOutput;

dataApp.defineOperation({
  // @ts-expect-error Bound operations cannot replace the app's query registry.
  queries: {},
  input: parseEmptyInput,
  output: (value: unknown) => value,
  checks: [{}],
  policy: { maxQueryRows: 10, maxDurationMs: 1000 },
  async run() {
    return true;
  },
});

defineDataApp({
  title: 'Minimal app',
  description: 'Optional static subtitle',
  scope: { organization: 'demo', environment: 'test' },
  queries: {},
});

defineDataApp({
  title: 'Invalid subtitle',
  // @ts-expect-error A declared description is static text, not executable composition.
  description: () => 'Dynamic subtitle',
  scope: { organization: 'demo', environment: 'test' },
  queries: {},
});

const mutableQueries = {
  products: {
    statement: 'SELECT $limit',
    params: { limit: { defaultValue: 1 } },
  },
};
const immutableApp = defineDataApp({
  title: 'Owned queries',
  scope: { organization: 'demo', environment: 'test' },
  queries: mutableQueries,
});
// @ts-expect-error App registry ownership cannot be replaced.
immutableApp.queries = mutableQueries;
// @ts-expect-error Registry statements remain immutable even for mutable inputs.
immutableApp.queries.products.statement = 'SELECT 2';
// @ts-expect-error Parameter defaults cannot diverge from the bound operation registry.
immutableApp.queries.products.params.limit.defaultValue = 7;
