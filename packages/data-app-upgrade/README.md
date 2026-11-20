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
`0.75.0` onward are supported.

`steps` reports each registered migration in order with a stable `id`, its
release `version`, and its `status`:

- `applied`: the codemod edited the source.
- `unchanged`: the step made no edit or its review check did not match.
- `review_required`: a source pattern suggests a manual change. See the step's
  `message` and the corresponding guide.

Review checks recognize common source patterns. They cannot prove that a
change is irrelevant to a custom app. `migrationGuides` lists every crossed
release in order. Read the Markdown files at `dist/migrations/<version>.md`
and validate the candidate against the target SDK before saving it.
