# Changelog

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
