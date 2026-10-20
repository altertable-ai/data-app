# Local data app starter

If dependencies are installed, use
`node_modules/@altertable/data-app/docs/local-data-apps.md` for this app's SDK version.
Otherwise, read the [version-matched local authoring guide](https://github.com/altertable-ai/data-app/blob/v0.72.0/docs/local-data-apps.md). <!-- x-release-please-version -->
Browse the latest [local authoring guide](https://github.com/altertable-ai/data-app/blob/main/docs/local-data-apps.md)
on GitHub.
See [AGENTS.md](AGENTS.md) for app-owned files.

A Bun and React starter for Altertable data apps using the published packages.
It starts with a lakehouse connectivity check. Replace that check with bounded
operations and views built from inspected data before sharing an analysis.

## Usage

### Run your app

From the copied starter directory:

```fish
bun install
bun run dev
```

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

### Make it your app

This starter declares the published base, React, and Bun packages. Run `bun install` to install those packages from npm.

```fish
bun run check
```

Edit the `defineDataApp()` declaration in `app.ts` for identity, appearance,
and queries.

`bun run build` typechecks the app, then bundles the browser page into `dist/`. That browser artifact
still needs an authorized `/api/data` backend when hosted.

## License

[MIT](LICENSE)
