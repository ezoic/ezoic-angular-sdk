import { DOCUMENT, DestroyRef, inject, provideAppInitializer } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { EzoicService } from './ezoic.service';
import { EzoicFeature } from './ezoic-feature';
import { EzoicWindow } from './ezstandalone.types';

/**
 * Options for {@link withRouterRefresh}.
 */
export interface RouterRefreshConfig {
  /**
   * Placeholder ids to (re-)request on every Angular Router navigation, for apps
   * that place ads imperatively rather than with `<ezoic-ad>`. On the first
   * navigation the ids are requested; on each later navigation the previous set
   * is torn down with `destroyPlaceholders` and re-requested with `showAds`
   * (inside `requestAnimationFrame`, so the new route's DOM is present).
   *
   * Omit this when using `<ezoic-ad>` components: their mount/unmount already
   * drives per-route `showAds`/`destroyPlaceholders`. Do not combine the two —
   * that would request the same ids twice per navigation.
   */
  readonly placeholderIds?: number[];
}

/**
 * Enables single-page-application ad handling for Angular Router apps.
 *
 * Pass it to {@link provideEzoic} after the options argument:
 *
 * ```ts
 * providers: [provideEzoic({}, withRouterRefresh())]
 * ```
 *
 * At application boot it marks the page as an SPA
 * (`ezstandalone.setIsSinglePageApplication(true)`), the code-verified primary
 * pattern: a subsequent `showAds` on a new pageview then routes through the
 * runtime's `refresh()` flow. With `<ezoic-ad>` components that is all that is
 * needed — component mount/unmount on each route already issues `showAds` for
 * the arriving placeholders and `destroyPlaceholders` for the departing ones.
 *
 * The SDK deliberately does not call `newPage()` itself: the runtime already
 * detects `history.pushState`/`replaceState` (which Angular Router uses) and
 * fires `newPage()` on its own, so calling it here would double-fire.
 *
 * For imperative placements, pass {@link RouterRefreshConfig.placeholderIds};
 * the feature then refreshes those ids on each `NavigationEnd`. Opting out of
 * SPA handling is simply not adding this feature. No-op during server-side
 * rendering.
 *
 * @param config Optional imperative-refresh configuration.
 * @returns An {@link EzoicFeature} for {@link provideEzoic}.
 */
export function withRouterRefresh(config: RouterRefreshConfig = {}): EzoicFeature {
  const ids = config.placeholderIds ?? [];
  return {
    kind: 'router-refresh',
    providers: [
      provideAppInitializer(() => {
        const ezoic = inject(EzoicService);
        ezoic.setIsSinglePageApplication(true);

        if (ids.length === 0 || !ezoic.isBrowser) {
          return;
        }

        const router = inject(Router, { optional: true });
        if (!router) {
          console.warn(
            '[ezoic] withRouterRefresh({ placeholderIds }) requires the Angular Router ' +
              '(provideRouter). No router was found, so imperative route refresh is disabled.',
          );
          return;
        }

        const win = inject(DOCUMENT).defaultView as EzoicWindow | null;
        const raf =
          win && typeof win.requestAnimationFrame === 'function'
            ? win.requestAnimationFrame.bind(win)
            : (cb: FrameRequestCallback) => cb(0);

        let initialized = false;
        const sub = router.events
          .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
          .subscribe(() => {
            if (initialized) {
              ezoic.destroyPlaceholders(...ids);
            }
            initialized = true;
            raf(() => ezoic.showAds(...ids));
          });

        inject(DestroyRef).onDestroy(() => sub.unsubscribe());
      }),
    ],
  };
}
