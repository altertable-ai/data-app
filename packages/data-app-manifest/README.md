# @altertable/data-app-manifest

Static manifest extraction and rewriting for Node.js and Bun tooling.

## Installation

```fish
bun add @altertable/data-app-manifest
```

Install in Node.js or Bun tooling, separately from app runtime packages.

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

Reads literal data without executing app code; validate configuration shape separately.

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

Rewrites changed values while preserving the rest of the source.

## Documentation

See the [declaration conventions](https://github.com/altertable-ai/data-app/blob/main/docs/hosted-apps.md)
for supported app source.

## License

[MIT](LICENSE)
