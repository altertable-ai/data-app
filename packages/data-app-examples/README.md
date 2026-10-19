# @altertable/data-app-examples

Canonical starter templates for Altertable data apps, shared by the CLI and
app authors. Templates use the published runtime packages and ship as editable
source files. This package has no runtime dependencies.

## Use from scaffolding tools

```ts
import { dataAppExamples, copyExample } from '@altertable/data-app-examples';

const example = dataAppExamples.find(example => example.mode === 'local');
if (!example) throw new Error('Local starter unavailable');
await copyExample(example.id, destination);
```

The catalog supplies stable IDs, titles, descriptions, and execution modes.
`copyExample()` copies the starter and restores `_gitignore` to `.gitignore`
(npm excludes `.gitignore` from published archives). The destination must not
exist. Keep project naming, destination checks, and dependency installation
in the consuming tool. Generated apps do not depend on this package.

`getExampleDirectory()` returns an absolute source path for tools that need to
inspect templates. Both functions reject unknown IDs.

## Starters

| ID                       | Use                                                                       |
| ------------------------ | ------------------------------------------------------------------------- |
| `starter-data-app`       | [Hosted single-file app](templates/starter-data-app/index.tsx)            |
| `starter-local-data-app` | [Local Bun and React project](templates/starter-local-data-app/README.md) |

Pin this package to an exact version in the CLI. Its version follows the runtime
packages, and the local starter pins compatible dependencies to the same release.
The SDK authoring guides and API reference ship in `@altertable/data-app`.

## License

[MIT](LICENSE)
