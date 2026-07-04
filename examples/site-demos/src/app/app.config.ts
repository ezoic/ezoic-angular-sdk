import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideEzoic, withRewardedAds, withRouterRefresh } from '@ezoic/angular-sdk';
import { routes } from './app.routes';

/**
 * Application configuration for the scenario demo. Signals + zoneless change
 * detection keep the app free of zone.js, and `provideEzoic` bootstraps the
 * CMP, analytics and header scripts with router-refresh and rewarded-ads
 * features enabled. Hash-based routing keeps each compiled scenario page
 * working when served at any fixed URL path: navigation stays on the served
 * path as a `#/...` fragment instead of leaving it via the History API.
 *
 * Rewarded ads use the default (runtime-served) mode: no per-site loader URL.
 * The `placements` keep the demo pages clean of anchors/interstitials/side-rails
 * while still allowing outstream video.
 *
 * @see https://docs.ezoic.com/docs/ezoicadsadvanced/rewarded/
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideEzoic(
      {},
      withRouterRefresh(),
      withRewardedAds({
        placements: { anchor: false, interstitial: false, video: true, sideRails: false },
      }),
    ),
  ],
};
