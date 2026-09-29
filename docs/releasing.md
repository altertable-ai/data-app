# Releasing

This repository releases one npm package, `@altertable/data-app`. All public
entries share its version. Release Please manages `package.json`, the release
manifest, `CHANGELOG.md`, GitHub tags, and release notes.

## Repository setup

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

## Release flow

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
