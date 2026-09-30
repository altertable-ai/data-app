# Standalone bootstrap

`@altertable/data-app/bootstrap` resolves to a self-contained classic browser
script. It has no imports, React dependencies, or app navigation behavior. The
package builds it once; a backend can embed the published file without running a
bundler.

For Cloudflare hosting, use the [Worker asset](worker.md) to upload the complete
runtime without backend HTML generation or bundling. This bootstrap entry remains
available for other hosts that own their HTML and security policy.

This entry is a script asset, not a module API. Resolve and read it on the server;
do not import it for execution in Node.js or Bun. For a bootstrap you bundle
yourself, use `startDataAppBootstrap` from [embedding](embed.md).

## Generate HTML for a custom host

Install an exact package version in the hosting service's `package.json`, commit
the lockfile, and generate its bootstrap page before deployment:

```js
// scripts/generate-bootstrap.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const parentOrigin = 'https://app.example.com';
const path = import.meta.resolve('@altertable/data-app/bootstrap');
const javascript = await readFile(new URL(path), 'utf8');
const inline = javascript.replace(/<\/script/gi, match =>
  match.replace('<', '<\\')
);
const originAttribute = parentOrigin
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll("'", '&#39;');

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <div id="root"></div>
    <script data-parent-origin="${originAttribute}">${inline}</script>
  </body>
</html>`;

await mkdir('generated', { recursive: true });
await writeFile('generated/bootstrap.html', html);
```

```fish
node scripts/generate-bootstrap.mjs
```

The hosting service serves this file as `text/html; charset=utf-8` with the
security headers described below.
The resulting HTML needs no package imports or network fetches at runtime.

## Configuration and security

Use a regular inline `<script>` with `data-parent-origin` on that same element,
after the app's mount element. The script reads `document.currentScript` and
starts immediately. Do not use `type="module"`.

The hosting service must supply an exact trusted origin, such as
`https://app.example.com`, through deployment configuration. Missing or invalid
origins fail before installing a transport. Do not derive this value from an
unverified query parameter, referrer, or incoming message.

Serve the HTML with the [bootstrap CSP](embed.md#trusted-bootstrap), including a
`frame-ancestors` header restricted to the trusted host. The script installs the
authenticated transport, retains opaque host state, evaluates the app bundle
sent by the host, and reports readiness or failure. The app attaches its own
navigation adapter. Backend authorization still applies to every data request.

Upgrade the host package and bootstrap artifact together when changing the bridge
protocol. See [client navigation](client.md#app-navigation) and
[embedding](embed.md) for the communication boundaries.
