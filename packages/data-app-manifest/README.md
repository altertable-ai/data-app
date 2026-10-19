# @altertable/data-app-manifest

Static manifest extraction for Node.js and Bun tooling.

## Installation

```fish
bun add @altertable/data-app-manifest
```

Requires Node.js or Bun and includes TypeScript 5. Install it in tooling,
separately from app runtime and UI packages.

## Usage

Pass the app's TSX source string:

```ts
import { extractDataAppManifest } from '@altertable/data-app-manifest';

const result = extractDataAppManifest(source);
if (result.manifest) {
  console.log(result.manifest.queries);
} else {
  console.error(result.diagnostics);
}
```

Returns literal data or diagnostics synchronously. It does not execute app code
or validate configuration shape.

## Documentation

See the [declaration conventions](https://github.com/altertable-ai/data-app/blob/main/docs/hosted-apps.md)
and [API reference](https://github.com/altertable-ai/data-app/blob/main/REFERENCE.md)
for source requirements, return types, and diagnostics.

## License

[MIT](LICENSE)
