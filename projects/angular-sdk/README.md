# @ezoic/angular-sdk

Official Ezoic SDK for Angular — wraps the Ezoic `ezstandalone` client integration (script
management, display ads, SPA routing, consent, rewarded ads and video) as idiomatic Angular
standalone components, providers and services.

> **Status: early development (0.x).** API not yet stable. See the
> [repository](https://github.com/ezoic/ezoic-angular-sdk) for the roadmap and changelog.

## Requirements

- Angular 20, 21 or 22

## Usage

Register the SDK once in your `ApplicationConfig`, then drop `<ezoic-ad>` components where you want
placeholders:

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
  template: `
    <ezoic-ad [id]="101" />
    <ezoic-ad [id]="102" />
    <ezoic-ad location="under_first_paragraph" required [sizes]="['300x250']" />
  `,
})
export class ArticleComponent {}
```

Give `<ezoic-ad>` either a numeric `[id]` (1–999) or a semantic `location` name (zero-config, resolved
to a reserved 900–999 id) — exactly one of the two. Placeholders that mount in the same tick are
batched into a single `showAds` call and torn down on destroy. Location (zero-config) placements
default to `required: true` (opt out with `[required]="false"`). Location (zero-config) placements
should pass `[sizes]` (a dev-mode warning is logged when a location placement omits them) since
zero-config 900-range placeholders carry no dashboard sizing; an explicit `[id]` placement can be
sized via the Ezoic dashboard, so `[sizes]` is optional there. `EzoicService` also exposes `showAds`
/ `displayMore` / `destroyPlaceholders` / `destroyAll` / `refreshAds` / `isEzoicUser` /
`resolveLocationId` for imperative and dynamic-content flows, plus consent/privacy passthroughs
(`enableConsent`, `setDisablePersonalizedAds`, `setDisablePersonalizedStatistics`), a typed
`config` setter, and ad-format toggles (anchor / interstitial / outstream). `EzoicConsentService`
exposes the CMP's TCF v2.2 consent state (`ready`, `tcString`, `gdprApplies`, `eventStatus`) as
signals. See the [repository README](https://github.com/ezoic/ezoic-angular-sdk#readme) for the full
guide.

Rewarded ads are supported via the `withRewardedAds()` provider feature and `EzoicRewardedService`
(`request` / `show` / `requestAndShow` / `requestWithOverlay` / `contentLocker`, plus a `status`
signal). On an Ezoic JS-integrated page call `withRewardedAds()` with no loader URL: the runtime
serves the host-correct rewarded loader itself. Pass `withRewardedAds({ loaderUrl })` only as an
escape hatch on pages that are not Ezoic JS-integrated. Every method resolves to a non-granting
outcome when rewarded ads are unavailable, and it is a no-op during server-side rendering.

Video is supported via two components. `<ezoic-video divId="...">` renders a bare video placeholder
div (publisher-chosen id, publisher-sized) and batches same-tick mounts into a single
`displayMoreVideo` call, tearing down on destroy. It only loads once page-level ads initialize (a
display placement or rewarded init on the page), so mount at least one `<ezoic-ad>` (or enable
rewarded ads) alongside it. `<ezoic-video-embed videoId="..." [playlist]
[float] [autoplay]>` mounts an Open Video inline embed by injecting `https://open.video/video.js`
once and pushing onto `window.openVideoPlayers`. `EzoicService` also exposes `defineVideo` (clear +
register, no load), `displayMoreVideo` (append + load) and `destroyVideoPlaceholders` for imperative
flows. All video paths are no-ops during server-side rendering.

## Documentation

- SDK repository: <https://github.com/ezoic/ezoic-angular-sdk>
- Ezoic ad integration docs: <https://docs.ezoic.com/docs/ezoicads/integration/>

## License

MIT
