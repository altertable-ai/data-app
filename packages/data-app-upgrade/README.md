# Data app upgrades

Install `@altertable/data-app-upgrade` at the target SDK version in the tool
that builds or upgrades apps. The package takes one TS or TSX file at a time.
It returns edited source without writing files or executing app code.

```ts
import { upgradeDataApp } from '@altertable/data-app-upgrade';

const result = upgradeDataApp({
  source: existingSource,
  fromVersion: '0.75.0',
  toVersion: '0.78.0',
});
```

Omit `toVersion` to target the installed package's version. Upgrades from
`0.75.0` onward are supported. `appliedCodemods` lists releases that changed
the source. `migrationGuides` lists every crossed release in order. The
corresponding Markdown files ship in the package at
`dist/migrations/<version>.md`.

Review those guides and validate the result against the target SDK before
saving it. A codemod can prepare part of a migration while leaving query,
filter, or host behavior changes for review.
