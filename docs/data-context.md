# Data context and evidence

Set `dataContext: context` in each view. The app and its sections inherit the
view's description, glossary, and permitted query evidence. Render registered identifiers where `<DataIdentifier>` is used.

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
const queries = activity.queryNames;
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
// activityView is declared with dataContext: context.
const trackedIdentities = activityView.metric(
  {
    id: 'identities',
    glossaryId: 'identities',
    format: { kind: 'count', compact: true },
  },
  data => ({ current: data.count })
);
const finding = context.finding({
  id: 'activity',
  headline: 'What people do',
  visual: <ActivityChart />,
  evidence: { id: 'activity-evidence', queryNames: [queries.activity] },
});
```

Query inspection shows the executed SQL and resolved parameters; copy actions include both.

Import context and identifier factories from `/react`. Use the operation’s derived `queryNames` for evidence.

Use `view.metric(definition, select)` to register and bind a metric in one call.
Declare dataset evidence references inside `view.dataset()`; the view registers
and validates them too.
Widgets and stories share its values and evidence; see [datasets and metrics](widgets.md#declare-datasets-and-metrics).
