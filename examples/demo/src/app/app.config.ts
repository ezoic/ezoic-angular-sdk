import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideEzoic, withRewardedAds, withRouterRefresh } from '@ezoic/angular-sdk';
import { routes } from './app.routes';

/**
 * Application configuration. Signals + zoneless change detection keep the demo
 * dependency-free of zone.js, and `provideEzoic` bootstraps the CMP, analytics
 * and header scripts with router-refresh and rewarded-ads features enabled.
 * Hash-based routing keeps the SPA demo working when served at any fixed URL
 * path (e.g. embedded as a single static page): navigation stays on the
 * served path as a `#/...` fragment instead of leaving it via the History API.
 *
 * Rewarded ads use the default (runtime-served) mode: no per-site loader URL —
 * the Ezoic runtime serves the host-correct rewarded loader itself.
 *
 * @see https://docs.ezoic.com/docs/ezoicadsadvanced/rewarded/
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideEzoic({}, withRouterRefresh(), withRewardedAds()),
  ],
};
