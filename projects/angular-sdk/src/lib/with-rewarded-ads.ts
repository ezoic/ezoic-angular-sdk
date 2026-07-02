import { inject, provideAppInitializer } from '@angular/core';
import { EzoicFeature } from './ezoic-feature';
import { EzoicRewardedService } from './ezoic-rewarded.service';

/**
 * Options for {@link withRewardedAds}.
 */
export interface RewardedAdsConfig {
  /**
   * The site-specific rewarded-ads loader URL: the
   * `{your-ad-host}/porpoiseant/ezadloadrewarded.js` script found in the
   * publisher's Ezoic integration (dashboard rewarded snippet). The SDK does not
   * hardcode this host — it is per-site — so it must be supplied here.
   */
  readonly loaderUrl: string;
}

/**
 * Enables Ezoic rewarded ads.
 *
 * Pass it to {@link provideEzoic} after the options argument:
 *
 * ```ts
 * providers: [
 *   provideEzoic(
 *     {},
 *     withRewardedAds({ loaderUrl: 'https://example.com/porpoiseant/ezadloadrewarded.js' }),
 *   ),
 * ]
 * ```
 *
 * At application boot it initializes {@link EzoicRewardedService} with
 * `loaderUrl`, which injects the rewarded loader script and starts tracking the
 * runtime's lifecycle events. Inject `EzoicRewardedService` anywhere to request
 * and show rewarded ads.
 *
 * Opt in by adding this feature; opting out is simply not adding it. No-op
 * during server-side rendering: no loader is injected and no browser global is
 * touched.
 *
 * @param config Rewarded-ads configuration; see {@link RewardedAdsConfig}.
 * @returns An {@link EzoicFeature} for {@link provideEzoic}.
 */
export function withRewardedAds(config: RewardedAdsConfig): EzoicFeature {
  return {
    kind: 'rewarded-ads',
    providers: [
      provideAppInitializer(() => inject(EzoicRewardedService).initialize(config.loaderUrl)),
    ],
  };
}
