# Build Altertable data apps

Start with [app authoring](docs/app-authoring.md). Use the installed,
release-matched starter and search [REFERENCE.md](REFERENCE.md) for exports and
props: `rg '^LineChart\b' REFERENCE.md`.

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
