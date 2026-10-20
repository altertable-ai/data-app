# Data context and evidence

Set `dataContext` on each view. Register physical sources with identifiers,
business meaning with glossary entries, and query evidence with bindings.
Evidence may reference only queries executed by that view; detail views need
their own context when their queries differ.

## Register source identifiers

Use `defineDataIdentifiers()` from `@altertable/data-app-react` to register exact catalog, schema,
table, and field names. Use `<DataIdentifier>` in descriptions and glossary
entries to render those source references consistently.

```tsx
import { defineDataIdentifiers } from '@altertable/data-app-react';

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
// activityView is declared with dataContext: context.
const trackedIdentities = activityView.metric(
  {
    id: 'identities',
    glossaryId: 'identities',
    format: { kind: 'count', compact: true },
  },
  data => ({ current: data.count })
);
```

Import `createDataContext()` from `@altertable/data-app-react` and use the
operation's derived `queryNames`. Register metrics with `view.metric()` and
dataset evidence in `view.dataset()`; reuse those bindings in widgets and stories.
See [datasets and metrics](widgets.md#declare-datasets-and-metrics).
