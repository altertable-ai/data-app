# Changelog

## [0.66.0](https://github.com/altertable-ai/data-app/compare/v0.65.0...v0.66.0) (2026-10-07)


### ⚠ BREAKING CHANGES

* **styles:** Public styling variables use the --atbl- namespace instead of --at-. Update custom CSS overrides to the new names.
* **annotations:** Remove the freeform insight footer prop from metric, visualization and table widgets. Use TextContent or TextWidget for narrative; table footer controls remain supported.
* **react:** derive data apps from owned views and bindings ([#41](https://github.com/altertable-ai/data-app/issues/41))
* **react:** add composable charts and responsive widget gallery ([#38](https://github.com/altertable-ai/data-app/issues/38))
* **react:** keep static content visible during loading ([#39](https://github.com/altertable-ai/data-app/issues/39))

### Features

* **annotations:** add screenshot-backed visual feedback ([#42](https://github.com/altertable-ai/data-app/issues/42)) ([c78ee8f](https://github.com/altertable-ai/data-app/commit/c78ee8fb5be9fe208116fd18dc0717800e4f64de))
* **react:** add composable charts and responsive widget gallery ([#38](https://github.com/altertable-ai/data-app/issues/38)) ([6361335](https://github.com/altertable-ai/data-app/commit/63613359cdaa8df215794d29cbe8613015454150))


### Bug Fixes

* **react:** align export UI with toolbar controls ([#34](https://github.com/altertable-ai/data-app/issues/34)) ([73c5638](https://github.com/altertable-ai/data-app/commit/73c5638931767e20db9c1b6e04e790b35673b0a0))
* **react:** increase bottom padding in standalone data apps ([#40](https://github.com/altertable-ai/data-app/issues/40)) ([8bea4f7](https://github.com/altertable-ai/data-app/commit/8bea4f7f32e4f4a9a4f1a169bd6de4edac94f207))


### Code Refactoring

* **react:** derive data apps from owned views and bindings ([#41](https://github.com/altertable-ai/data-app/issues/41)) ([def008a](https://github.com/altertable-ai/data-app/commit/def008a29daae60c75bf28dd48b24e79e8c9a962))
* **react:** keep static content visible during loading ([#39](https://github.com/altertable-ai/data-app/issues/39)) ([c507f29](https://github.com/altertable-ai/data-app/commit/c507f298c1d9cc856de470aecd1645dd1a85ac79))
* **styles:** consolidate authored CSS and styling contracts ([d2bfe8d](https://github.com/altertable-ai/data-app/commit/d2bfe8d922fb693541dc88e6cc750503170a7b8c))

## [0.65.0](https://github.com/altertable-ai/data-app/compare/v0.64.0...v0.65.0) (2026-10-02)


### ⚠ BREAKING CHANGES

* **react:** add built-in CSV exports for analytical data apps ([#32](https://github.com/altertable-ai/data-app/issues/32))

### Features

* **bridge:** centralize postMessage contracts in a typed catalog ([#25](https://github.com/altertable-ai/data-app/issues/25)) ([7cb33a0](https://github.com/altertable-ai/data-app/commit/7cb33a03d2fa58279e42581e498a923c7c2f5ea0))
* **embed:** forward iframe logs to the host logger ([#24](https://github.com/altertable-ai/data-app/issues/24)) ([ee6e61a](https://github.com/altertable-ai/data-app/commit/ee6e61a9fd5d3f69b83b22aa0ade4be963b1da53))
* **react:** add built-in CSV exports for analytical data apps ([#32](https://github.com/altertable-ai/data-app/issues/32)) ([a0f49b8](https://github.com/altertable-ai/data-app/commit/a0f49b8e44584c9f7bd52c1beb85b2e708a577e7))
* **react:** standardize data app layout spacing ([#28](https://github.com/altertable-ai/data-app/issues/28)) ([1f81c95](https://github.com/altertable-ai/data-app/commit/1f81c9541ade3894c254b4cda84d8e802b51db3d)), closes [#27](https://github.com/altertable-ai/data-app/issues/27)


### Bug Fixes

* **embed:** isolate data apps from browser extension errors ([#31](https://github.com/altertable-ai/data-app/issues/31)) ([018e9ab](https://github.com/altertable-ai/data-app/commit/018e9ab46cbcac66e54964c03ccf3ce10053b563))
* **react:** enter browser fullscreen when presenting a story ([#30](https://github.com/altertable-ai/data-app/issues/30)) ([9ee0c2f](https://github.com/altertable-ai/data-app/commit/9ee0c2fd0f6a23300856bd9ea9aeae96ffbdb733))

## [0.64.0](https://github.com/altertable-ai/data-app/compare/v0.63.0...v0.64.0) (2026-10-01)


### Features

* **gallery:** compose gallery with data app components ([#20](https://github.com/altertable-ai/data-app/issues/20)) ([7afa6e2](https://github.com/altertable-ai/data-app/commit/7afa6e272287af7e206168538a8f2f27bce8529f))


### Bug Fixes

* **config:** enforce app authoring contracts through TypeScript ([#23](https://github.com/altertable-ai/data-app/issues/23)) ([2578a07](https://github.com/altertable-ai/data-app/commit/2578a0753cadb9edb5d028da28910a3f7f8a4762))
* **worker:** expose runtimeHtml ([#22](https://github.com/altertable-ai/data-app/issues/22)) ([a730048](https://github.com/altertable-ai/data-app/commit/a730048419b796ca7efc848b4e7df6ed0d6841f8))

## [0.63.0](https://github.com/altertable-ai/data-app/compare/v0.62.0...v0.63.0) (2026-10-01)


### ⚠ BREAKING CHANGES

* **api:** clarify public exports and consumer contracts ([#11](https://github.com/altertable-ai/data-app/issues/11))
* **react:** make style injection explicit for tree-shaking ([#12](https://github.com/altertable-ai/data-app/issues/12))

### Features

* **docs:** add a hosted starter and streamline data app guides ([#15](https://github.com/altertable-ai/data-app/issues/15)) ([ff964c0](https://github.com/altertable-ai/data-app/commit/ff964c02768710a1ac29ee9b96970e07bb580067))
* **react:** add shell style injection with shared widget styles ([#14](https://github.com/altertable-ai/data-app/issues/14)) ([c447cb1](https://github.com/altertable-ai/data-app/commit/c447cb11f6adcb164185a94d78f1698de7590d32))
* **react:** make style injection explicit for tree-shaking ([#12](https://github.com/altertable-ai/data-app/issues/12)) ([c90a2a9](https://github.com/altertable-ai/data-app/commit/c90a2a9d50dfa6b71c928d89acdb05d68a476c8f))


### Bug Fixes

* **ci:** add Markdown linting and link checks to CI ([#16](https://github.com/altertable-ai/data-app/issues/16)) ([0ca623d](https://github.com/altertable-ai/data-app/commit/0ca623dde330a768d304f7320dd82810953c3920))


### Code Refactoring

* **api:** clarify public exports and consumer contracts ([#11](https://github.com/altertable-ai/data-app/issues/11)) ([f4e162f](https://github.com/altertable-ai/data-app/commit/f4e162f03b224f7f468af4f5687b3c873d2a167a))

## [0.62.0](https://github.com/altertable-ai/data-app/compare/v0.61.0...v0.62.0) (2026-10-01)


### ⚠ BREAKING CHANGES

* **embed:** let parent shells own app presentation ([#9](https://github.com/altertable-ai/data-app/issues/9))
* unify iframe bridges and add data app skeleton ([#8](https://github.com/altertable-ai/data-app/issues/8))

### Features

* **client:** support browser-owned operations through SQL bridge ([#10](https://github.com/altertable-ai/data-app/issues/10)) ([6c70ae8](https://github.com/altertable-ai/data-app/commit/6c70ae832059221e19c1ce1e4cade2c74b68d9d4))
* **embed:** let parent shells own app presentation ([#9](https://github.com/altertable-ai/data-app/issues/9)) ([e447e84](https://github.com/altertable-ai/data-app/commit/e447e8471033c94949ac4b63bf7870b4d8936e42))
* unify iframe bridges and add data app skeleton ([#8](https://github.com/altertable-ai/data-app/issues/8)) ([9fe2ea2](https://github.com/altertable-ai/data-app/commit/9fe2ea2f122f769d2766d1357dd019ede1f4d98a))
* **worker:** add Cloudflare Worker deployment asset ([#4](https://github.com/altertable-ai/data-app/issues/4)) ([2b3503a](https://github.com/altertable-ai/data-app/commit/2b3503aea354b98ea665c5f40c79ca5ff74b748c))


### Bug Fixes

* **react:** port widget inspection and picker refinements ([#7](https://github.com/altertable-ai/data-app/issues/7)) ([2975dd5](https://github.com/altertable-ai/data-app/commit/2975dd59b865a6fcdef5dcc8a610743d962fa47c))

## [0.61.0](https://github.com/altertable-ai/data-app/compare/v0.60.0...v0.61.0) (2026-09-30)


### ⚠ BREAKING CHANGES

* **messages:** Hosts, apps, and bootstrap scripts must migrate together to colon-separated message names; unscoped and dot-separated names are no longer recognized.

### Features

* **examples:** port the CLI starter to public package APIs ([4a1d82f](https://github.com/altertable-ai/data-app/commit/4a1d82f1e71c34e0144ab9bef220f26d2231ec44))


### Bug Fixes

* **examples:** refresh built exports before starter checks ([b22552d](https://github.com/altertable-ai/data-app/commit/b22552d263f1dd725f164d4ced553d1016b4d071))
* **release:** keep breaking changes on minor versions before 1.0 ([4c6959a](https://github.com/altertable-ai/data-app/commit/4c6959afe816940772ed8f45c679f9fb8515accb))


### Code Refactoring

* **messages:** standardize scoped protocol names ([9be3ef7](https://github.com/altertable-ai/data-app/commit/9be3ef7e727190234d438f62f91ceb725c3bf6c8))

## [0.60.0](https://github.com/altertable-ai/data-app/compare/v0.59.1...v0.60.0) (2026-09-30)


### Features

* **data-app:** establish the standalone runtime package ([9bf70e7](https://github.com/altertable-ai/data-app/commit/9bf70e7f18ea23d5095931d02a6b75507e6ae424))
* **embed:** publish a standalone bootstrap script ([0774780](https://github.com/altertable-ai/data-app/commit/0774780c51152847dddf7f22a8a2ae9258e5ec63))
* **react:** port shared widgets and typed authoring APIs ([9dc15e6](https://github.com/altertable-ai/data-app/commit/9dc15e6820c849859ad995ff3d9bfd421365206c))


### Bug Fixes

* **ci:** build package before checking public fixtures ([1c29332](https://github.com/altertable-ai/data-app/commit/1c2933230194cf595b92e847dc4519a9d79cc8d8))
* **ci:** preserve the generated release changelog format ([b0ec6cd](https://github.com/altertable-ai/data-app/commit/b0ec6cda94eb9b1daa870a1c1ffbbdf302b3e211))
* **client:** retry failed preview verification safely ([03fc981](https://github.com/altertable-ai/data-app/commit/03fc9819737843fa23cdec3e9ef58fd59c1d9c62))
* **react:** isolate previous data by operation identity ([04c7a08](https://github.com/altertable-ai/data-app/commit/04c7a080d1a2fbb1176f096b8e18c41e6f0dd5c6))
* **server:** bound request bodies while streaming ([fc92cef](https://github.com/altertable-ai/data-app/commit/fc92cef921a4162e79086a2c857db20dcadc2866))
* **server:** observe cancellation before operation startup ([5efa928](https://github.com/altertable-ai/data-app/commit/5efa9289f70a2a131552bf5295d54d1b491fc698))
