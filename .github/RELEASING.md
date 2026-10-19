# Releasing

This repository releases its npm packages together: `@altertable/data-app`,
`@altertable/data-app-embed`, `@altertable/data-app-react`,
`@altertable/data-app-bun`, `@altertable/data-app-worker`, and
`@altertable/data-app-manifest`.
They share one version, one release PR, one `v<version>` tag, and one changelog.
The private root's `package.json` is the release version source. Release Please
automatically updates package versions and internal dependency pins
through its configured JSON extra-file updates. The root is never published.

## Repository setup

Enable GitHub Actions and allow it to create pull requests. Configure a
`RELEASE_PLEASE_TOKEN` repository secret with a fine-grained PAT that can write
repository contents and pull requests. The
workflow falls back to `GITHUB_TOKEN`, but PRs created or updated with that token
do not trigger subsequent GitHub Actions workflows. Use the dedicated token
when requiring CI checks on release PRs.

Configure an npm trusted publisher for each package:

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

The existing release manifest and `v<version>` history continue to identify the
coordinated release. New package manifests start at the same version as the base
package. Release Please computes the next version from release-relevant commits
on `main`; the first split release is a breaking change.

While the package is below `1.0.0`, breaking changes bump the minor version via
`bump-minor-pre-major`. Features also bump the minor version, and fixes bump the
patch version. Breaking changes remain documented in release notes. Remove this
option when preparing the first stable `1.0.0` release.

## Release flow

1. Merge Conventional Commits into `main`.
2. Release Please opens or updates a release PR with the version, changelog,
   package manifests, and internal dependency pins. The workflow refreshes
   `bun.lock` on that release branch and pushes it only when it changed. A
   dedicated `RELEASE_PLEASE_TOKEN` lets that commit trigger CI.
3. Review and merge that PR. Release Please creates its `v<version>` tag and
   GitHub release.
4. The workflow resolves the tag to a commit SHA and runs the same source,
   package, and workflow checks against that revision. The publish job checks out
   that SHA, confirms the tag has not moved, builds, and publishes packages to npm
   in the dependency order defined in `scripts/packages.ts`. npm publication is
   not atomic across packages.

GitHub release creation precedes the publication checks. A failed check blocks
npm publication and leaves the GitHub release available for a retry.

The publish job checks that the tag matches the private root version and all package versions, that the GitHub
release exists and is not a draft, and that GitHub OIDC is available. Each existing
npm package version is skipped. A failure stops publication of later packages;
retrying resumes the same release without republishing completed packages. Registry errors other than a missing version stop the
job rather than being treated as permission to publish.

CodeQL and dependency review are separate workflows. Branch protection can
require `Source and packed package`, `Validate workflows`, and `Validate PR
title`, plus the security checks your repository policy requires.

## Retry a failed publication

Run the **Release Please** workflow manually from `main` and enter the existing
GitHub release tag in its `tag` input. The workflow verifies and publishes that
tag, rather than the current contents of `main`. Already-published versions are
skipped, so a retry after a successful publication is safe.

Workflow shell logic lives in `scripts/release/`; Node and Bun versions come
from `.node-version` and `.bun-version`. The npm version is pinned in
`scripts/release/setup-npm.sh`.

To validate repository configuration locally, run `bun run check:workflows` and
`bun run check`. Local checks do not invoke Release Please or publish to npm.
