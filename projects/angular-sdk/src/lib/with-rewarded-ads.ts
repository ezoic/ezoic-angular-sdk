import { inject, provideAppInitializer } from '@angular/core';
import { EzoicFeature } from './ezoic-feature';
import { EzoicRewardedInitScheduler } from './ezoic-rewarded-init.scheduler';
import { EzoicRewardedService } from './ezoic-rewarded.service';
import { EzoicRewardedPlacements } from './ezoic-rewarded.types';

/**
 * Options for {@link withRewardedAds}. Every field is optional; calling
 * `withRewardedAds()` with no argument enables the default, runtime-served mode.
 */
export interface RewardedAdsConfig {
  /**
   * **Escape hatch — usually omit this.** An explicit site-specific rewarded
   * loader URL (`{your-ad-host}/porpoiseant/ezadloadrewarded.js`) to inject as a
   * `<script>` tag.
   *
   * Only supply this for pages that are **not** Ezoic JS-integrated (i.e. that
   * do not load `sa.min.js` through this SDK). On a normal JS-integrated page
   * leave it unset: the default mode lets the Ezoic runtime serve the
   * host-correct rewarded loader for you (see {@link withRewardedAds}), so a
   * per-site URL is neither needed nor correct.
   */
  readonly loaderUrl?: string;

  /**
   * Site-wide rewarded placement toggles forwarded to
   * `ezstandalone.initRewardedAds` in the default (runtime-served) mode. Omitted
   * keys fall back to the runtime default (all enabled). Ignored when an
   * explicit {@link loaderUrl} is supplied.
   */
  readonly placements?: EzoicRewardedPlacements;
}

/**
 * Enables Ezoic rewarded ads.
 *
 * Pass it to {@link provideEzoic} after the options argument. The canonical
 * usage takes **no argument** — on an Ezoic JS-integrated page (one this SDK
 * bootstraps with `provideEzoic`) the Ezoic runtime serves the correct rewarded
 * loader for you:
 *
 * ```ts
 * providers: [
 *   provideEzoic({}, withRewardedAds()),
 * ]
 * ```
 *
 * Optionally scope which site-wide placements the runtime enables:
 *
 * ```ts
 * providers: [
 *   provideEzoic(
 *     {},
 *     withRewardedAds({ placements: { anchor: false, interstitial: false, video: true, sideRails: false } }),
 *   ),
 * ]
 * ```
 *
 * At application boot the default mode initializes {@link EzoicRewardedService}
 * **without injecting any script**, then schedules
 * `EzoicService.initRewardedAds` (via {@link EzoicRewardedInitScheduler}) so the
 * Ezoic runtime serves the rewarded loader (host-correct, with your domain
 * config) inside its own response and drains `window.ezRewardedAds.cmd`. Inject
 * `EzoicRewardedService` anywhere to request and show rewarded ads.
 *
 * The init call is **deferred, not fired at boot**. The runtime's
 * `initRewardedAds` runs `showAds([12])` internally, and the app initializer
 * runs before any `<ezoic-ad>` mounts, so dispatching it immediately would
 * collide with the page's initial ad load and wedge the whole page (no `sa.go`
 * request, no ads, rewarded never loads). The scheduler waits until the page's
 * initial ad load has started — detected via the `/sa.go` ad request in resource
 * timing, a GPT container rendered inside an Ezoic placeholder, or
 * `ezstandalone.enabled` when a publisher opts into the public `enable()` —
 * before dispatching, or, on a rewarded-only page with no display placements
 * mounted, fires after a short grace window. See {@link EzoicRewardedInitScheduler}
 * for the full contract.
 *
 * **Escape hatch:** pass `{ loaderUrl }` only for pages that are **not** Ezoic
 * JS-integrated. That keeps the legacy behavior of injecting the site-specific
 * `{host}/porpoiseant/ezadloadrewarded.js` loader as a `<script>` tag instead of
 * relying on the runtime to serve it. `placements` is ignored in this mode.
 *
 * Opt in by adding this feature; opting out is simply not adding it. No-op
 * during server-side rendering: no loader is injected and no browser global is
 * touched.
 *
 * @param config Rewarded-ads configuration; see {@link RewardedAdsConfig}.
 *   Optional — omit it for the default runtime-served mode.
 * @returns An {@link EzoicFeature} for {@link provideEzoic}.
 */
export function withRewardedAds(config: RewardedAdsConfig = {}): EzoicFeature {
  return {
    kind: 'rewarded-ads',
    providers: [
      provideAppInitializer(() => {
        const rewarded = inject(EzoicRewardedService);
        if (config.loaderUrl !== undefined) {
          // Escape hatch: inject the explicit site-specific loader script.
          rewarded.initialize(config.loaderUrl);
          return;
        }
        // Default: no script injection — the Ezoic runtime serves the loader in
        // response to initRewardedAds and drains the rewarded command queue. The
        // init is deferred (never fired at boot) so it cannot preempt the page's
        // initial ad load; the scheduler owns the once-per-page dispatch.
        rewarded.initialize();
        inject(EzoicRewardedInitScheduler).schedule(config.placements);
      }),
    ],
  };
}
