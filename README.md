# @ezoic/angular-sdk

Official Ezoic SDK for Angular. It wraps the Ezoic `ezstandalone` client integration so Angular
apps can manage ad scripts, placeholders, SPA navigation, consent (CMP), display ads, rewarded ads
and video with idiomatic standalone components, providers and services.

[![CI](https://github.com/ezoic/ezoic-angular-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/ezoic/ezoic-angular-sdk/actions/workflows/ci.yml)

> **Status: v1.0.0 — feature-complete.** Ships display ads, SPA routing, zero-config placements,
> CMP/consent, rewarded ads, and video, matching the full feature roadmap below. The package is not
> yet published to the npm registry (publishing is a manual step). See the
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

See [Server-side rendering (SSR)](#server-side-rendering-ssr) for the full guide.

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
    <ezoic-ad [id]="102" />
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
  (`{ id, required, sizes }`); each size is `WIDTHxHEIGHT` (for example `"728x90"`). An explicit
  `[id]` maps to a placeholder whose ad sizes can be configured in the Ezoic dashboard, so
  `[sizes]` is optional for id-based placements (no warning).
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
    <ezoic-ad location="top_of_page" required [sizes]="['728x90', '320x50']" />
    <p>…first paragraph…</p>
    <ezoic-ad location="under_first_paragraph" required [sizes]="['300x250']" />
    <p>…more content…</p>
    <ezoic-ad location="mid_content" required [sizes]="['300x250']" />
  `,
})
export class ArticleComponent {}
```

- Provide **exactly one** of `[id]` or `location` on a component; supplying both or neither throws.
- Location placements default to `required: true` (opt out with `[required]="false"`) and MUST pass
  `[sizes]` (a dev-mode warning is logged when omitted), because zero-config 900–999 placeholders
  have no dashboard-configured sizing — the client-passed sizes are the forced sizes.
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
(`window.ezRewardedAds`). Enable them by adding the `withRewardedAds()` feature to `provideEzoic` —
no loader URL required:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideEzoic, withRewardedAds } from '@ezoic/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [provideEzoic({}, withRewardedAds())],
};
```

- **No loader URL on Ezoic JS-integrated pages:** because this SDK bootstraps the Ezoic header
  scripts, the default mode calls `ezstandalone.initRewardedAds(...)` and the Ezoic runtime serves
  the host-correct rewarded loader (with your domain config) inside its own response and drains the
  rewarded command queue. You do not supply, and should not hardcode, a per-site loader URL. The
  init call is **deferred, not fired at boot**: the runtime's `initRewardedAds` runs `showAds([12])`
  internally, and issuing that before the page's first `showAds` has started the initial ad load
  wedges the whole page. The SDK waits until the initial ad load has started — detected via the
  `/sa.go` ad request in resource timing, a GPT container rendered inside an Ezoic placeholder, or
  `ezstandalone.enabled` when a publisher opts into the public `enable()` — before dispatching, or,
  on a rewarded-only page with no display ads mounted, fires after a short grace window.
- **Scope the placements (optional):** pass `{ placements: { anchor, interstitial, video, sideRails } }`
  to control which site-wide rewarded placements the runtime enables (omitted keys default to
  enabled).
- **Escape hatch — `withRewardedAds({ loaderUrl })`:** only for pages that are **not** Ezoic
  JS-integrated (they do not load `sa.min.js` through this SDK). It injects the site-specific
  `{your-ad-host}/porpoiseant/ezadloadrewarded.js` script (from your Ezoic dashboard rewarded
  snippet) as a `<script>` tag instead of letting the runtime serve it. `placements` is ignored in
  this mode.

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
- **Site-wide placements:** the default `withRewardedAds({ placements })` schedules
  `EzoicService.initRewardedAds({ anchor, interstitial, video, sideRails })` for you (deferred until
  the initial ad load has started, so it never preempts it — see above); call it directly if you
  need to reconfigure the runtime's site-wide rewarded placements later (omitted keys default to
  enabled).
- **Safety:** during server-side rendering, before the feature initializes, when the runtime is
  unavailable, or if a runtime call throws, the Promise resolves to a **non-granting** outcome
  (`status: false`, and `reward: false` where applicable), so you never grant a reward by accident.
- **SSR:** no loader is injected and no browser global is touched on the server.

## Video

The SDK ships two independent video paths.

### Ezoic video placeholders (`<ezoic-video>`)

Drop an `<ezoic-video>` component where you want an Ezoic outstream/instream video placeholder. It
renders a bare `<div id="<divId>">` with no styling of its own; you choose the div id and size it
with your own CSS:

```ts
import { Component } from '@angular/core';
import { EzoicVideoComponent } from '@ezoic/angular-sdk';

@Component({
  selector: 'app-article',
  imports: [EzoicVideoComponent],
  template: `<ezoic-video divId="my-video-1" />`,
  styles: [
    `
      #my-video-1 {
        width: 100%;
        max-width: 640px;
        aspect-ratio: 16 / 9;
      }
    `,
  ],
})
export class ArticleComponent {}
```

- **Requires page-level ads first:** the Ezoic runtime only requests queued video placeholders once
  the page's ad scripts have loaded — which happens when the page runs some `showAds(...)` (any
  display placement, e.g. an `<ezoic-ad>` or `EzoicService.showAds`) or `initRewardedAds()` (via
  `withRewardedAds`). A page whose only Ezoic surface is `<ezoic-video>` never triggers that load, so
  the video stays queued and never fills. Mount at least one display ad (or enable rewarded ads) on
  any page that uses `<ezoic-video>`.
- **Div id** is publisher-chosen and must be non-empty and unique on the page. An empty `divId`
  throws at render time.
- **Batching:** every `<ezoic-video>` that initializes in the same tick is coalesced into a single
  `displayMoreVideo(...)` call, which both appends the divs to the video registry and loads them.
- **Teardown:** destroying a component tears its placeholder down via `destroyVideoPlaceholders(divId)`.
  Div ids are reference-counted, so mounting the same id twice logs a warning (ids must be unique on
  a page) and tears down only once.
- **SSR:** the `<div>` renders on the server; video loads happen only in the browser.

### Open Video inline embed (`<ezoic-video-embed>`)

`<ezoic-video-embed>` mounts an Open Video inline player. It uses its own host element as the embed
target, so you size the element directly:

```ts
import { Component } from '@angular/core';
import { EzoicVideoEmbedComponent } from '@ezoic/angular-sdk';

@Component({
  selector: 'app-clip',
  imports: [EzoicVideoEmbedComponent],
  template: `<ezoic-video-embed videoId="your-video-id" playlist="your-playlist" float autoplay />`,
  styles: [
    `
      ezoic-video-embed {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
      }
    `,
  ],
})
export class ClipComponent {}
```

- **Inputs:** `videoId` (required), and optional `playlist`, `float` and `autoplay`. An empty
  `videoId` throws at render time; `float`/`autoplay` are omitted from the embed entry when unset.
- On init in the browser the component injects `https://open.video/video.js` once (deduplicated by
  host + pathname) and pushes an entry onto `window.openVideoPlayers`, which the Open Video script
  drains to mount the player.
- **SSR:** no script is injected and no browser global is touched on the server.

### Imperative video control

`EzoicService` exposes the verified video runtime methods for imperative and dynamic-content flows.
Each runs inside the command queue and is a no-op during server-side rendering:

| Method                             | Purpose                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `defineVideo(...entries)`          | Clear the video registry and register entries **without** loading them.         |
| `displayMoreVideo(...entries)`     | Append entries **and** load them (the video load call). Prefer `<ezoic-video>`. |
| `destroyVideoPlaceholders(...ids)` | Tear down the given video divs by id.                                           |

Each entry is a video div-id string or the object form `{ divID }`. `defineVideo` clears and
registers only; use `displayMoreVideo` to actually load. Prefer the `<ezoic-video>` component for
declarative placements.

See the Ezoic video reference: <https://docs.ezoic.com/docs/ezoicadsadvanced/ezoic-video/>.

## Server-side rendering (SSR)

`provideEzoic()` is SSR-safe and needs no special configuration: the same providers work unchanged
for both a browser build and a server build (Angular's built-in `@angular/ssr` or Angular
Universal).

- **`provideEzoic()`** injects nothing and touches no `window`/`document` global on the server.
- **`EzoicService`** — `push()` and every runtime passthrough (`showAds`, `displayMore`,
  `destroyPlaceholders`, `destroyAll`, `refreshAds`, consent/privacy, config, ad-format toggles,
  video passthroughs) are no-ops on the server. The `ready` signal stays `false` on the server and
  only becomes `true` in the browser once the scripts are injected.
- **`<ezoic-ad>` with `[id]`** renders its bare `<div id="ezoic-pub-ad-placeholder-<id>">` on the
  server, so the layout is reserved (avoiding a shift); the `showAds` request itself happens only in
  the browser after hydration.
- **`<ezoic-ad>` with `location`** does not render server-side — location-to-id resolution
  (`resolveLocationId`) is browser-only and returns `null` on the server, so the div appears only
  after hydration.
- **`<ezoic-video>`** renders its bare div server-side; the video load happens only in the browser.
- **`<ezoic-video-embed>`** injects no script and pushes nothing on the server.
- **`EzoicConsentService`** signals (`ready`, `tcString`, `gdprApplies`, `eventStatus`) stay at their
  initial values on the server (no `__tcfapi` access) — read them in the browser.
- **`EzoicRewardedService`** methods resolve to a non-granting fallback on the server, so they never
  hang waiting for a runtime that isn't there.

No configuration is needed to opt in to any of the above — every provider, service and component is
SSR-safe by default.

## Migration from raw Ezoic snippets

If you already have Ezoic integrated by hand, the SDK replaces the hand-placed scripts and
per-page `ezstandalone.cmd.push` boilerplate with a single provider and declarative components. The
consent (CMP) scripts are still injected first, in the same order — you aren't changing your consent
setup, just how it's loaded.

### Before — raw snippets

```html
<!-- index.html <head> -->
<script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js"></script>
<script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js"></script>
<script>
  window.ezstandalone = window.ezstandalone || {};
  ezstandalone.cmd = ezstandalone.cmd || [];
</script>
<script async src="https://www.ezojs.com/ezoic/sa.min.js"></script>
<script src="https://ezoicanalytics.com/analytics.js"></script>
```

```html
<!-- page fragment -->
<div id="ezoic-pub-ad-placeholder-101"></div>
<script>
  ezstandalone.cmd.push(function () {
    ezstandalone.showAds(101);
  });
</script>
```

### After — @ezoic/angular-sdk

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideEzoic } from '@ezoic/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [provideEzoic()],
};
```

```ts
import { Component } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';

@Component({
  selector: 'app-article',
  imports: [EzoicAdComponent],
  template: `<ezoic-ad [id]="101" />`,
})
export class ArticleComponent {}
```

Remove all of the head scripts above — `provideEzoic()` injects them for you, in the same order.
Every `<ezoic-ad>` that mounts in the same tick is batched into a single `showAds(...)` call, and its
placeholder is torn down automatically when the component is destroyed, so there's no manual
`ezstandalone.cmd.push` or teardown code left to maintain.

### Common replacements

| Raw snippet                                                | SDK equivalent                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Head scripts (CMP tags, cmd-queue stub, bundle, analytics) | `provideEzoic()`                                                               |
| `ezstandalone.cmd.push(() => ezstandalone.showAds(id))`    | `<ezoic-ad [id]="id" />` or `EzoicService.showAds(id)`                         |
| Manual `destroyPlaceholders` on route change               | Automatic teardown, plus `withRouterRefresh()`                                 |
| `setIsSinglePageApplication(true)` + manual `newPage()`    | `withRouterRefresh()`                                                          |
| Hand-picked zero-config placeholder ids                    | `<ezoic-ad location="under_first_paragraph" required [sizes]="['300x250']" />` |
| Manual CMP `<script>` tags                                 | Injected by `provideEzoic()` (`cmp: true` default)                             |

If the host page already has Ezoic scripts, injection is idempotent — they won't be duplicated — so
migration can be incremental. Pass `provideEzoic({ cmp: false })` only if an Ezoic-compatible CMP is
already loaded elsewhere.

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
- `EzoicVideoComponent` (`<ezoic-video>`) — declarative Ezoic video placeholder (bare div, no
  styling), with same-tick batching into a single `displayMoreVideo` call and teardown via
  `destroyVideoPlaceholders`. SSR-safe.
- `EzoicVideoEmbedComponent` (`<ezoic-video-embed>`) — Open Video inline embed that injects
  `https://open.video/video.js` once and pushes an entry onto `window.openVideoPlayers`
  (`videoId` required; optional `playlist`, `float`, `autoplay`). SSR-safe.
- `EzoicService` video passthroughs — `defineVideo` (clear + register, no load),
  `displayMoreVideo` (append + load) and `destroyVideoPlaceholders`, plus the `EzoicVideoDefinition`
  and `EzoicOpenVideoEntry` types.
- Script URL constants: `EZOIC_SA_SCRIPT_URL`, `EZOIC_CMP_SCRIPT_URLS`, `EZOIC_ANALYTICS_SCRIPT_URL`,
  `EZOIC_OPEN_VIDEO_SCRIPT_URL`.
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

## Roadmap

1. Package skeleton — done
2. Provider + script management (`provideEzoic`) — done
3. Display ads (`<ezoic-ad>`) — done
4. SPA routing integration (`withRouterRefresh`) — done
5. Zero-config placements (location names) — done
6. CMP / consent + config — done
7. Rewarded ads — done
8. Video (Ezoic outstream/instream + Open Video embed) — done
9. Docs + demo app — done

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
