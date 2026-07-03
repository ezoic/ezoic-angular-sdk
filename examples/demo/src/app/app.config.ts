import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideEzoic, withRewardedAds, withRouterRefresh } from '@ezoic/angular-sdk';
import { routes } from './app.routes';

/**
 * Site-specific rewarded-ads loader URL.
 *
 * Publishers MUST replace this reserved-TLD placeholder with the
 * `{your-ad-host}/porpoiseant/ezadloadrewarded.js` URL from their own Ezoic
 * dashboard rewarded snippet. The SDK never hardcodes this host because it is
 * per-site; the placeholder below serves no ads.
 *
 * @see https://docs.ezoic.com/docs/ezoicadsadvanced/rewarded-ads/
 */
const REWARDED_LOADER_URL = 'https://your-site.example/porpoiseant/ezadloadrewarded.js';

/**
 * Application configuration. Signals + zoneless change detection keep the demo
 * dependency-free of zone.js, and `provideEzoic` bootstraps the CMP, analytics
 * and header scripts with router-refresh and rewarded-ads features enabled.
 * Hash-based routing keeps the SPA demo working when served at any fixed URL
 * path (e.g. embedded as a single static page): navigation stays on the
 * served path as a `#/...` fragment instead of leaving it via the History API.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideEzoic({}, withRouterRefresh(), withRewardedAds({ loaderUrl: REWARDED_LOADER_URL })),
  ],
};
