# Contributing

Use the versions in `.bun-version` and `.node-version`.

```sh
bun install --frozen-lockfile
bash scripts/install-test-browser.sh
```

Start a Docker-compatible container runtime before `bun run test` or
`bun run check`. The starter tests launch a mock API container and seed its sample
data. To run only the public API tests that do not need Docker, use
`bun run test --project public-api`; this excludes the mock-backed starter tests.

## Workflow

1. **Locate the owner.** Use the code map below. Read additional guidance only
   for the kind of change being made.
2. **Change source and consumers.** Keep the public API focused on concrete app
   needs. Preserve package boundaries and explicit exports. Update affected
   callers, starters, and guides with public behavior changes.
3. **Run focused checks.** Build with `bun run build` before consumer tests.
   Select the test file or `-t "workflow name"` matching the change. For example,
   CSV export changes use `bun run test tests/public-api/apps-export.test.ts`.
   Docs-only edits use `bun run lint:md`, `bun run check:links`, and
   `bun run format:check`.
4. **Run final verification.** Use `bun run check` for package changes. Run
   `bun run check:workflows` when changing workflows or shell scripts. Fix failures;
   report checks that could not run.
5. **Commit the change.** Use Conventional Commits. Describe behavior and
   verification in PRs and flag breaking changes.

## Find the code

| Task                            | Location                                                    |
| ------------------------------- | ----------------------------------------------------------- |
| Static manifest tooling         | `packages/data-app-manifest`                                |
| Operations and data state       | `packages/data-app/src/core`                                |
| Browser clients and navigation  | `packages/data-app/src/client`                              |
| Authorization and local serving | `packages/data-app/src/server`, `packages/data-app-bun/src` |
| Iframe hosting and bootstrap    | `packages/data-app-embed`, `packages/data-app-worker`       |
| React bindings and UI           | `packages/data-app-react/src`                               |
| Starter templates               | `packages/data-app-examples/templates`                      |
| App authoring guides            | `docs`                                                      |
| Build and release tooling       | `scripts`                                                   |

## Package boundaries

Keep server implementations and credentials out of browser entries. Core,
client, server, and embed remain independent of React. Import focused modules
internally and declare public exports explicitly. Use relative `.ts`/`.tsx`
imports within packages and declared exports across packages; root tooling and
fixtures may use `@/`.

Declare dependencies and peers in their owning package. Keep runtime packages
free of compiler dependencies. Edit source, not generated `dist`.

## Public API changes

Write consumer-visible workflows in `tests/public-api` using published exports.
Supply data and failures through public dependency injection. Avoid private
imports, fabricated internal state, and implementation assertions. Prefer
accessible role/name or label queries scoped to the relevant region. Keep browser
workflows self-contained in `apps-*.test.ts`.

Update the relevant guide and starter. Keep SDK mechanics and shared component
guidance in `docs/`; use-case composition belongs to the app brief and
selected starter. Document current usage with one focused example, `<Component>`
and `functionName()` notation.
Show complete enclosing calls and components; use `// ...` for unrelated setup.
Name the app declaration `dataApp`; keep the API's `app` prop name.
Leave prop inventories to TypeScript and JSDoc. Generate `REFERENCE.md` with
`bun run build` and stage it before `bun run check:reference`; improve entries
through types and JSDoc, never generated output.

## UI platform principles

- Express intent through small typed props and simple data structures.
- Derive values from the displayed source; configure only meaning the platform
  cannot infer, such as which filters affect a dataset.
- Compose existing primitives. Let components own loading, keyboard behavior,
  focus recovery, sizing, and responsive layout.
- Verify loading, empty, updating, and ready behavior through public APIs.
- Own standard theme, responsive, and containment behavior in SDK tests, plus
  keyboard/focus behavior for controls. Exercise both themes and narrow/wide
  widths, including long labels.

For CSS changes, keep defaults in `tokens.css` and `appearance.css`, with optional
native `var()` fallbacks. Reuse focus/state rules and keep geometry local. Add
styles through `styles.css` with explicit injection; imports must not modify the
DOM. Update `style-contract.ts` for public hooks.

## Develop linked packages

From this checkout:

```sh
bun install --frozen-lockfile
bun run dev
```

`dev` builds and watches every package, including declarations and embedded CSS.
Failed builds retain the last successful output. Consumers share one watcher per
checkout; Ctrl-C detaches a consumer and the last consumer stops the watcher.
Stop all consumers before production builds, the gallery, or package checks.

Prefer the consuming project's local SDK launcher when available. For manual Bun
linking, run this from the consumer, replacing the checkout path:

```sh
data_app_checkout=/absolute/path/to/data-app
bun link --cwd "$data_app_checkout/packages/data-app"
bun link --cwd "$data_app_checkout/packages/data-app-react"
bun link --no-save @altertable/data-app @altertable/data-app-react
```

Link any transitive workspace packages too. Keep one React instance supplied by
the consumer, and configure its bundler to refresh linked output after builds.

Launchers parse stdout lines prefixed with `DATA_APP_DEV` and a space. The JSON
payload looks like `{"event":"ready","generation":1}`. Events are `building`, `ready`, `error`, and
`stopped`; generation increases only after successful publication. Start or refresh
consumers after `ready`. New subscribers receive the current event and must wait
for the next `ready` if a build is in progress or failed. Existing subscribers may
resume their last successful build after `error`. Unexpected watcher exits return
a nonzero status; rerun the command to reconnect.

## Preview UI changes

For SDK UI work, `bun run dev:gallery` starts the example gallery at
`http://127.0.0.1:27418/gallery`, `/playground`, and a Docker-backed mock API.
Package and fixture edits reload. Restart after changing `dev/server.ts`; add
`?delay=2000` to inspect loading states.

Use `bun run dev:file <path>` for a single-file app or `bun run dev:dir <path>`
for an app directory with `src/server.ts`. These previews use built packages and
a real lakehouse: configure server-only `ALTERTABLE_LAKEHOUSE_USERNAME` and
`ALTERTABLE_LAKEHOUSE_PASSWORD`, or the CLI proxy's `ALTERTABLE_DATA_PROXY_URL`
and `ALTERTABLE_DATA_PROXY_TOKEN`. Use `ALTERTABLE_API_BASE` for another endpoint.

## Packaging and releases

For packaging changes, run `bun run check:package` after building to test packed
consumers, and `bun run check:starter` for starter changes. Packages share one
version; `scripts/packages.ts` defines publication order.

Release Please owns `CHANGELOG.md`. Read
[Releasing](https://github.com/altertable-ai/data-app/blob/main/.github/RELEASING.md)
only when changing release setup or retrying publication.
