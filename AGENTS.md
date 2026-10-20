# Build Altertable data apps

Start with [app authoring](docs/app-authoring.md). Use the installed,
release-matched starter and search [REFERENCE.md](REFERENCE.md) for exports and
props: `rg '^LineChart\b' REFERENCE.md`.

- Use declared views and bound widgets from `@altertable/data-app-react`.
  Use `/ui` for setup, static screens, and custom composition.
- Declare typed query `params` and `projections`; derive operation data from
  `query()` rows without duplicate schemas or type assertions.
- Derive labels, findings, stories, and CSV exports from the displayed result and
  its input. Explorations supply a story and export every displayed dataset;
  setup and static screens may omit them.
- Keep static context outside loading boundaries.
- Use components and typed props first. Customize through app-owned `className`
  and public tokens; do not copy package classes or select private descendants.
- Edit app-owned files; installed packages are dependencies.

| Task                                | Guide                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Plan the exploration                | [Composition](docs/composition.md)                                          |
| Define queries and inputs           | [Contracts](docs/contract.md)                                               |
| Load data and handle request states | [Views](docs/views.md)                                                      |
| Add filters                         | [Variables](docs/variables.md)                                              |
| Compose displays                    | [Widgets](docs/widgets.md), [layout](docs/layout.md)                        |
| Register sources and evidence       | [Data context](docs/data-context.md)                                        |
| Present and export findings         | [Stories and export](docs/stories-and-export.md)                            |
| Format and style                    | [Formatting](docs/formatting-and-appearance.md), [styling](docs/styling.md) |
| Verify the UI                       | [UI quality](docs/ui-quality.md)                                            |

Package contributors follow [Contributing](CONTRIBUTING.md), including the
[UI platform principles](CONTRIBUTING.md#ui-platform-principles).
Keep `docs/` focused on app authoring; put implementation, testing, and release
instructions in contributor docs. Document current usage, use `<Component>` and
`functionName()` notation, and leave prop inventories to TypeScript and JSDoc.
