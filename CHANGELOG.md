# Changelog

All notable changes to `@ezoic/angular-sdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `EzoicAdComponent` (`<ezoic-ad>`) — a standalone component that renders a bare
  `ezoic-pub-ad-placeholder-<id>` div (ids 1–999, no styling of its own), with `required` and
  `sizes` inputs mapping to the verified `showAds` object form. Placeholders mounted in the same tick
  are coalesced into a single `showAds(...)` call (the runtime applies its own debounce on top);
  destroying a component tears its placeholder down via `destroyPlaceholders`. Ids are
  reference-counted, so a duplicate mounted id warns and tears down only once. SSR-safe: the div
  renders on the server and ad requests happen only in the browser.
- `EzoicService` display passthroughs — `showAds`, `displayMore`, `destroyPlaceholders`,
  `destroyAll`, `refreshAds` and `isEzoicUser`, each queued on `ezstandalone.cmd` and a no-op during
  server-side rendering, for imperative and dynamic-content (infinite-scroll) flows.
- `EzoicPlaceholder` and `EzoicPlaceholderArg` types describing the `showAds` argument forms.
- `provideEzoic(options)` — `ApplicationConfig` providers that inject the Ezoic scripts at
  application startup in the required order: the two consent (CMP) scripts (each with
  `data-cfasync="false"` set before `src`), the `ezstandalone` command-queue stub, the async
  `sa.min.js` header bundle, then the optional analytics script. Idempotent (never double-injects,
  tolerates scripts already present in the host HTML, including protocol-relative tags) and SSR-safe
  (no-op on the server, touches no `window`/`document`).
- `EzoicService` — a `providedIn: 'root'` service exposing a `ready` signal, an `isBrowser` flag and
  a `push(fn)` helper that buffers work on `ezstandalone.cmd` (no-op during server-side rendering).
- `EzoicOptions` (with `cmp`, `scriptUrl`, `analytics`, `analyticsScriptUrl`), the `EZOIC_OPTIONS` DI
  token, the `EZOIC_SA_SCRIPT_URL` / `EZOIC_CMP_SCRIPT_URLS` / `EZOIC_ANALYTICS_SCRIPT_URL` constants,
  and the `EzoicCommand` / `Ezstandalone` runtime types.
- Initial Angular library package skeleton (`@ezoic/angular-sdk`) built with ng-packagr (Angular
  Package Format), targeting Angular 20–22 with standalone-first APIs (no NgModule required).
- TypeScript strict configuration, ESLint (angular-eslint flat config) + Prettier, and a karma-free
  Jest test setup (jest-preset-angular, jsdom).
- GitHub Actions CI (format check, lint, test, build and `npm pack` verification) on a Node 20 and
  22 matrix.
- Verified placeholder-id primitives: `EZOIC_PLACEHOLDER_ID_PREFIX`, `MIN_PLACEHOLDER_ID`,
  `MAX_PLACEHOLDER_ID`, `isValidPlaceholderId`, `placeholderElementId`.
- `EZOIC_SDK_VERSION` export, kept in sync with the package manifest via a unit test.

[Unreleased]: https://github.com/ezoic/ezoic-angular-sdk/commits/master
