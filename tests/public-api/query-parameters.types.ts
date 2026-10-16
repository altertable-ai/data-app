import { defineDataApp } from '@altertable/data-app';
import {
  connectionCheck,
  parseEmptyInput,
} from '@altertable/data-app/contract';

const app = defineDataApp({
  title: 'Parameters',
  description: 'Typed query parameters.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    filtered: {
      statement: 'SELECT $search',
      projections: { value: { type: 'string' } },
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
    connection: {
      statement: 'SELECT 1',
      projections: { value: { type: 'number' } },
      params: { orgId: { type: 'string' } },
    },
  },
});
app.defineOperation({
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run({ query }) {
    await query('filtered', { search: 'text' });
    await query('filtered', {
      search: 'text',
      limit: 2,
      enabled: true,
      region: null,
    });
    await query('filtered', { search: 'text', limit: undefined });
    await query('connection');
    await query('filtered');
    await query('filtered', {});
    // @ts-expect-error Numeric parameters do not accept strings.
    await query('filtered', { search: 'text', limit: 'ten' });
    // @ts-expect-error Booleans retain their own type.
    await query('filtered', { search: 'text', enabled: 1 });
    // @ts-expect-error Nonnullable inputs reject null.
    await query('filtered', { search: null });
    // @ts-expect-error A default of null does not erase the intended nullable string type.
    await query('filtered', { search: 'text', region: 1 });
    await query('filtered', { search: 'text', orgId: 'other-org' });
    const values = { search: 'text', orgId: 'other-org' };
    await query('filtered', values);
    await query('filtered', { ...values });
    const name = Math.random() > 0.5 ? 'filtered' : 'connection';
    // @ts-expect-error Parameterized query names must be narrowed before execution.
    await query(name);
    if (name === 'filtered') await query(name, { search: 'text' });
    else await query(name);
    return true;
  },
});
connectionCheck(app.queries);

const header = {
  title: 'Invalid',
  description: 'Invalid defaults.',
  scope: { organization: 'demo', environment: 'test' },
};
defineDataApp({
  ...header,
  // @ts-expect-error Reject invalid parameter types and defaults.
  queries: {
    value: {
      statement: 'SELECT $value',
      projections: { value: { type: 'number' } },
      params: {
        value: { type: 'number', defaultValue: 'ten' },
      },
    },
  },
});

declare const dynamicParameter: import('@altertable/data-app/contract').QueryParameter;
defineDataApp({
  ...header,
  queries: {
    value: {
      statement: 'SELECT $value',
      projections: { value: { type: 'string' } },
      params: {
        // @ts-expect-error A parameter needs a fixed type at declaration time.
        value: dynamicParameter,
      },
    },
  },
});

declare const dynamicType: { type: 'string' } | { type: 'number' };
defineDataApp({
  ...header,
  queries: {
    value: {
      statement: 'SELECT $value',
      projections: { value: { type: 'string' } },
      params: {
        // @ts-expect-error Input validation needs a fixed type, not a runtime type choice.
        value: dynamicType,
      },
    },
  },
});

const implicitInput = defineDataApp({
  ...header,
  queries: {
    value: {
      statement: 'SELECT $limit, $offset',
      params: {
        limit: { type: 'number', nullable: true },
        offset: { type: 'number', defaultValue: 0 },
      },
      projections: { value: { type: 'number', nullable: true } },
    },
  },
});
implicitInput.defineOperation({
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run({ query }) {
    await query('value', { limit: null });
    await query('value', { limit: 1 });
    await query('value');
    // @ts-expect-error Nullability does not change the primitive input type.
    await query('value', { limit: '1' });
    // @ts-expect-error Nonnullable defaults do not accept null.
    await query('value', { limit: 1, offset: null });
    return true;
  },
});
