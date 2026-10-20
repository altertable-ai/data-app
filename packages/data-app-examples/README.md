# @altertable/data-app-examples

Editable starter templates for app authors and scaffolding tools.

## Use from scaffolding tools

```ts
import { copyExample } from '@altertable/data-app-examples';

await copyExample('starter-local-data-app', destination);
```

Use `dataAppExamples` for a starter picker and `getExampleDirectory()` to inspect
a template. `copyExample()` requires a new destination and restores `.gitignore`.
The caller owns naming and dependency installation; generated apps do not depend
on this package.

## Starters

| ID                       | Use                                                                       |
| ------------------------ | ------------------------------------------------------------------------- |
| `starter-data-app`       | [Hosted single-file app](templates/starter-data-app/index.tsx)            |
| `starter-local-data-app` | [Local Bun and React project](templates/starter-local-data-app/README.md) |

Pin to the same exact version as `@altertable/data-app`. Authoring guides and
API reference ship in that base package.

## License

[MIT](LICENSE)
