# Changelog

All notable changes to `@ezoic/angular-sdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `EzoicVideoComponent` (`<ezoic-video>`) — a standalone component that renders a bare
  `<div id="<divId>">` (publisher-chosen id, no styling of its own; the publisher sizes it with
  their own CSS) for an Ezoic outstream/instream video placeholder. Video divs mounted in the same
  tick are coalesced into a single `displayMoreVideo(...)` call, which both appends the divs to the
  video registry and loads them; destroying a component tears its placeholder down via
  `destroyVideoPlaceholders`. Div ids are reference-counted, so a duplicate mounted id warns and
  tears down only once. An empty `divId` throws at render time. SSR-safe: the div renders on the
  server and video loads happen only in the browser.
- `EzoicVideoEmbedComponent` (`<ezoic-video-embed>`) — a standalone Open Video inline embed. It uses
  its own host element as the embed target (publisher sizes `ezoic-video-embed` directly). On init
  in the browser it injects `https://open.video/video.js` once (deduplicated by host + pathname) and
  pushes an entry onto `window.openVideoPlayers` — the canonical Open Video embed global — with the
  verified `videoID` casing. Inputs: `videoId` (required; empty throws), and optional `playlist`,
  `float` and `autoplay` (omitted from the entry when unset). SSR-safe: no script is injected and no
  browser global is touched on the server.
- `EzoicService` video passthroughs — `defineVideo(...entries)` (clears the video registry and
  registers entries WITHOUT loading them), `displayMoreVideo(...entries)` (appends entries AND loads
  them — the video load call) and `destroyVideoPlaceholders(...divIds)`. Each entry is a video div-id
  string or `{ divID }`; each method is queued on `ezstandalone.cmd` and a no-op during server-side
  rendering. New `EzoicVideoDefinition` and `EzoicOpenVideoEntry` types and an
  `EZOIC_OPEN_VIDEO_SCRIPT_URL` constant.
- Rewarded ads via `withRewardedAds({ loaderUrl })` — a `provideEzoic` feature that injects the
  site-specific rewarded loader (`{host}/porpoiseant/ezadloadrewarded.js`) at startup and enables
  `EzoicRewardedService`. The `loaderUrl` comes from the publisher's Ezoic integration; the SDK does
  not hardcode it. New `RewardedAdsConfig` type. No-op during server-side rendering.
- `EzoicRewardedService` — wraps the separate `window.ezRewardedAds` runtime and its own command
  queue: `request(config?)`, `show(config?)`, `requestAndShow(config?)`,
  `requestWithOverlay(text?, config?)` and `contentLocker(action, config?)`. Each method returns a
  Promise that resolves to a non-granting fallback (`status: false`, and `reward: false` where
  applicable) — during server-side rendering, before initialization, when the runtime cannot be
  reached, when the runtime method is missing, or when a runtime call throws — rather than leaving the
  Promise pending.
  A `status` signal tracks the runtime lifecycle (`'idle'` → `'initiated'` → `'displayed'` →
  `'closed'`) from the `ezRewardedInitiated`/`ezRewardedDisplayed`/`ezRewardedClosed` window events;
  `contentLocker` preserves a caller-supplied `readyCallback`. New rewarded types
  (`EzoicRewardedRequestConfig`, `EzoicRewardedShowConfig`, `EzoicRewardedRequestAndShowConfig`,
  `EzoicRewardedOverlayText`, `EzoicRewardedOverlayConfig`, `EzoicRewardedContentLockerAction`,
  `EzoicRewardedContentLockerCallToAction`, `EzoicRewardedContentLockerConfig`,
  `EzoicRewardedRequestOutcome`, `EzoicRewardedShowOutcome`, `EzoicRewardedStatus`,
  `EzoicRewardedPlacements`, `EzoicRewardedApi`).
- `EzoicService.initRewardedAds(placements?)` — configures which site-wide rewarded placements
  (`anchor`, `interstitial`, `video`, `sideRails`) the runtime enables. Queued on the command queue
  and a no-op during server-side rendering.
- Consent and privacy passthroughs on `EzoicService` — `enableConsent()`,
  `setDisablePersonalizedAds(disable)` and `setDisablePersonalizedStatistics(disable)`, each queued on
  the command queue and a no-op during server-side rendering.
- Typed runtime configuration on `EzoicService` — `config(options)` accepts only the verified keys
  (`anchorAdPosition`, `anchorAdExpansion`, `disableVideo`, `disableInterstitial`,
  `disableLeftSideRail`, `disableRightSideRail`, `disableSidebarFloating`, `reservePlaceholderSpace`,
  `limitCookies`, `vignetteDesktop`/`vignetteMobile`/`vignetteTablet`), so unknown keys are rejected at
  compile time as well as by the runtime. `config` is write-only: the runtime's public `config` entry
  point discards its return value, so the current configuration cannot be read back. New `EzoicConfig`
  type.
- Ad-format toggles on `EzoicService` — `setEzoicAnchorAd(enabled)` / `hasAnchorAdBeenClosed()`,
  `setInterstitialAllowed(allowed, options?)` / `isInterstitialAllowed()`, and
  `setOutstreamAllowed(allowed, options?)` / `isOutstreamAllowed()`. The getters return promises that
  resolve once the runtime is ready and to a safe default (`false`) during server-side rendering.
- `EzoicConsentService` — exposes the active CMP's IAB TCF v2.2 consent state as signals (`ready`,
  `tcString`, `gdprApplies`, `eventStatus`). It registers a TCF event listener via `window.__tcfapi`
  once the CMP loads (polling briefly for it) and removes it on teardown. All state stays at its
  initial values during server-side rendering. New `TcfData` and `TcfEventStatus` types.
- Zero-config placements on `<ezoic-ad>` — a `location` input (for example
  `location="under_first_paragraph"`) resolves a semantic location name to a reserved 900–999
  placeholder id. When the runtime has loaded it resolves DOM-aware via
  `ezstandalone.GetGeneratedIdAsync`; before then it falls back to the SDK's static name-to-id map
  (all documented location names and aliases). Provide exactly one of `[id]` or `location` (an error
  is thrown otherwise). Resolved ids flow through the same batching and teardown path as `[id]`;
  unknown location names warn and request no ad. Location placements default to `required: true`
  (opt out via `[required]="false"`) and should pass `[sizes]` (a dev-mode warning is logged when
  omitted), because zero-config 900–999 placeholders have no dashboard-configured sizing.
  Location placeholders resolve in the browser only, so their div is not rendered during
  server-side rendering.
- `EzoicService.resolveLocationId(location)` — resolves a semantic location name to a placeholder id
  (runtime helper when available, static map otherwise); returns `null` for an unknown name and
  during server-side rendering.
- `withRouterRefresh()` — a `provideEzoic` feature that enables single-page-application ad handling
  for Angular Router apps. At boot it marks the page as an SPA
  (`setIsSinglePageApplication(true)`), so a `showAds` on a new pageview routes through the runtime's
  refresh flow. With `<ezoic-ad>` components no per-route wiring is needed — component mount/unmount
  already drives `showAds`/`destroyPlaceholders`. Pass `{ placeholderIds }` to also refresh
  imperative placements on each `NavigationEnd` (first navigation requests them; later navigations
  tear down the previous set and re-request inside `requestAnimationFrame`). The SDK never calls
  `newPage()` itself, coalescing with the runtime's own `pushState`/`replaceState` detection to avoid
  double-firing. No-op during server-side rendering; `@angular/router` is an optional peer dependency
  used only when the feature is added.
- `EzoicService` SPA passthroughs — `setIsSinglePageApplication`, `setAutoRefresh` and `newPage`,
  each queued on `ezstandalone.cmd` and a no-op during server-side rendering.
- `EzoicFeature` / `EzoicFeatureKind` types and a variadic `provideEzoic(options, ...features)`
  signature so optional capabilities can be composed into the application providers.
- `EzoicAdComponent` (`<ezoic-ad>`) — a standalone component that renders a bare
  `ezoic-pub-ad-placeholder-<id>` div (ids 1–999, no styling of its own), with `required` and
  `sizes` inputs mapping to the verified `showAds` object form. Placeholders mounted in the same tick
  are coalesced into a single `showAds(...)` call (the runtime applies its own debounce on top);
  destroying a component tears its placeholder down via `destroyPlaceholders`. Ids are
  reference-counted, so a duplicate mounted id warns and tears down only once. A dev-mode console
  warning is logged when a placement is requested without `sizes` (standalone placeholders have no
  dashboard-configured sizing). SSR-safe: the div renders on the server and ad requests happen only
  in the browser.
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
