# Releasing

All publishable packages share one version, release PR, `v<version>` tag, and
changelog. The private root `package.json` supplies the version.

## Repository setup

1. Enable GitHub Actions and allow it to create pull requests.
2. Install the organization's `altertable-release` GitHub App on this repository
   with contents, issues, and pull-request write permissions. Webhooks and user
   authorization are not needed. Set the Actions variable
   `RELEASE_PLEASE_APP_CLIENT_ID` to its client ID and the Actions secret
   `RELEASE_PLEASE_APP_PRIVATE_KEY` to its private key. Organization-level values
   must allow this repository access. The workflow creates a short-lived token
   scoped to this repository for Release Please and lockfile pushes, so release
   PRs use the app's bot identity and trigger CI. Missing app credentials fail the
   release job instead of falling back to a personal token or `GITHUB_TOKEN`.
3. Create each npm package and configure its trusted publisher:

| Setting      | Value                |
| ------------ | -------------------- |
| Provider     | GitHub Actions       |
| Organization | `altertable-ai`      |
| Repository   | `data-app`           |
| Workflow     | `release-please.yml` |
| Environment  | Empty                |

Publishing uses OIDC and provenance. Keep `id-token: write`; do not add npm token
secrets or `registry-url` to `setup-node`, which interferes with OIDC.

## Release flow

1. Merge Conventional Commits into `main`.
2. Review the Release Please PR: versions, changelog, internal pins, and refreshed
   `bun.lock`. Below `1.0.0`, features and breaking changes bump minor; fixes bump patch.
3. Merge the release PR to create its tag and GitHub release.
4. The workflow checks the tagged revision, builds, and publishes in
   `scripts/packages.ts` order. A failed check blocks npm publication.

Publication is not atomic across packages. Already-published versions are skipped;
a failure stops later packages. The GitHub release remains available for retry.

## Retry a failed publication

Run the **Release Please** workflow manually from `main` with the existing release
tag in its `tag` input. It verifies and publishes that revision, skipping completed
packages.

Validate local configuration with `bun run check:workflows` and `bun run check`.
Release scripts live in `scripts/release/`; runtime versions come from
`.node-version`, `.bun-version`, and `scripts/release/setup-npm.sh`.
