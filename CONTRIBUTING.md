# Contributing

Use the Bun and Node.js versions in `.bun-version` and `.node-version`.

```fish
bun install --frozen-lockfile
bash scripts/install-test-browser.sh
bun run check
```

## Find the code

| Task                                    | Location                                                       |
| --------------------------------------- | -------------------------------------------------------------- |
| Operations, validation, and data state  | `packages/data-app/src/core`                                   |
| Browser clients and navigation          | `packages/data-app/src/client`                                 |
| Request authorization and local serving | `packages/data-app/src/server`, `packages/data-app-bun/src`    |
| Iframe hosting and bootstrap            | `packages/data-app-embed`, `packages/data-app-worker`          |
| React bindings and UI                   | `packages/data-app-react/src`                                  |
| Consumer examples                       | `examples/starter-local-data-app`, `examples/starter-data-app` |
| Public guides                           | `docs`                                                         |
| Build, package checks, and releases     | `scripts`                                                      |

Keep browser entries free of server implementations and credentials. Core,
client, server, and embed remain independent of React. Implementations import
focused modules; public entry points declare the supported exports explicitly.
Keep style injection explicit; importing React must not modify the DOM. Add new
styles to `packages/data-app-react/src/styles.css`. Do not edit generated `dist`.

Use relative imports within each package and declared package exports across
packages. Use repository-root `@/` imports for contributor tooling and fixtures.
Consumer tests and examples import the published package names. The base
`/internal` entry is shared implementation for coordinated packages; app authors
use documented entries. Run `bun run lint:fix` and `bun run format` for
style fixes.

Compose the gallery from provided components, including layouts. Let primitives
own sizing, spacing, and responsive behavior. Report missing primitives and keep
fallbacks minimal.

## Workspace packages

The root is private. Publishable packages live in `packages/`; examples remain
private workspaces. `scripts/packages.ts` lists packages in dependency order.
Run `bun run build` from the root to build JavaScript, declarations, explicit
styles, the embed bootstrap, the bundled preview host, and the standalone Worker.
Package-level builds require their dependencies to have been built first.

Every package declares its own runtime dependencies and peers. Cross-package
builds externalize dependencies to preserve shared module identity. The Worker,
bootstrap, and preview host are deliberately self-contained build artifacts.

`bun run check:boundaries` verifies ownership and release version consistency.
`bun run check:package` packs every package and installs consumer combinations
outside the checkout to verify dependency isolation, portable types, browser
bundling, and Bun previews without workspace hoisting.

## Verify changes

Write high-level public API tests with Vitest in `tests/public-api`. Define an
operation, authorize and query it, compose a view, or embed an app through
the published package exports. Assert consumer-visible results and errors. Supply
data and failures through public dependency injection; do not import private
source, fabricate internal state, or assert implementation details. Prefer queries by role and accessible name, or by label for form fields. Scope
content assertions to the relevant region, status, alert, or dialog; use text
queries for prose with no meaningful role. Do not invent ARIA roles for tests.
Group browser workflows by consumer capability in `apps-*.test.ts`; keep tests
self-contained and setup local until repetition warrants sharing it.

`bun run test` runs the complete suite against the built package. Browser
workflows launch Chromium through Playwright from Vitest. They use public
consumer fixtures, an isolated local server, and a fresh browser context per
test. Build first; run one file with `bun run test tests/public-api/apps-export.test.ts`
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
| `bun run check:styles`         | Validate authored styling hooks                     |
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

Run `bun run dev` to preview UI examples at `http://127.0.0.1:27418/gallery`
and a playground at `/playground` (`dev/playground.tsx`, querying the demo
tables from `dev/seed.ts` that `scripts/dev.ts` seeds). It builds once, then rebuilds `dist` when package source
changes; open pages reload on package, fixture, and playground edits. Restart it after changing
`dev/server.ts`; rerun `bun run build` to refresh declarations. Add `?delay=2000` to a host page URL
to delay its SQL responses and inspect loading states. It needs Docker: SQL runs
against a mocked Altertable API
([altertable-mock](https://github.com/altertable-ai/altertable-mock), DuckDB)
started with Testcontainers and stopped on exit. Public API tests use their own deterministic consumer fixtures.

Run `bun run dev:file <path>` to preview a single-file data app such as
`examples/starter-data-app/index.tsx` from anywhere on disk, or `bun run dev:dir <path>`
for a local data app directory with `src/server.ts`. Both resolve `@altertable/data-app`
and React from this checkout's package builds, so the app needs no install. Run `bun run build`
after package changes. File previews replace the app iframe on edits and preserve
URL filters. Directory previews restart the app server when its imports change.
Unlike `bun run dev`, neither uses the mocked API: set `ALTERTABLE_USERNAME` and `ALTERTABLE_PASSWORD` (or the
`ALTERTABLE_LAKEHOUSE_` names) to query `https://api.altertable.ai`, or another lakehouse
with `ALTERTABLE_API_BASE`. A CLI proxy (`ALTERTABLE_DATA_PROXY_URL`) takes precedence.
Each command prints the lakehouse it targets on startup.

Open the **Widgets** tab (`/gallery?view=widgets`) for one ready example of each
composable data display inside `<VisualizationWidget>`. The other tabs cover
composed apps, variants, and request states.

Use Conventional Commits and describe behavior changes and verification in PRs.
Flag breaking API changes. Release Please owns `CHANGELOG.md`; see
[Releasing](https://github.com/altertable-ai/data-app/blob/main/.github/RELEASING.md) for release setup and recovery.

## Focused public API

Keep exports and options focused on concrete app needs. Prefer defaults and
derivation from existing state over new knobs; keep implementation details private.

For public changes, update the relevant guide, migrate callers and starters,
and verify published usage. Flag breaking changes in commits and PRs.

Docs help agents generate data apps: show current usage and focused examples.
Keep package architecture and contributor rules here. Document author decisions
and minimal composition examples; leave automatic interaction mechanics and prop
inventories to code, TypeScript, and JSDoc.

## UI platform principles

Design defaults that let agents build useful data apps with minimal configuration:

- Express user intent through small typed props and explicit ownership.
- Derive values from the displayed source rather than asking authors to repeat them.
- Configure only semantics that cannot be inferred reliably, such as which filters affect a dataset.
- Keep data structures simple, data flow direct, and names specific to their purpose.
- Compose existing primitives; remove unnecessary wrappers and intermediate state.
- Let components own loading, keyboard behavior, focus recovery, and responsive layout.
- Document the default path with one short authoring example; keep constraints in TypeScript and JSDoc.
- Verify public behavior across loading, empty, updating, and ready states.

## Component CSS

Keep defaults in authored CSS: inherited values in `tokens.css`, presets in
`appearance.css`, and optional overrides in native `var()` fallbacks at use sites.
Use the four layers (`atbl.tokens`, `atbl.base`, `atbl.components`,
`atbl.interaction`) and shared focus/state rules rather than duplicate control
paint. Keep geometry local. Document public variables beside declarations or
consumption sites; update the name contract in `style-contract.ts` when adding hooks.
