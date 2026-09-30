# Contributing

Install the versions of Bun and Node.js in `.bun-version` and `.node-version`.
Node supplies npm for the packed-package check; Bun runs the build, tools, and tests.
`bunfig.toml` sets `install.exact = true` so newly added dependencies use exact
versions. Keep `packageManager` aligned with `.bun-version`.

```fish
bun install --frozen-lockfile
bun run check
```

## Repository layout

`src/core` holds shared contracts and data logic. `src/client` owns Fetch transport,
`src/embed` owns iframe hosting and trusted bootstrap initialization.
`src/server` owns request handling and the local Bun adapter, and `src/react` owns
React bindings; `src/react/embed` provides hosts without app UI dependencies.
Components and their styles live together in `src/react/ui`.
`examples/starter` is the runnable CLI starter port, using public package imports.
Its workspace dependency points to the built repository package; keep its app-owned
configuration and agent guidance usable when copied into another project.
`docs` describes each public entry. `scripts` builds and checks the published
artifact. Workflow validation lives in `scripts/check-workflows.sh`, and release
helpers live in `scripts/release`. Generated `dist` files are ignored; edit source
instead.

`src/embed/standalone.ts` emits `dist/bootstrap.js` as a self-contained classic
script for backend HTML. It reads its trusted parent origin from the script
element; keep app navigation and UI dependencies out of this artifact.

Keep core, client, server, and embed free of React and UI imports. Client and
server may depend on core; neither may import the other. Embed may depend on core
and client. Browser code must not import server
implementations or credentials. React implementations import focused modules,
not their own public barrel. Preserve the explicit stylesheet export. Public
exports and their docs are the consumer interface; internal modules may change.

Use repository-root imports (`@/src/...`, `@/package.json`) in source, tests, and
scripts. Oxlint rejects relative imports and requires declarations for named
functions (`func-style`). Use method shorthand for object behavior; retain arrows for inline
callbacks such as collection transforms and hooks. Leave blank lines around
function declarations, effect hooks, and before returns. Use `useReducer(value =>
value + 1, 0)` with a `bump…` dispatcher for increment-only counters rather than
state setters. Run `bun run lint:fix` and `bun run format` for automated fixes.
The declaration build rewrites aliases to portable relative imports for npm
consumers.

## Checks

Run `bun run build` before individual typecheck, lint, or browser checks. Browser
fixtures import the public package exports and need the generated declarations
in `dist`. `bun run check` builds first, including on a fresh checkout.
Release Please owns `CHANGELOG.md`; formatting excludes its generated output.

| Command                   | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `bun run typecheck`       | Validate source, tests, and scripts              |
| `bun run lint`            | Run type-aware Oxlint checks                     |
| `bun run format`          | Format source and documentation with Oxfmt       |
| `bun run test`            | Run contract, transport, and component tests     |
| `bun run build`           | Emit ESM, declarations, and the React stylesheet |
| `bun run test:package`    | Check the built npm archive as a consumer        |
| `bun run test:starter`    | Typecheck, lint, and build the starter           |
| `bun run test:browser`    | Test embedding against built exports in Chromium |
| `bun run check:workflows` | Validate workflows and shell scripts             |
| `bun run check`           | Run all required checks                          |

Add focused tests for changed behavior and update the corresponding entry docs
when changing public APIs. JSDoc should explain constraints, ownership, units,
or runtime boundaries without duplicating the full API guide. The packed-package
check verifies documentation, exports, declarations, browser CSS, and server
imports. The package retains the
runtime's Bun test suite; tests use observable output and contract behavior.

Use Conventional Commits (`fix:`, `feat:`, `docs:`) and describe behavior changes
and verification in pull requests. PR titles are checked against these types.
Flag breaking API changes explicitly.

Build the package, then run `bash scripts/install-test-browser.sh` once and
`bun run test:browser` for iframe work. Browser fixtures import public built
exports; the bootstrap uses the published standalone asset and app scripts are
bundled independently.

CI runs source and packed-package checks, validates workflow syntax, reviews
dependency changes, and analyzes JavaScript and TypeScript with CodeQL.
Dependabot updates Bun dependencies and GitHub Actions weekly. Release Please
creates version and changelog PRs; merging a release PR publishes the verified
release tag to npm. See [Releasing](docs/releasing.md) for setup and recovery.

App-authoring instructions belong to a consuming app's `AGENTS.md`; see the
[starter template](docs/starter-agent-instructions.md).
