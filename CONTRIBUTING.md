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

## Verify changes

Tests should tell the package's public usage stories: define an operation,
authorize and query it, compose a view, or embed an app. Exercise published
entries so build and export mistakes are observable. Test private logic in
isolation only when its complexity warrants it, such as cancellation, streaming,
SQL escaping, or authenticated bridge sessions. Avoid tests that repeat trivial
helpers, file layout, or every component prop.

Update the relevant guide when changing public behavior. Keep JSDoc for
constraints, ownership, units, and runtime boundaries; leave implementation
explanations in the code. App instructions belong in the consuming app's
`AGENTS.md`; see the [local starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter-local-data-app)
and [hosted authoring](docs/hosted-apps.md).

`bun run check` builds first and runs all required source, package, and starter
checks. Build before running consumer tests individually.

| Command                   | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `bun run build`           | Build JavaScript, declarations, and injected styles |
| `bun run typecheck`       | Check source, tests, and scripts                    |
| `bun run lint`            | Run type-aware lint checks                          |
| `bun run format`          | Format source and docs                              |
| `bun run test`            | Verify public contracts and complex isolated logic  |
| `bun run test:package`    | Verify the npm archive as a consumer                |
| `bun run test:starter`    | Typecheck, lint, and build the starter              |
| `bun run test:browser`    | Verify browser interactions in Chromium             |
| `bun run check:workflows` | Validate workflows and shell scripts                |

For browser changes, run `bash scripts/install-test-browser.sh` once, then
`bun run test:browser`. Preview UI examples at `/gallery` with
`bun browser-tests/server.ts`.

Use Conventional Commits and describe behavior changes and verification in PRs.
Flag breaking API changes. Release Please owns `CHANGELOG.md`; see
[Releasing](docs/releasing.md) for release setup and recovery.
