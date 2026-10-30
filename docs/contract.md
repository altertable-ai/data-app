# Queries and operations

Keep the starter's `defineDataApp()` declaration and operation registry. Declare
named SQL queries with typed `params` and `projections`; execute them through
`dataApp.defineOperation()`. Use descriptive `lowerCamelCase` query names.

## Execute named queries

This is the hosted starter's query contract inside `defineDataApp()`:

```ts
import { defineDataApp } from '@altertable/data-app';

const dataApp = defineDataApp({
  // ... title, description, and scope
  queries: {
    sampleCountsByGroup: {
      statement: `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Beta', 0))
SELECT group_name, sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
ORDER BY group_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
      projections: {
        group_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
    },
  },
});
```

Replace fixture SQL with inspected data. Keep query declarations and projections
in sync when adapting SQL to the app's inputs. Preserve metric definitions.
Keep operation inputs flat; derive SQL parameters inside `run()`:

```ts
import { parseCount } from '@altertable/data-app/contract';

// ... dataApp and parseSampleCountFilter
const operations = {
  sampleCountsByGroup: dataApp.defineOperation({
    input: parseSampleCountFilter,
    checks: [
      { groupName: '' },
      { groupName: 'Alpha' },
      { groupName: 'missing' },
    ],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const result = await query('sampleCountsByGroup', { groupName });
      return result.rows.map(row => ({
        groupName: row.group_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
};
```

The starter supplies `parseSampleCountFilter()` and `parseCount()`. Validate
unknown input in the parser and business rules in `run()`. Include representative
valid inputs in `checks`. Derive results from `query()` rows without duplicate
schemas or type assertions; clients and views infer the returned type.
HTTP results must be JSON-serializable.

Host `queryParams` supplies protected parameters that callers cannot override.
Other values come from `query()` arguments or defaults. The host/backend enforces
data access and limits. Operation policies must set `maxQueryRows` to a positive
integer no greater than 10,000. The shared SQL host handler also rejects requests
for more than 10,000 rows.

### Declare query projections

Declare every returned SQL alias with `{ type, nullable? }` and keep its exact
casing. Infer nullability from the schema and SQL, not sampled rows. Update
projections when changing SQL. `query()` converts cells to declared types;
return SQL text and declare `string` when exact numeric precision matters.

Use `operations.sampleCountsByGroup.queryNames` for context and evidence.

## Shared date ranges

For period-driven analysis, declare `defineDateRangeContract()` from
`@altertable/data-app/contract` once and share it between the operation's parser
and `defineTimeView()`:

```ts
import { defineDateRangeContract } from '@altertable/data-app/contract';

const calendar = defineDateRangeContract({
  minDate: '2026-01-01',
  maxRangeDays: 90,
  timeZone: 'UTC',
});
```

Use `calendar.parseRequest()` to validate periods. The contract owns source
coverage, time zone, maximum range, and comparison rules.
