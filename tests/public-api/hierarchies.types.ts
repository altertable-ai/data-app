import { hierarchyVariable } from '@altertable/data-app/contract';
import { defineDataApp } from '@altertable/data-app';
const geography = hierarchyVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      options: [{ value: 'eu', label: 'Europe' }],
    },
    {
      id: 'customer',
      label: 'Customer',
      valueType: 'number',
      options: [{ value: 1, label: 'One', parent: 'eu' }],
    },
  ],
});
geography.transition(geography.defaultValue, { region: 'eu', customer: 1 });
// @ts-expect-error Customer values are numeric.
geography.transition(geography.defaultValue, { customer: 'one' });
// @ts-expect-error Unknown hierarchy level.
geography.transition(geography.defaultValue, { country: 'France' });
const by = geography.breakdown({ key: 'by' });
by.level('customer', geography.defaultValue);
// @ts-expect-error Breakdown IDs are inferred.
by.level('country', geography.defaultValue);
const parse = geography.input(() => ({ period: 'today' }), {
  breakdowns: { by },
});
const parsed = parse({});
const selection: number | undefined =
  parsed.geography.selection.customer.kind === 'include'
    ? parsed.geography.selection.customer.members[0].value
    : undefined;
void selection;
const app = defineDataApp({
  title: 'Example',
  description: 'Example',
  scope: { organization: 'Example', environment: 'test' },
  queries: { regions: { statement: 'SELECT $member', params: { member: {} } } },
});
app.defineHierarchy({
  key: 'geo',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      // @ts-expect-error Source queries are registered names.
      source: { query: 'unknown' },
    },
  ],
});

const nestedParser = geography.input(
  (value: unknown) => ({
    scope: geography.parse((value as { scope: unknown }).scope),
  }),
  { binding: input => input.scope }
);
const nested = nestedParser({});
void nested.scope.selection.customer;
// @ts-expect-error A nested binding does not invent a top-level hierarchy field.
void nested.geography;
hierarchyVariable({
  key: 'source',
  label: 'Source',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      // @ts-expect-error Static hierarchies cannot reference query sources.
      source: { query: 'regions' },
    },
  ],
});
