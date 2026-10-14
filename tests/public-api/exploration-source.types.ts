import { defineDataApp } from '@altertable/data-app';
const app = defineDataApp({
  title: 'Teams',
  description: 'Teams',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    members: {
      statement: 'SELECT 1 AS value',
      params: { member: { defaultValue: null }, region: {} },
    },
    summary: { statement: 'SELECT 1', params: {} },
  },
});
const hierarchy = app.defineHierarchy({
  key: 'teams',
  label: 'Teams',
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
      source: { query: 'members' },
    },
  ],
});
app.defineHierarchy({
  key: 'bad',
  label: 'Bad',
  levels: [
    // @ts-expect-error Membership source must declare a member parameter.
    {
      id: 'team',
      label: 'Team',
      valueType: 'number',
      source: { query: 'summary' },
    },
  ],
});
// @ts-expect-error Numeric team IDs retain their type.
hierarchy.filter(hierarchy.defaultValue, { team: '250' });
const input = hierarchy.input(() => ({ ticketId: 1 }));
const parsed = input({ teams: hierarchy.defaultValue });
parsed.teams.selection.team = {
  kind: 'include',
  // @ts-expect-error The named hierarchy field retains numeric member values.
  members: [{ kind: 'value', value: 'bad' }],
};

app.defineHierarchy({
  key: 'binding',
  label: 'Binding',
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
      source: {
        query: 'members',
        parents: {
          // @ts-expect-error Only preceding hierarchy levels are valid parent bindings.
          region: 'unknown',
        },
      },
    },
  ],
});

const jobsBy = hierarchy.breakdown({ key: 'jobs-by' });
const parsedBreakdown = hierarchy.input(() => ({}), { breakdowns: { jobsBy } })(
  { teams: hierarchy.defaultValue }
);
// @ts-expect-error The parsed breakdown retains the hierarchy's level IDs.
parsedBreakdown.jobsBy = 'unknown';
const typedLevel: 'region' | 'team' = parsedBreakdown.jobsBy;
void typedLevel;
