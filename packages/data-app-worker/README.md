# @altertable/data-app-worker

Self-contained sandbox Worker for serving Altertable data apps.

## Installation

```fish
bun add @altertable/data-app-worker
```

## Usage

Resolve the installed Worker asset and read it for your deployment tooling:

```js
import { readFile } from 'node:fs/promises';

const workerScript = await readFile(
  new URL(import.meta.resolve('@altertable/data-app-worker')),
  'utf8'
);
```

Upload `workerScript` as the deployment's main module. Configure the string
bindings `DOMAIN_NAME` (runtime domain) and `PARENT_ORIGINS` (trusted host origins),
plus your deployment's domains and routes.

The asset includes its bootstrap and HTML. Data queries go through the host's
authorized message router.

## Documentation

See the [Worker guide](https://github.com/altertable-ai/data-app/blob/main/docs/worker.md)
for deployment, bindings, and origin rules.

## License

[MIT](LICENSE)
