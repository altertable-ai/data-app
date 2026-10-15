import { defineDataApp } from '@altertable/data-app';
import {
  connectionCheck,
  parseEmptyInput,
} from '@altertable/data-app/contract';

const app = defineDataApp({
  title: 'Parameters',
  description: 'Typed parameter ownership.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    required: {
      statement: 'SELECT $search',
      projections: { value: { type: 'string' } },
      params: {
        search: { type: 'string', source: 'input' },
        limit: { type: 'number', source: 'input', defaultValue: 10 },
        enabled: { type: 'boolean', source: 'input', defaultValue: false },
        region: {
          type: 'string',
          nullable: true,
          source: 'input',
          defaultValue: null,
        },
        orgId: { type: 'string', source: 'context' },
      },
    },
    connection: {
      statement: 'SELECT 1',
      projections: { value: { type: 'number' } },
      params: { orgId: { type: 'string', source: 'context' } },
    },
  },
});
app.defineOperation({
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run({ query }) {
    await query('required', { search: 'text' });
    await query('required', {
      search: 'text',
      limit: 2,
      enabled: true,
      region: null,
    });
    await query('required', { search: 'text', limit: undefined });
    await query('connection');
    // @ts-expect-error Required input values cannot be omitted.
    await query('required');
    // @ts-expect-error Required input values cannot be replaced with an empty bag.
    await query('required', {});
    // @ts-expect-error Numeric parameters do not accept strings.
    await query('required', { search: 'text', limit: 'ten' });
    // @ts-expect-error Booleans retain their own type.
    await query('required', { search: 'text', enabled: 1 });
    // @ts-expect-error Nonnullable inputs reject null.
    await query('required', { search: null });
    // @ts-expect-error A default of null does not erase the intended nullable string type.
    await query('required', { search: 'text', region: 1 });
    // @ts-expect-error Protected context values cannot be supplied by callers.
    await query('required', { search: 'text', orgId: 'other-org' });
    const protectedValues = { search: 'text', orgId: 'other-org' };
    // @ts-expect-error Intermediate objects cannot bypass ownership.
    await query('required', protectedValues);
    // @ts-expect-error Spreads cannot bypass ownership.
    await query('required', { ...protectedValues });
    const name = Math.random() > 0.5 ? 'required' : 'connection';
    // @ts-expect-error Parameterized query names must be narrowed before execution.
    await query(name);
    if (name === 'required') await query(name, { search: 'text' });
    else await query(name);
    return true;
  },
});
connectionCheck(app.queries);
// @ts-expect-error A connectivity probe cannot supply required operation inputs.
connectionCheck({ connection: app.queries.required });

const header = {
  title: 'Invalid',
  description: 'Invalid defaults.',
  scope: { organization: 'demo', environment: 'test' },
};
defineDataApp({
  ...header,
  // @ts-expect-error Reject invalid parameter type, ownership, or default declarations.
  queries: {
    value: {
      statement: 'SELECT $value',
      projections: { value: { type: 'number' } },
      params: {
        value: { type: 'number', source: 'input', defaultValue: 'ten' },
      },
    },
  },
});
defineDataApp({
  ...header,
  // @ts-expect-error Reject invalid parameter type, ownership, or default declarations.
  queries: {
    value: {
      statement: 'SELECT $value',
      projections: { value: { type: 'string' } },
      params: {
        value: { type: 'string', source: 'context', defaultValue: 'fallback' },
      },
    },
  },
});
defineDataApp({
  ...header,
  queries: {
    value: {
      statement: 'SELECT $value',
      projections: { value: { type: 'number' } },
      params: {
        value: { type: 'number' },
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
        // @ts-expect-error A parameter needs a fixed owner and type at declaration time.
        value: dynamicParameter,
      },
    },
  },
});

declare const dynamicOwner:
  | { type: 'string'; source: 'input' }
  | { type: 'string'; source: 'context' };
defineDataApp({
  ...header,
  queries: {
    value: {
      statement: 'SELECT $value',
      projections: { value: { type: 'string' } },
      params: {
        // @ts-expect-error Ownership must be fixed even when the value type is known.
        value: dynamicOwner,
      },
    },
  },
});
declare const dynamicType:
  | { type: 'string'; source: 'input' }
  | { type: 'number'; source: 'input' };
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
    // @ts-expect-error Nullable still requires an input unless it has a default.
    await query('value');
    // @ts-expect-error Nullability does not change the primitive input type.
    await query('value', { limit: '1' });
    // @ts-expect-error Nonnullable defaults do not accept null.
    await query('value', { limit: 1, offset: null });
    return true;
  },
});
