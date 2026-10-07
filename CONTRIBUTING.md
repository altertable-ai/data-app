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

Tests should tell the package's public usage stories: define an operation,
authorize and query it, compose a view, or embed an app. Exercise published
entries so build and export mistakes are observable. Test private logic in
isolation only when its complexity warrants it, such as cancellation, streaming,
SQL escaping, or authenticated bridge sessions. Avoid tests that repeat trivial
helpers, file layout, or every component prop.

Follow the [styling contract](docs/styling.md) when changing component CSS.
CSS sources own defaults. Keep public names in `src/react/style-contract.ts` and
the styling reference aligned when adding customization hooks. Optional component
overrides use native `var()` fallbacks where their properties are consumed.
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
| `bun run check:styles`         | Validate authored app hooks                         |
| `bun run typecheck`            | Check source, tests, and scripts                    |
| `bun run lint`                 | Run type-aware lint checks                          |
| `bun run lint:md`              | Check Markdown structure and syntax                 |
| `bun run check:links`          | Validate local files, images, and heading links     |
| `bun run check:links:external` | Check external URLs (requires network access)       |
| `bun run format`               | Format source and docs                              |
| `bun run test`                 | Verify public contracts and complex isolated logic  |
| `bun run test:package`         | Verify the npm archive as a consumer                |
| `bun run test:starter`         | Typecheck, lint, and build the starter              |
| `bun run test:browser`         | Verify browser interactions in Chromium             |
| `bun run check:workflows`      | Validate workflows and shell scripts                |

Markdown checks cover all authored `.md` files, including `AGENTS.md` and the
starter docs. Oxfmt owns formatting. Release Please owns `CHANGELOG.md`, so
Markdown style linting excludes it; link validation still includes it. Both
Markdown linting and local link validation run in `bun run check` and CI.

Run `bun run check:links:external` explicitly to check external HTTP(S) links.
It skips local development URLs and checks reachability without external heading
validation. It stays outside required checks because third-party availability and
rate limits can cause failures unrelated to a change.

For browser changes, run `bash scripts/install-test-browser.sh` once, then
`bun run test:browser`.

Run `bun run dev` to preview UI examples at `http://127.0.0.1:27418/gallery`
and a playground at `/playground` (`dev/playground.tsx`, querying the demo
tables `scripts/dev.ts` seeds). It builds once, then rebuilds `dist` when `src`
changes; open pages reload on package, fixture, and playground edits. Restart it after changing
`browser-tests/server.ts`; rerun `bun run build` to refresh declarations. Add `?delay=2000` to a host page URL
to delay its SQL responses and inspect loading states. It needs Docker: SQL runs
against a mocked Altertable API
([altertable-mock](https://github.com/altertable-ai/altertable-mock), DuckDB)
started with Testcontainers and stopped on exit. Browser tests keep fixtures.

Open the **Widgets** tab (`/gallery?view=widgets`) for one ready example of each
composable data display inside `<VisualizationWidget>`. The other tabs cover
composed apps, variants, and request states.

Use Conventional Commits and describe behavior changes and verification in PRs.
Flag breaking API changes. Release Please owns `CHANGELOG.md`; see
[Releasing](#releasing) for release setup and recovery.

## Maintain package styles

The injected stylesheet declares ordered layers: `atbl.tokens`, `atbl.base`,
`atbl.components`, and `atbl.interaction`. Normal unlayered author CSS overrides
package rules regardless of injection order. System color overrides in forced
colors mode use important declarations.

CSS sources own all default values. `tokens.css` declares inherited theme values;
`appearance.css` owns internal palette primitives and appearance presets.
`src/react/style-contract.ts` lists public names for types and authoring validation.
`base.css` owns component sizing and the document baseline. Component CSS owns
layout and visual states; shared focus and cursor behavior uses explicit `data-atbl-*` hooks in
`ui/Focus.css` and `interaction.css`. The full UI and host skeleton use the same
shared token and component sources.

Consume semantic tokens. Optional overrides use native `var()` fallbacks at their
consumption sites so local colors, fonts, and spacing compose. Keep
fixed geometry local unless it represents a shared design decision. Style React
Aria states with their data attributes and keep selectors inside package
components. `<Tabs>` provides the scope for tab styling.

The build bundles the authored stylesheets and embeds their CSS in the explicit
injector. No token rewriting or reference generation runs during builds. Keep the
public names and reference aligned when adding hooks.

`bun run check:styles` validates shipped authored
examples; pass file paths or quoted globs to check another app.
Token reference and package control-hook checks run with the unit tests. Browser tests cover host
isolation, author overrides, cursor and focus states, theme and palette changes,
contrast, and appearance cleanup.

## Preview the hosted starter

```fish
bun install --frozen-lockfile
bun run build
bun browser-tests/server.ts
```

Open [the starter preview](http://127.0.0.1:27418/starter-data-app).
Its test host executes the sample SQL through the iframe bridge using SQLite.

## Releasing

This repository releases one npm package, `@altertable/data-app`. All public
entries share its version. Release Please manages `package.json`, the release
manifest, `CHANGELOG.md`, GitHub tags, and release notes.

### Repository setup

Enable GitHub Actions and allow it to create pull requests. Configure a
`RELEASE_PLEASE_TOKEN` repository secret with a fine-grained PAT that can write
repository contents and pull requests. The
workflow falls back to `GITHUB_TOKEN`, but PRs created or updated with that token
do not trigger subsequent GitHub Actions workflows. Use the dedicated token
when requiring CI checks on release PRs.

Configure the npm trusted publisher for `@altertable/data-app`:

| Setting           | Value                                               |
| ----------------- | --------------------------------------------------- |
| Provider          | GitHub Actions                                      |
| Organization      | `altertable-ai`                                     |
| Repository        | `data-app`                                          |
| Workflow filename | `release-please.yml`                                |
| Environment       | Leave empty; the workflow has no GitHub environment |

The publish job grants `id-token: write`, uses npm 11.18.0, and publishes with
provenance. It uses neither `NPM_TOKEN` nor `NODE_AUTH_TOKEN`. Do not add
`registry-url` to its `setup-node` step: that creates token authentication
configuration that interferes with OIDC. See
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

If the npm package does not exist yet, establish it and configure its trusted
publisher before expecting automated publication to succeed. Package and npm
account setup are maintainer actions outside repository CI.

The manifest starts at the imported runtime version `0.59.1`. This records the
version baseline, not a claim that it is published. Release Please computes the
next version from release-relevant commits on `main`.

While the package is below `1.0.0`, breaking changes bump the minor version via
`bump-minor-pre-major`. Features also bump the minor version, and fixes bump the
patch version. Breaking changes remain documented in release notes. Remove this
option when preparing the first stable `1.0.0` release.

### Release flow

1. Merge Conventional Commits into `main`.
2. Release Please opens or updates a release PR with the version and changelog.
3. Review and merge that PR. Release Please creates its `v<version>` tag and
   GitHub release.
4. The workflow resolves the tag to a commit SHA and runs the same source,
   package, and workflow checks against that revision. The publish job checks out
   that SHA, confirms the tag has not moved, builds, and publishes to npm.

GitHub release creation precedes the publication checks. A failed check blocks
npm publication and leaves the GitHub release available for a retry.

The publish job checks that the tag matches `package.json`, that the GitHub
release exists and is not a draft, and that GitHub OIDC is available. An existing
npm version is skipped. Registry errors other than a missing version stop the
job rather than being treated as permission to publish.

CodeQL and dependency review are separate workflows. Branch protection can
require `Source and packed package`, `Validate workflows`, and `Validate PR
title`, plus the security checks your repository policy requires.

### Retry a failed publication

Run the **Release Please** workflow manually from `main` and enter the existing
GitHub release tag in its `tag` input. The workflow verifies and publishes that
tag, rather than the current contents of `main`. Already-published versions are
skipped, so a retry after a successful publication is safe.

Workflow shell logic lives in `scripts/release/`; Node and Bun versions come
from `.node-version` and `.bun-version`. The npm version is pinned in
`scripts/release/setup-npm.sh`.

To validate repository configuration locally, run `bun run check:workflows` and
`bun run check`. Local checks do not invoke Release Please or publish to npm.

## Focused public API

Keep exports and options focused on concrete app needs. Prefer defaults and
derivation from existing state over new knobs; keep implementation details private.

For public changes, update the relevant guide, migrate callers and starters,
and verify published usage. Flag breaking changes in commits and PRs.

Docs help agents generate data apps: show current usage and focused examples.
Keep package architecture and contributor rules here.
