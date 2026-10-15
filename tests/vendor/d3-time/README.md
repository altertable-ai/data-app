# d3-time compatibility tests

Upstream tests from [d3-time v3.1.0](https://github.com/d3/d3-time/tree/v3.1.0/test)
(commit `d66bba6f83801b2f3a3e6440dba8df3357669c73`), under the adjacent ISC license.

The assertions remain upstream JavaScript. Changes are limited to Vitest imports,
repository import paths, test filenames, and formatting. Tests target the internal
TypeScript port directly; this is a vendored compatibility suite, separate from
public API consumer tests.

`utcTicks-boundaries.test.ts` adds project-owned boundary cases alongside the
unchanged upstream assertions.

## Usage

Run `bun run test --project time-interval`. The Vitest project pins
`TZ=America/Los_Angeles`, as upstream requires for daylight-saving assertions,
without changing the timezone of the public API tests. The suite also runs with
`bun run test` and `bun run check`.

## License

Upstream tests use the [ISC license](LICENSE).
