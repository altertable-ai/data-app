# Cloudflare Worker asset

`@altertable/data-app/worker` resolves to a precompiled, self-contained ESM Worker
script. Upload this one file as the deployment's main module. It includes the
bootstrap and HTML; no bundling, HTML generation,
runtime imports, or asset fetches are needed in the hosting backend.

This export is a script asset, not a Node.js or Bun API. Pin an exact package
version and commit the lockfile. Resolve and read the installed asset, then pass
its contents to your deployment tooling:

```js
import { readFile } from 'node:fs/promises';

const workerScript = await readFile(
  new URL(import.meta.resolve('@altertable/data-app/worker')),
  'utf8'
);
// Upload workerScript as worker.js, with main_module = "worker.js".
```

The hosting backend retains ownership of domains, routes, deployment settings,
and these string bindings:

| Binding          | Meaning                                                                    | Example                                                 |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `DOMAIN_NAME`    | Runtime domain without scheme, port, or trailing dot                       | `apps.example.net`                                      |
| `PARENT_ORIGINS` | Space-separated trusted HTTP(S) origins; first exact origin is the default | `https://app.example.com https://*.preview.example.com` |

The Worker serves only `/` on a single preview label under `DOMAIN_NAME` matching
`/^(?=.{1,63}$)[a-z0-9]+(?:-[a-z0-9]+)+-app-[1-9][0-9]*$/`. Other hosts and paths
return 404. GET returns HTML; HEAD returns the same headers with no body. Other
methods return 405 with `Allow: GET, HEAD`.

`__altertable_parent` selects an **exact** parent origin only after validation
against `PARENT_ORIGINS`. It cannot add trust. HTTPS wildcard entries allow one
subdomain label, without a port, for staging previews. Their apex and deeper
subdomains are rejected. Exact origins cannot contain paths, trailing slashes,
credentials, queries, or fragments. Invalid, duplicate, or unapproved selections
return 403. Missing or invalid origin configuration returns 503; an absent
selection requires an exact default origin. Referrers and messages never supply
trust.

The Worker enforces a restrictive CSP with configured `frame-ancestors`,
`no-referrer`, and `nosniff`. App scripts load through the authenticated bridge. Apps own styling and
navigation. Bundle apps execute their operation registry in the browser and send
registered query IDs and values through the [host query route](embed.md#registered-query-route);
the Worker does not resolve operation names or execute queries. Data requests require backend authorization.

If Terraform reads a file, copy the resolved `/worker` asset unchanged to that
file during deployment preparation. Configure `DOMAIN_NAME`, `PARENT_ORIGINS`,
domains, routes, and deployment settings in Terraform. Upgrade the host package
and Worker together for protocol changes.
Custom hosts that bundle their own bootstrap can use `startDataAppBootstrap()` from
[/embed](embed.md#trusted-bootstrap).
