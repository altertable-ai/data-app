# Local metric data app starter

Use `node_modules/@altertable/data-app/docs/app-authoring.md` for this SDK version.
Otherwise, read the [version-matched authoring recipe](https://github.com/altertable-ai/data-app/blob/v0.74.0/docs/app-authoring.md). <!-- x-release-please-version -->
See [AGENTS.md](AGENTS.md) for app-owned files.

The example queries require the seeded sample data described in the
[local preview guide](https://github.com/altertable-ai/data-app/blob/v0.74.0/docs/local-data-apps.md#preview-the-use-case-starters). <!-- x-release-please-version -->
Use that mock for development, or replace the example queries with verified data
in your lakehouse. The starter does not install a mock or create demo tables.

## Run the app

From the copied starter directory, install dependencies and set server-only
credentials before starting:

```fish
bun install
set -gx ALTERTABLE_LAKEHOUSE_USERNAME your-username
read --silent --prompt-str 'Lakehouse password: ' ALTERTABLE_LAKEHOUSE_PASSWORD
set -gx ALTERTABLE_LAKEHOUSE_PASSWORD $ALTERTABLE_LAKEHOUSE_PASSWORD
bun run dev
```

Open <http://127.0.0.1:25837>. Alternatively, configure
`ALTERTABLE_DATA_PROXY_URL` and `ALTERTABLE_DATA_PROXY_TOKEN` for an existing
CLI proxy. Missing credentials stop startup.

## Build the app

Replace the fixture queries and example content with the evidence and content
specified by the app brief. Change identity, appearance, and queries in `app.ts`.

```fish
bun run check
```

`bun run check` includes the build, which writes browser assets to `dist/`. Hosting them requires an authorized
`/api/data` backend; the local adapter does not authenticate hosted viewers.

## License

[MIT](LICENSE)
