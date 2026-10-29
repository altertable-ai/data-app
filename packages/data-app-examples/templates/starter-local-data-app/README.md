# Local data app starter

Use `node_modules/@altertable/data-app/docs/app-authoring.md` for this SDK version.
Otherwise, read the [version-matched authoring recipe](https://github.com/altertable-ai/data-app/blob/v0.74.0/docs/app-authoring.md). <!-- x-release-please-version -->
See [AGENTS.md](AGENTS.md) for app-owned files.

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

Replace the connectivity check with bounded operations, views, and the content
specified by the authoring skill or app brief. Change identity, appearance, and queries in `app.ts`.

```fish
bun run check
```

`bun run check` includes the build, which writes browser assets to `dist/`. Hosting them requires an authorized
`/api/data` backend; the local adapter does not authenticate hosted viewers.

## License

[MIT](LICENSE)
