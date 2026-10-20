# Contributing

## Set up

Use the versions in `.bun-version` and `.node-version`.

```fish
bun install --frozen-lockfile
bash scripts/install-test-browser.sh
bun run check
```

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

## Change the package

- Keep server implementations and credentials out of browser entries. Core,
  client, server, and embed remain independent of React.
- Import focused modules internally and declare public exports explicitly.
  Use relative `.ts`/`.tsx` imports within packages and declared exports across
  packages. Root tooling and fixtures may use `@/`.
- Declare dependencies and peers in the package that uses them. Keep compiler
  dependencies in the manifest tooling package, not runtime packages.
- Keep style injection explicit. Add UI styles to
  `packages/data-app-react/src/styles.css`; imports must not modify the DOM.
- Edit source, not generated `dist`. Build from the root before consumer tests.
- Update guides, callers, and starters when public behavior changes. Keep exports
  focused on concrete app needs and flag breaking changes.

## UI platform principles

- Express intent through small typed props and simple data structures.
- Derive values from the displayed source; configure only meaning the platform
  cannot infer, such as which filters affect a dataset.
- Compose existing primitives. Let components own loading, keyboard behavior,
  focus recovery, sizing, and responsive layout.
- Keep CSS defaults in `tokens.css` and `appearance.css`, with optional overrides
  in native `var()` fallbacks. Reuse shared focus/state rules and keep geometry
  local. Update `style-contract.ts` when adding public hooks.
- Verify loading, empty, updating, and ready behavior through public APIs.

## Verify changes

Write consumer-visible workflows in `tests/public-api` using published package
exports. Supply data and failures through public dependency injection. Avoid
private imports, fabricated internal state, and implementation assertions.
Prefer accessible role/name or label queries, scoped to the relevant region.
Keep browser workflows self-contained in `apps-*.test.ts`.

| Command                                             | Use                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `bun run check`                                     | Build and run required source, docs, package, and starter checks |
| `bun run build`                                     | Build packages and generate the API reference                    |
| `bun run test tests/public-api/apps-export.test.ts` | Run a consumer test file after building                          |
| `bun run test -t "workflow name"`                   | Run a focused workflow after building                            |
| `bun run lint:fix`                                  | Fix source lint issues                                           |
| `bun run format`                                    | Format source and docs                                           |
| `bun run lint:md`                                   | Lint authored Markdown                                           |
| `bun run check:links`                               | Validate local files and heading links                           |
| `bun run check:links:external`                      | Check external URLs; requires network                            |
| `bun run check:reference`                           | Compare generated reference with the staged file                 |
| `bun run check:package`                             | Test packed packages outside the workspace                       |
| `bun run check:starter`                             | Typecheck, lint, and build the local starter                     |
| `bun run check:workflows`                           | Validate workflows and shell scripts                             |

Browser tests use Chromium. Install other engines with
`bash scripts/install-test-browser.sh firefox webkit` and select one through
`DATA_APP_TEST_BROWSER` for focused runs.

## Preview changes

- `bun run dev`: gallery at `http://127.0.0.1:27418/gallery` and `/playground`.
  Requires Docker. Package and fixture edits reload; restart after changing
  `dev/server.ts`. Add `?delay=2000` to inspect loading states.
- `bun run dev:file <path>`: preview a single-file app.
- `bun run dev:dir <path>`: preview a directory containing `src/server.ts`.

File and directory previews use this checkout's built packages. Rebuild after
package changes. They query a real lakehouse: configure server-only
`ALTERTABLE_LAKEHOUSE_USERNAME` and `ALTERTABLE_LAKEHOUSE_PASSWORD`, or
`ALTERTABLE_DATA_PROXY_URL` and `ALTERTABLE_DATA_PROXY_TOKEN` for a CLI proxy.
Use `ALTERTABLE_API_BASE` for another lakehouse endpoint.

## Document and release

Write concise instructions for the next action. Keep app authoring in `docs/`
and contributor guidance here. Show current usage with one focused example;
leave prop inventories to TypeScript and JSDoc. Use `<Component>` and
`functionName()` notation. JSDoc records constraints, ownership, units, and
runtime boundaries; code owns implementation explanations.

Generate `REFERENCE.md` with `bun run build` and commit changes. Improve entries
through types and JSDoc, never by editing generated output. Release Please owns
`CHANGELOG.md`.

Use Conventional Commits. Describe behavior and verification in PRs and flag
breaking changes. Packages share one version; `scripts/packages.ts` defines
publication order. See [Releasing](https://github.com/altertable-ai/data-app/blob/main/.github/RELEASING.md) for setup and retries.
