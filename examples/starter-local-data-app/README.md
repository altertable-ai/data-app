# Local data app starter

Use this starter with the [local authoring guide](https://github.com/altertable-ai/data-app/blob/main/docs/local-data-apps.md).
See [AGENTS.md](AGENTS.md) for app-owned files.

A Bun and React app that imports the public `@altertable/data-app` package.
It starts with a lakehouse connectivity check. Replace that check with bounded
operations and views built from inspected data before sharing an analysis.

## Run from this repository

Use the Bun and Node versions in `.bun-version` and `.node-version`.
From the repository root:

```fish
bun install --frozen-lockfile
bun run build
bun install --frozen-lockfile
cd examples/starter-local-data-app
bun run dev
```

The second install refreshes the local file dependency with the built exports.

Open <http://127.0.0.1:25837>. Missing credentials show the connection error state;
the page still runs. Set server-only credentials before starting the server:

```fish
set -gx ALTERTABLE_LAKEHOUSE_USERNAME your-username
read --silent --prompt-str 'Lakehouse password: ' ALTERTABLE_LAKEHOUSE_PASSWORD
set -gx ALTERTABLE_LAKEHOUSE_PASSWORD $ALTERTABLE_LAKEHOUSE_PASSWORD
bun run dev
```

Alternatively, supply `ALTERTABLE_DATA_PROXY_URL` and
`ALTERTABLE_DATA_PROXY_TOKEN` for an existing CLI proxy. These values must stay
on the server. This local adapter does not authorize hosted viewers.

## Make it your app

This checkout uses `file:../..` to exercise the built package before publication.
When copying the starter elsewhere, replace that dependency with the published
package using `bun add @altertable/data-app`, `npm install @altertable/data-app`,
or `pnpm add @altertable/data-app`, then regenerate your lockfile.

```fish
bun run check
```

Edit `DATA_APP_CONFIG` in `app.ts` for identity, appearance,
and queries. Declare it with `defineDataAppConfig()`.

`bun run build` typechecks the app, then bundles the browser page into `dist/`. That browser artifact
still needs an authorized `/api/data` backend when hosted.
