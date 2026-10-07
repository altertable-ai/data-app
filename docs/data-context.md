# Data context and evidence

Pass the registered context to `<DataApp dataContext={context}>`. Inspection
shows its description, glossary, and executed query SQL when disclosure is
permitted. Render registered identifiers where `<DataIdentifier>` is used.

Physical source identifiers name inspected tables and columns. Glossary entries
explain business meaning. Query names link those definitions and displayed claims
to their execution evidence. Keep all three explicit.

## Register source identifiers

Use `defineDataIdentifiers()` from `/react` to register exact catalog, schema,
table, and field names. Use `<DataIdentifier>` in descriptions and glossary
entries to render those source references consistently.

```tsx
import { defineDataIdentifiers } from '@altertable/data-app/react';

const identifiers = defineDataIdentifiers({
  tables: {
    events: {
      catalog: 'product_analytics',
      schema: 'analytics',
      name: 'events',
    },
  },
  columns: { identity: { table: 'events', name: 'identity_uuid' } },
});
const { DataIdentifier } = identifiers;

<DataIdentifier id="tables.events" />;
<DataIdentifier id="columns.events.identity" />;
```

Pass `identifiers.definitions` to `createDataContext()` to reuse the source
registry.

## Bind evidence

```tsx
const queries = defineQueryNames({ activity: 'feature-activity' });
// In the server operation: queryNames: queries
const context = createDataContext(queries)({
  identifiers: identifiers.definitions,
  description: (
    <>
      Explore activity in <DataIdentifier id="tables.events" />.
    </>
  ),
  glossary: {
    identities: {
      term: 'Tracked identities',
      definition: (
        <>
          Distinct <DataIdentifier id="columns.events.identity" /> values.
        </>
      ),
      queryNames: [queries.activity],
    },
  },
});
const evidence = context.evidence({
  id: 'identities',
  glossaryIds: ['identities'],
  queryNames: [queries.activity],
});
const trackedIdentities = context.metric({
  id: 'actions',
  glossaryId: 'identities',
  label: 'Tracked identities',
  format: { kind: 'count' },
});
const finding = context.finding({
  id: 'activity',
  headline: 'What people do',
  visual: <ActivityChart />,
  evidence: { id: 'activity-evidence', queryNames: [queries.activity] },
});
```

Import `defineQueryNames()` from `/contract` and the context/identifier factories from `/react`. Use the same registry in `defineOperation({ queryNames: queries, ... })`.

Bind a registered metric's calculation with `view.metric(metric, select)` so
widgets and stories share its reading; see [datasets and metrics](widgets.md#declare-datasets-and-metrics).
