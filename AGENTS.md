# @altertable/data-app

Build Altertable data apps with `@altertable/data-app`. They render in an iframe
in Altertable, a chat app, or locally in a browser.

Every data app includes CSV export and a story in the built-in toolbar,
both derived from the displayed result. Setup and static screens may omit them.

Follow [app authoring](docs/app-authoring.md) for the shared workflow, the data app
and local data app paths, and task-specific documentation.

## Styling

Use components and typed props first; customize through app-owned `className`
and public tokens. Follow [Styling](docs/styling.md)
and [UI quality](docs/ui-quality.md).
Do not copy package classes onto markup or select private descendants.

## UI platform changes

Express intent through small typed props and simple data structures. Derive UI
from the displayed source; configure only meaning the platform cannot infer.
Follow the [UI platform principles](CONTRIBUTING.md#ui-platform-principles).

## Documentation

Use `<Component>` notation for React components. Keep guidance concise; leave
prop details to TypeScript and JSDoc. Describe the current API without migration
or legacy instructions.

## App authoring

Read the matching guide before generating an app. Package contributors follow
[Contributing](CONTRIBUTING.md).

| Task                                   | Read                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| Choose hosted or local execution       | [App authoring](docs/app-authoring.md)                         |
| Plan a coherent exploration and story  | [Composition](docs/composition.md)                             |
| Load data and compose loading states   | [Views](docs/views.md)                                         |
| Add filters                            | [Variables](docs/variables.md)                                 |
| Compose visuals, tables, and narrative | [Widgets](docs/widgets.md), [layout](docs/layout.md)           |
| Define sources and evidence            | [Data context](docs/data-context.md)                           |
| Present findings and export results    | [Stories and export](docs/stories-and-export.md)               |
| Format values and appearance           | [Formatting and appearance](docs/formatting-and-appearance.md) |

Use `@altertable/data-app-react` with declared views and bound widgets. `@altertable/data-app-react/ui` is for setup,
static displays, and deliberately custom UI; see [direct composition](docs/ui.md).
Prefer derivation over repeated configuration. Keep static context outside loading boundaries. Derive labels, findings, and
exports from the displayed result and its input. Edit app-owned files; installed
package files are dependencies.
Declare typed `params` and `projections`; derive operation data from `query()` rows
without duplicate schemas or type assertions. See [contracts](docs/contract.md)
and [facets](docs/variables.md#fixed-options-and-query-backed-facets).

Keep `docs/` focused on knowledge agents need to build data apps. Put package
implementation, testing, and release guidance in `CONTRIBUTING.md`.
