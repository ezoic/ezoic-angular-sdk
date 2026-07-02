# @ezoic/angular-sdk

Official Ezoic SDK for Angular. It wraps the Ezoic `ezstandalone` client integration so Angular
apps can manage ad scripts, placeholders, SPA navigation, consent (CMP), display ads, rewarded ads
and video with idiomatic standalone components, providers and services.

[![CI](https://github.com/ezoic/ezoic-angular-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/ezoic/ezoic-angular-sdk/actions/workflows/ci.yml)

> **Status: early development (0.x).** The package is being built incrementally toward full feature
> coverage. The API is not yet stable and the package is not yet published to npm. See the
> [changelog](./CHANGELOG.md) and [roadmap](#roadmap).

## Requirements

- Angular 20, 21 or 22
- Node.js 20 or newer (for local development)

## Installation

The package is not yet published to the npm registry. To try it today, build it from source (see
[Development](#development)) and install the packed tarball:

```bash
npm run build
cd dist/angular-sdk && npm pack   # produces ezoic-angular-sdk-<version>.tgz
# then in your app:
npm install /path/to/ezoic-angular-sdk-<version>.tgz
```

Once published, installation will be:

```bash
npm install @ezoic/angular-sdk
```

## Quickstart

Register the SDK once in your application config. `provideEzoic()` injects the Ezoic scripts in the
required order — the two consent (CMP) scripts first (each with `data-cfasync="false"`), then the
`ezstandalone` command-queue stub, then the async `sa.min.js` header bundle, then the analytics
script — at application startup, in the browser only.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideEzoic } from '@ezoic/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [provideEzoic()],
};
```

Then use `EzoicService` to queue work on the Ezoic command queue. `push` is safe to call before the
header script has loaded (the function is buffered and run in order once the runtime is ready) and is
a no-op during server-side rendering:

```ts
import { Component, inject } from '@angular/core';
import { EzoicService } from '@ezoic/angular-sdk';

@Component({ selector: 'app-root', standalone: true, template: '' })
export class AppComponent {
  private readonly ezoic = inject(EzoicService);

  ready = this.ezoic.ready; // signal<boolean>: true once scripts are injected (browser only)
}
```

### Options

`provideEzoic(options)` accepts:

| Option               | Default                  | Description                                                          |
| -------------------- | ------------------------ | -------------------------------------------------------------------- |
| `cmp`                | `true`                   | Inject the two Ezoic consent (CMP) scripts before the header script. |
| `scriptUrl`          | Ezoic `sa.min.js` URL    | Override the header bundle URL (e.g. to pin a specific build).       |
| `analytics`          | `true`                   | Inject the Ezoic analytics script after the header script.           |
| `analyticsScriptUrl` | Ezoic `analytics.js` URL | Override the analytics script URL.                                   |

Only disable `cmp` if your site already loads an Ezoic-compatible TCF consent manager — the SDK never
reorders consent after the header script.

### Server-side rendering

`provideEzoic()` is SSR-safe: on the server it injects nothing and touches no `window`/`document`
globals, so it works unchanged with Angular's built-in SSR and Angular Universal.

### Idempotency

Script injection is idempotent. A script already present in the host HTML (including a
protocol-relative `//host/path` tag) is detected and never duplicated, and the command-queue stub is
injected at most once.

## Display ads

Drop an `<ezoic-ad>` component wherever you want a placeholder. It renders a bare
`<div id="ezoic-pub-ad-placeholder-<id>">` — the element the Ezoic runtime scans for — with no
styling of its own:

```ts
import { Component } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';

@Component({
  selector: 'app-article',
  imports: [EzoicAdComponent],
  template: `
    <ezoic-ad [id]="101" />
    <p>…article content…</p>
    <ezoic-ad [id]="102" required [sizes]="['728x90', '320x50']" />
  `,
})
export class ArticleComponent {}
```

- **Ids** are integers in the range 1–999 (900–999 are reserved for the zero-config semantic
  placements described below). An out-of-range id throws at render time so the mistake surfaces
  immediately.
- **Batching:** every `<ezoic-ad>` that initializes in the same tick is coalesced into a single
  `showAds(...)` call. The Ezoic runtime applies its own debounce on top, so the SDK adds no extra
  timer.
- **`required` / `sizes`** map to the verified `showAds` object form
  (`{ id, required, sizes }`); each size is `WIDTHxHEIGHT` (for example `"728x90"`).
- **Teardown:** when a component is destroyed the placeholder is torn down via
  `destroyPlaceholders(id)`. Ids are reference-counted, so mounting the same id twice logs a warning
  (ids must be unique on a page) and tears down only once.
- **SSR:** the placeholder `<div>` renders on the server; ad requests happen only in the browser.

### Zero-config placements

Instead of assigning a numeric id, place an ad by intent with the `location` input. The SDK resolves
the semantic name to a reserved 900–999 placeholder id:

```ts
@Component({
  selector: 'app-article',
  imports: [EzoicAdComponent],
  template: `
    <ezoic-ad location="top_of_page" />
    <p>…first paragraph…</p>
    <ezoic-ad location="under_first_paragraph" />
    <p>…more content…</p>
    <ezoic-ad location="mid_content" />
  `,
})
export class ArticleComponent {}
```

- Provide **exactly one** of `[id]` or `location` on a component; supplying both or neither throws.
- When the Ezoic runtime has loaded, resolution goes through `ezstandalone.GetGeneratedIdAsync`
  (DOM-aware). Before then the SDK falls back to a built-in static name-to-id map, so placements
  work even during the first paint.
- Common location names: `top_of_page`, `under_page_title`, `bottom_of_page`,
  `under_first_paragraph`, `under_second_paragraph`, `mid_content`, `long_content`,
  `sidebar`, `sidebar_middle`, `sidebar_bottom`, `sidebar_floating_1`, and `incontent_5` …
  `incontent_88`. Aliases such as `incontent_0` (→ `under_second_paragraph`) are also accepted.
- An unrecognized location name logs a warning and requests no ad. Resolved placeholders batch and
  tear down exactly like id-based ones.
- **SSR:** location placeholders resolve in the browser, so their `<div>` is not rendered on the
  server (id-based placeholders still render server-side).

### Imperative and dynamic content

For infinite scroll, dynamically injected content or manual control, `EzoicService` exposes the
verified runtime methods. Each runs inside the command queue (safe before the runtime loads) and is a
no-op during server-side rendering:

```ts
import { Component, inject } from '@angular/core';
import { EzoicService } from '@ezoic/angular-sdk';

@Component({ selector: 'app-feed', template: '' })
export class FeedComponent {
  private readonly ezoic = inject(EzoicService);

  loadMore(): void {
    // Request placeholders added after the initial page load.
    this.ezoic.displayMore(105, 106);
  }
}
```

| Method                               | Purpose                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `showAds(...placeholders)`           | Request placeholders (id or `{ id, required?, sizes? }`).          |
| `displayMore(...ids)`                | Request additional placeholders after the initial load.            |
| `destroyPlaceholders(...ids)`        | Tear down specific placeholders.                                   |
| `destroyAll()`                       | Tear down every placeholder plus anchor, side rails and outstream. |
| `refreshAds(...ids)`                 | Re-request bids for the given header-bidding placeholders.         |
| `isEzoicUser(callback, percentage?)` | Report A/B group membership to `callback` once the runtime loads.  |

## Single-page application routing

Add the `withRouterRefresh()` feature to `provideEzoic` so ads behave correctly across Angular
Router navigations. At startup it marks the page as a single-page application
(`setIsSinglePageApplication(true)`), so a `showAds` on a new pageview routes through the runtime's
refresh flow instead of a first-load:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideEzoic, withRouterRefresh } from '@ezoic/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideEzoic({}, withRouterRefresh())],
};
```

- **With `<ezoic-ad>` components** that is all you need: each route's components mount and unmount on
  navigation, which already issues `showAds` for the arriving placeholders and `destroyPlaceholders`
  for the departing ones.
- **No double-fire:** the SDK never calls `newPage()` itself. The Ezoic runtime already detects the
  `history.pushState`/`replaceState` calls Angular Router makes and fires `newPage()` on its own
  (debounced), so the SDK coalesces with it rather than triggering a second pageview.
- **Imperative placements:** if you place ads without `<ezoic-ad>`, pass the ids to refresh on every
  navigation. On the first navigation they are requested; on each later navigation the previous set
  is torn down and re-requested inside `requestAnimationFrame` (so the new route's DOM is present).
  Do not combine this with `<ezoic-ad>` for the same ids — that would request them twice.

  ```ts
  provideEzoic({}, withRouterRefresh({ placeholderIds: [101, 102] }));
  ```

- **Opt out** by simply not adding the feature. `withRouterRefresh()` is a no-op during server-side
  rendering, and requires `@angular/router` only when you use it (it is an optional peer dependency).

## Consent, privacy and configuration

The SDK injects the Ezoic consent-management scripts first by default (see [Options](#options)), so
most sites need no extra consent code. For finer control, `EzoicService` exposes the verified consent
and configuration methods, and `EzoicConsentService` reads the CMP's TCF state.

### Consent and privacy passthroughs

```ts
import { Component, inject } from '@angular/core';
import { EzoicService } from '@ezoic/angular-sdk';

@Component({/* ... */})
export class PrivacyControls {
  private readonly ezoic = inject(EzoicService);

  optOut(): void {
    this.ezoic.setDisablePersonalizedAds(true);
    this.ezoic.setDisablePersonalizedStatistics(true);
  }
}
```

- `enableConsent()` — signal that the publisher manages consent (a CMP is present).
- `setDisablePersonalizedAds(disable)` / `setDisablePersonalizedStatistics(disable)` — visitor opt-out.

Each is queued on the command queue and is a no-op during server-side rendering.

### Typed runtime configuration

`config(options)` accepts only the verified keys (the runtime ignores unknown keys, so typos are also
caught at compile time). It is write-only: the runtime's public `config` entry point forwards the
options but does not return the current configuration, so track the values you set in your own
application state if you need to read them back.

```ts
this.ezoic.config({
  anchorAdPosition: 'top',
  reservePlaceholderSpace: true,
  disableInterstitial: true,
});
```

Accepted keys: `anchorAdPosition`, `anchorAdExpansion`, `disableVideo`, `disableInterstitial`,
`disableLeftSideRail`, `disableRightSideRail`, `disableSidebarFloating`, `reservePlaceholderSpace`,
`limitCookies`, `vignetteDesktop`, `vignetteMobile`, `vignetteTablet`.

### Ad-format toggles

- `setEzoicAnchorAd(enabled)` and `hasAnchorAdBeenClosed()` (resolves the closed state).
- `setInterstitialAllowed(allowed, options?)` and `isInterstitialAllowed()`.
- `setOutstreamAllowed(allowed, options?)` and `isOutstreamAllowed()`.

The getters return promises that resolve once the runtime is ready (and to a safe default — `false` or
an empty config — during server-side rendering).

### Reading TCF consent state

`EzoicConsentService` surfaces the active CMP's IAB TCF v2.2 state as signals. It registers a TCF
event listener as soon as the CMP loads and removes it on teardown:

```ts
import { Component, effect, inject } from '@angular/core';
import { EzoicConsentService } from '@ezoic/angular-sdk';

@Component({/* ... */})
export class ConsentBadge {
  private readonly consent = inject(EzoicConsentService);

  constructor() {
    effect(() => {
      if (this.consent.ready()) {
        console.log('TC string', this.consent.tcString(), 'gdpr', this.consent.gdprApplies());
      }
    });
  }
}
```

Signals: `ready` (a usable TC string is available), `tcString`, `gdprApplies`, `eventStatus`. All stay
at their initial values during server-side rendering. Adapt them to observables with `toObservable`
from `@angular/core/rxjs-interop` if you prefer RxJS.

## Rewarded ads

Rewarded ads let a visitor opt in to watch an ad in exchange for a reward (unlocking content,
in-app currency, and so on). They run on a runtime separate from `ezstandalone`
(`window.ezRewardedAds`) loaded by a **site-specific** script. Enable them by adding the
`withRewardedAds({ loaderUrl })` feature to `provideEzoic`:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideEzoic, withRewardedAds } from '@ezoic/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [
    provideEzoic(
      {},
      withRewardedAds({
        loaderUrl: 'https://example.com/porpoiseant/ezadloadrewarded.js',
      }),
    ),
  ],
};
```

- **Where the loader URL comes from:** it is the `{your-ad-host}/porpoiseant/ezadloadrewarded.js`
  script from your Ezoic integration (the rewarded snippet in your Ezoic dashboard). The host is
  per-site, so the SDK never hardcodes it — supply your own. Replace the `https://example.com/...`
  placeholder above with your real ad host.

Then inject `EzoicRewardedService` and request a rewarded ad. `requestAndShow()` requests and shows
in a single call and resolves with the outcome:

```ts
import { Component, inject } from '@angular/core';
import { EzoicRewardedService } from '@ezoic/angular-sdk';

@Component({ selector: 'app-unlock', template: '' })
export class UnlockComponent {
  private readonly rewarded = inject(EzoicRewardedService);

  status = this.rewarded.status; // signal: 'idle' | 'initiated' | 'displayed' | 'closed'

  async unlock(): Promise<void> {
    const outcome = await this.rewarded.requestAndShow({ rewardName: 'article-unlock' });
    if (outcome.reward) {
      // Grant the reward — the user completed the ad.
    }
  }
}
```

`EzoicRewardedService` methods (each returns a Promise):

| Method                               | Resolves with                                        |
| ------------------------------------ | ---------------------------------------------------- |
| `request(config?)`                   | `{ status, msg, adInfo? }` — is an ad ready to show. |
| `show(config?)`                      | `{ status, reward, msg, adInfo?, userInfo? }`.       |
| `requestAndShow(config?)`            | `{ status, reward, msg, adInfo?, userInfo? }`.       |
| `requestWithOverlay(text?, config?)` | `{ status, reward, msg, adInfo?, userInfo? }`.       |
| `contentLocker(action, config?)`     | `{ status, msg, adInfo? }` via `readyCallback`.      |

- **`status` signal** tracks the runtime's lifecycle from the `ezRewardedInitiated`,
  `ezRewardedDisplayed` and `ezRewardedClosed` window events.
- **Site-wide placements:** `EzoicService.initRewardedAds({ anchor, interstitial, video, sideRails })`
  configures which rewarded placements the runtime enables site-wide (omitted keys default to
  enabled).
- **Safety:** during server-side rendering, before the feature initializes, when the runtime is
  unavailable, or if a runtime call throws, the Promise resolves to a **non-granting** outcome
  (`status: false`, and `reward: false` where applicable), so you never grant a reward by accident.
- **SSR:** no loader is injected and no browser global is touched on the server.

## What's included

Verified, framework-agnostic primitives and the provider/service layer:

- `provideEzoic(options)` — `ApplicationConfig` providers that inject the Ezoic scripts at startup.
- `EzoicService` — `ready` signal, `push(fn)` command-queue helper, `isBrowser` flag, display
  passthroughs (`showAds`, `displayMore`, `destroyPlaceholders`, `destroyAll`, `refreshAds`,
  `isEzoicUser`), consent/privacy passthroughs (`enableConsent`, `setDisablePersonalizedAds`,
  `setDisablePersonalizedStatistics`), typed `config` setter, and ad-format toggles
  (`setEzoicAnchorAd`, `hasAnchorAdBeenClosed`, `setInterstitialAllowed`, `isInterstitialAllowed`,
  `setOutstreamAllowed`, `isOutstreamAllowed`).
- `EzoicConsentService` — CMP TCF v2.2 consent state as signals (`ready`, `tcString`, `gdprApplies`,
  `eventStatus`).
- `EzoicAdComponent` (`<ezoic-ad>`) — declarative display placeholder with same-tick batching and
  automatic teardown; accepts either a numeric `[id]` or a semantic `location` (zero-config).
- `EzoicService.resolveLocationId(location)` — resolves a semantic location name to a placeholder id.
- `withRouterRefresh(config?)` — provider feature that enables single-page-application ad handling
  for Angular Router apps (and the `EzoicFeature` / `RouterRefreshConfig` types).
- `withRewardedAds({ loaderUrl })` — provider feature that enables rewarded ads by injecting the
  site-specific rewarded loader at startup (and the `RewardedAdsConfig` type).
- `EzoicRewardedService` — rewarded-ads runtime wrapper: `request`, `show`, `requestAndShow`,
  `requestWithOverlay`, `contentLocker` (each resolving to a non-granting fallback when unavailable),
  a `status` signal, and an `isBrowser` flag. Plus the rewarded types (`EzoicRewardedRequestConfig`,
  `EzoicRewardedShowConfig`, `EzoicRewardedRequestAndShowConfig`, `EzoicRewardedOverlayText`,
  `EzoicRewardedOverlayConfig`, `EzoicRewardedContentLockerAction`,
  `EzoicRewardedContentLockerCallToAction`, `EzoicRewardedContentLockerConfig`,
  `EzoicRewardedRequestOutcome`, `EzoicRewardedShowOutcome`, `EzoicRewardedStatus`,
  `EzoicRewardedPlacements`, `EzoicRewardedApi`).
- `EzoicService.initRewardedAds(placements?)` — configures site-wide rewarded placements.
- Script URL constants: `EZOIC_SA_SCRIPT_URL`, `EZOIC_CMP_SCRIPT_URLS`, `EZOIC_ANALYTICS_SCRIPT_URL`.
- `EZOIC_OPTIONS` DI token and the `EzoicOptions` / `EzoicConfig` / `EzoicCommand` / `EzoicPlaceholder` /
  `EzoicPlaceholderArg` / `Ezstandalone` / `TcfData` / `TcfEventStatus` types.
- `EZOIC_SDK_VERSION` — the package version.
- Placeholder id contract helpers:
  - `EZOIC_PLACEHOLDER_ID_PREFIX` — `"ezoic-pub-ad-placeholder-"`.
  - `MIN_PLACEHOLDER_ID` / `MAX_PLACEHOLDER_ID` — `1` / `999`.
  - `isValidPlaceholderId(id)` — validates a placeholder id.
  - `placeholderElementId(id)` — builds the placeholder element id.

```ts
import { isValidPlaceholderId, placeholderElementId } from '@ezoic/angular-sdk';

isValidPlaceholderId(101); // true
placeholderElementId(101); // 'ezoic-pub-ad-placeholder-101'
```

Video wrappers are on the roadmap below.

## Roadmap

1. Package skeleton — done
2. Provider + script management (`provideEzoic`) — done
3. Display ads (`<ezoic-ad>`) — done
4. SPA routing integration (`withRouterRefresh`) — done
5. Zero-config placements (location names) — done
6. CMP / consent + config — done
7. Rewarded ads — done
8. Video (Ezoic outstream/instream + Humix) — current
9. Docs + demo app

## Development

```bash
npm install
npm run lint         # ESLint (angular-eslint flat config)
npm run format:check # Prettier
npm test             # Jest (jest-preset-angular, jsdom)
npm run build        # ng-packagr build to dist/angular-sdk
```

The build output in `dist/angular-sdk` is the publishable package (Angular Package Format).

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npm test` and `npm run build`
before submitting.

## Ad integration reference

For the underlying Ezoic ad integration that this SDK wraps, see the official Ezoic documentation:
<https://docs.ezoic.com/docs/ezoicads/integration/>

## License

[MIT](./LICENSE)
