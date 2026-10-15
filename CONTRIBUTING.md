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
tables from `dev/seed.ts` that `scripts/dev.ts` seeds). It builds once, then rebuilds `dist` when `src`
changes; open pages reload on package, fixture, and playground edits. Restart it after changing
`dev/server.ts`; rerun `bun run build` to refresh declarations. Add `?delay=2000` to a host page URL
to delay its SQL responses and inspect loading states. It needs Docker: SQL runs
against a mocked Altertable API
([altertable-mock](https://github.com/altertable-ai/altertable-mock), DuckDB)
started with Testcontainers and stopped on exit. Public API tests use their own deterministic consumer fixtures.

Run `bun run dev:file <path>` to preview a single-file data app such as
`examples/starter-data-app/index.tsx` from anywhere on disk, or `bun run dev:dir <path>`
for a local data app directory with `src/server.ts`. Both resolve `@altertable/data-app`
and React from this checkout's `dist`, so the app needs no install. Run `bun run build`
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

## Widget recovery contracts

Each section owns its request; a section using the primary view reuses the
`<DataApp>` result. Bound widgets require an explicit owned source. Section
content runs for every discriminated source state; selectors run only for loading
or displayed sources. Query cancellation and late responses must not replace
another input's displayed result.

Operations return validated domain data atomically. Binding selectors run only on
available data, retain source ownership checks, and share the view's displayed
snapshot and input. Rendering failures stay inside the widget frame; rendering
retry resets the failed subtree without refetching. Accepted results reset prior
render failures. Keep query retry policy centralized and omit ineffective retries
for access and rejected-SQL failures.

Stories and exports use displayed snapshots, including retained failures. Freeze
artifacts on opening and preserve failed download payloads for retry. The primary view owns toolbar artifacts. Validate binding ownership and unique
export names at composition boundaries.

Recovery tests inject failures at the public lakehouse boundary so execution,
parsing, cancellation, and deadlines remain covered.
