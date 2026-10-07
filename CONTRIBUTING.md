# Contributing

Use the Bun and Node.js versions in `.bun-version` and `.node-version`.

```fish
bun install --frozen-lockfile
bun run check
```

## Find the code

| Task                                    | Location                                                       |
| --------------------------------------- | -------------------------------------------------------------- |
| Operations, validation, and data state  | `src/core`                                                     |
| Browser clients and navigation          | `src/client`                                                   |
| Request authorization and local serving | `src/server`                                                   |
| Iframe hosting and bootstrap            | `src/embed`, `src/worker`                                      |
| React bindings and UI                   | `src/react`                                                    |
| Consumer examples                       | `examples/starter-local-data-app`, `examples/starter-data-app` |
| Public guides                           | `docs`                                                         |
| Build, package checks, and releases     | `scripts`                                                      |

Keep browser entries free of server implementations and credentials. Core,
client, server, and embed remain independent of React. Implementations import
focused modules; public entry points declare the supported exports explicitly.
Keep style injection explicit; importing React must not modify the DOM. Add new
styles to `src/react/styles.css`. Do not edit generated `dist`.

Use `@/src/...` imports in repository source and `@altertable/data-app/<entry>`
in consumer tests and examples. Run `bun run lint:fix` and `bun run format` for
style fixes.

Compose the gallery from provided components, including layouts. Let primitives
own sizing, spacing, and responsive behavior. Report missing primitives and keep
fallbacks minimal.

## Verify changes

Write high-level public API tests with Vitest in `tests/public-api`. Define an
operation, authorize and query it, compose a view, or embed an app through
`@altertable/data-app/<entry>`. Assert consumer-visible results and errors. Supply
data and failures through public dependency injection; do not import private
source, fabricate internal state, or assert implementation details. Keep setup
local until repetition warrants sharing it.

`bun run test` runs the complete suite against the built package. Browser
workflows launch Chromium through Playwright from Vitest. They use public
consumer fixtures, an isolated local server, and a fresh browser context per
test. Build first; run one file with `bun run test tests/public-api/apps.test.ts`
or one workflow with `bun run test -t "workflow name"`.

Update the relevant guide when changing public behavior. In documentation prose,
write functions as `functionName()` and components as `<ComponentName>`. Keep JSDoc for
constraints, ownership, units, and runtime boundaries; leave implementation
explanations in the code. App instructions belong in the consuming app's
`AGENTS.md`; see the [local starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter-local-data-app)
and [hosted authoring](docs/hosted-apps.md).

`bun run check` builds first and runs all required source, Markdown, local link, package, and starter
checks. Build before running consumer tests individually.

| Command                        | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `bun run build`                | Build JavaScript, declarations, and injected styles |
| `bun run typecheck`            | Check source, tests, and scripts                    |
| `bun run lint`                 | Run type-aware lint checks                          |
| `bun run lint:md`              | Check Markdown structure and syntax                 |
| `bun run check:links`          | Validate local files, images, and heading links     |
| `bun run check:links:external` | Check external URLs (requires network access)       |
| `bun run format`               | Format source and docs                              |
| `bun run test`                 | Verify high-level public API workflows with Vitest  |
| `bun run check:package`        | Verify the npm archive as a consumer                |
| `bun run check:starter`        | Typecheck, lint, and build the starter              |
| `bun run check:workflows`      | Validate workflows and shell scripts                |

Markdown checks cover all authored `.md` files, including `AGENTS.md` and the
starter docs. Oxfmt owns formatting. Release Please owns `CHANGELOG.md`, so
Markdown style linting excludes it; link validation still includes it. Both
Markdown linting and local link validation run in `bun run check` and CI.

Run `bun run check:links:external` explicitly to check external HTTP(S) links.
It skips local development URLs and checks reachability without external heading
validation. It stays outside required checks because third-party availability and
rate limits can cause failures unrelated to a change.

Run `bash scripts/install-test-browser.sh` once to install Chromium, then
`bun run check` to verify the complete suite.

Run `bun run dev` to preview UI examples at `http://127.0.0.1:27418/gallery`
and a playground at `/playground` (`dev/playground.tsx`, querying the demo
tables `scripts/dev.ts` seeds). It builds once, then rebuilds `dist` when `src`
changes; open pages reload on package, fixture, and playground edits. Restart it after changing
`dev/server.ts`; rerun `bun run build` to refresh declarations. Add `?delay=2000` to a host page URL
to delay its SQL responses and inspect loading states. It needs Docker: SQL runs
against a mocked Altertable API
([altertable-mock](https://github.com/altertable-ai/altertable-mock), DuckDB)
started with Testcontainers and stopped on exit. Public API tests use their own deterministic consumer fixtures.

Open the **Widgets** tab (`/gallery?view=widgets`) for one ready example of each
composable data display inside `<VisualizationWidget>`. The other tabs cover
composed apps, variants, and request states.

Use Conventional Commits and describe behavior changes and verification in PRs.
Flag breaking API changes. Release Please owns `CHANGELOG.md`; see
[Releasing](docs/releasing.md) for release setup and recovery.

## Focused public API

Keep exports and options focused on concrete app needs. Prefer defaults and
derivation from existing state over new knobs; keep implementation details private.

For public changes, update the relevant guide, migrate callers and starters,
and verify published usage. Flag breaking changes in commits and PRs.

Docs help agents generate data apps: show current usage and focused examples.
Keep package architecture and contributor rules here.
