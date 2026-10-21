# Contributing

Use the versions in `.bun-version` and `.node-version`.

```fish
bun install --frozen-lockfile
bash scripts/install-test-browser.sh
```

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

Update the relevant guide and starter. Keep app authoring in `docs/`; document
current usage with one focused example, `<Component>` and `functionName()` notation.
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

```fish
bun install --frozen-lockfile
bun run dev
```

`dev` builds every package, including declarations, before reporting readiness.
It polls build inputs every 300 ms: package source (including CSS and HTML),
package manifests, build TypeScript configuration, the lockfile, and build
scripts. Saves are debounced;
builds run one at a time, with another build queued for edits during a build.
Errors keep the previous output and watching continues. Stop with Ctrl-C.
Concurrent `dev` commands share one watcher for the same canonical checkout.
Each command subscribes to its output; Ctrl-C detaches only that subscriber. The
watcher stops after the final subscriber exits, including abrupt termination.
The owner runs separately from launcher process groups, using a loopback-only
connection rather than persistent locks. Stop all subscribers before production
builds, the gallery, or package checks.

Link every consumed `@altertable` workspace package to this checkout's matching
`packages/<name>` directory, using your consumer's package manager. For example,
from a Bun consumer (replace the checkout path):

```fish
set data_app_checkout /absolute/path/to/data-app
bun link --cwd "$data_app_checkout/packages/data-app"
bun link --cwd "$data_app_checkout/packages/data-app-react"
bun link --no-save @altertable/data-app @altertable/data-app-react
```

Link transitive workspace packages too if your consumer uses embed, Bun, worker,
or example packages. Keep React supplied by the consumer to avoid duplicate
React instances. Start or restart the consumer only after a successful `ready`
signal; configure its bundler to watch linked output and invalidate dependency
caches when rebuilding.

The watcher writes machine-readable lines to stdout, mixed with build logs:

```text
DATA_APP_DEV {"event":"building","generation":0}
DATA_APP_DEV {"event":"ready","generation":1}
```

Supervisors should match `DATA_APP_DEV` followed by a space and parse the
remaining JSON.
`generation` starts at zero for each shared owner and increases only on successful
publication. `building` starts an attempt, `ready` means all JavaScript and
current declarations are published, `error` means an attempt failed, and
`stopped` acknowledges SIGINT/SIGTERM detachment. Wait for the first `ready` before
starting a consumer; use each later `ready` to invalidate or restart it. A failed
initial build keeps watching and does not emit `ready`. Process exit means the
subscription is unavailable; never infer readiness from a previous owner's
output. An unexpected owner or worker exit closes subscriptions with a nonzero
exit code; rerun the command to create a fresh owner.

A late subscriber receives the current event immediately. If it is `ready`, the
existing build can be used without rebuilding. If it is `building` or `error`,
wait for the next `ready`, even when `generation` is greater than zero. Existing
subscribers can keep using their last successful output after an error.

Development builds stage all packages before publication, atomically replace
individual files, publish chunks before entries, and retain old files so requests
using earlier hashed chunks can finish. Publication across files is not atomic;
consumer rebuilds must wait for `ready`. Old chunks accumulate while developing;
a production `bun run build` cleans them after the watcher is stopped. Production
exports, embedded styles, bootstrap, and worker build behavior are unchanged.

## Preview UI changes

Use `bun run dev:gallery` for the gallery at `http://127.0.0.1:27418/gallery` and
`/playground`; it requires Docker. Package and fixture edits reload. Restart after
changing `dev/server.ts`; add `?delay=2000` to inspect loading states.

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
