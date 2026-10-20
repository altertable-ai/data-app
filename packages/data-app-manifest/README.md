# @altertable/data-app-manifest

Static manifest extraction and rewriting for Node.js and Bun tooling.

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

Pass the complete new manifest to rewrite the declaration:

```ts
import { overrideDataAppManifest } from '@altertable/data-app-manifest';

const result = overrideDataAppManifest(source, {
  ...manifest,
  title: 'Revenue',
});
if (result.source !== null) {
  console.log(result.source);
} else {
  console.error(result.diagnostics);
}
```

It accepts the same sources and rewrites only the values that change; the rest
of the source, including comments and formatting, stays as authored.

## Documentation

See the [declaration conventions](https://github.com/altertable-ai/data-app/blob/main/docs/hosted-apps.md)
for supported app source.

## License

[MIT](LICENSE)
