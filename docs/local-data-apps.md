# Author a local data app

Start from the CLI scaffold or the [local starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter-local-data-app).
Use the starter's README for setup and its AGENTS.md to find app-owned files.
Replace the connectivity screen with the exploration, CSV export, and story from the
[shared authoring flow](app-authoring.md).

| Task                                    | Documentation                            |
| --------------------------------------- | ---------------------------------------- |
| Serve locally with Bun                  | [Bun server](server-bun.md)              |
| Execute and authorize server operations | [Server](server.md)                      |
| Call operations from the browser        | [HTTP client](client.md#http-operations) |

You can also [convert the local app to a hosted data app](hosted-apps.md#convert-a-local-data-app).

## Declare queries and variables

Use the same [query declarations and typed variables](contract.md#execute-named-queries)
as hosted apps. Put SQL in an operation's `queries` map and variable definitions
in `variables`, then call `query(id, values)` inside `run()`.

For example, after inspecting an `events` table with a `country` column:

```ts
import {
  defineOperation,
  defineQueryNames,
  defineQueryVariables,
  getDataAppRegistration,
  parseCount,
  parseQueryVariables,
} from '@altertable/data-app/contract';

const queryNames = defineQueryNames({ count: 'event-count' });
const variables = defineQueryVariables({
  country: { type: 'STRING', default: 'FR' },
});
export const operations = {
  eventCount: defineOperation({
    queryNames,
    variables,
    queries: {
      [queryNames.count]:
        'SELECT count(*) FROM events WHERE country = {{country}}',
    },
    input: value => parseQueryVariables(variables, value),
    output: parseCount,
    checks: [{ country: 'FR' }],
    policy: { maxQueryRows: 1, maxDurationMs: 15000, exposeSql: true },
    async run({ query }, values) {
      const result = await query(queryNames.count, values);
      return parseCount(result.rows[0]?.[0]);
    },
  }),
};
export const registration = getDataAppRegistration(operations);
```

Keep SQL declarations in `src/operations.ts`. Shared variable definitions can
live in a separate browser-safe module so views reuse them with
[`queryVariable()`](react.md#query-variable-selectors). Browser code imports
operation types and calls the operation by ID and values:

```ts
import { createDataClient } from '@altertable/data-app/client';
import type { operations } from './operations';

const client = createDataClient<typeof operations>();
const result = await client.query('eventCount', { country: 'GB' });
```

Pass `operations` to `serveLocalApp()` as in the starter. Bun loads the declarations
from that source, validates values, resolves the named statement, and builds SQL
before sending `{ statement, limit }` through the CLI proxy. The browser sends
only the operation ID and its input values through the existing HTTP transport.
An operation such as `eventCount` can execute several registered queries such as
`event-count`; these names have the same roles in hosted apps.

`registration` exports the complete queries and variables for a future hosted
create/update call. Local development loads them from source and needs no remote
registration API. The starter's connection probe uses a registered query with an
empty variable map too.

Existing local `query(name, statement)` calls remain supported. New apps should
use declarations and `query(name, values)` so their queries can move unchanged to
the hosted runtime. An explicit custom Lakehouse adapter must handle
`options.variables` with `buildQueryStatement()` before executing a template.
