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
    // @ts-expect-error Source queries are registered names.
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      source: { query: 'unknown' },
    },
  ],
});
