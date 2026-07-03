import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { injectRewardedLoader } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';
import {
  EzoicRewardedApi,
  EzoicRewardedContentLockerAction,
  EzoicRewardedContentLockerConfig,
  EzoicRewardedOverlayConfig,
  EzoicRewardedOverlayText,
  EzoicRewardedRequestAndShowConfig,
  EzoicRewardedRequestConfig,
  EzoicRewardedRequestOutcome,
  EzoicRewardedShowConfig,
  EzoicRewardedShowOutcome,
  EzoicRewardedStatus,
} from './ezoic-rewarded.types';

/** Non-granting fallback for request-style methods when rewarded ads are unavailable. */
const REQUEST_FALLBACK: EzoicRewardedRequestOutcome = {
  status: false,
  msg: 'Rewarded ads are not available.',
};

/** Non-granting fallback for show-style methods when rewarded ads are unavailable. */
const SHOW_FALLBACK: EzoicRewardedShowOutcome = {
  status: false,
  reward: false,
  msg: 'Rewarded ads are not available.',
};

/** The three `window` events the rewarded loader fires, mapped to a status. */
const REWARDED_EVENTS: readonly (readonly [string, EzoicRewardedStatus])[] = [
  ['ezRewardedInitiated', 'initiated'],
  ['ezRewardedDisplayed', 'displayed'],
  ['ezRewardedClosed', 'closed'],
];

/**
 * Wraps the site-specific `window.ezRewardedAds` rewarded-ads runtime as an
 * SSR-safe Angular service.
 *
 * Enable it by adding `withRewardedAds({ loaderUrl })` to `provideEzoic`; that
 * runs {@link EzoicRewardedService.initialize} at application startup with the
 * publisher's `{host}/porpoiseant/ezadloadrewarded.js` loader URL. Each method
 * returns a Promise that resolves to a non-granting fallback outcome — during
 * server-side rendering, before initialization, when the runtime cannot be
 * reached, when the runtime method is missing, or when a runtime call throws —
 * rather than leaving the Promise pending. Like the rest of the SDK's queued
 * runtime reads, delivering a real outcome still depends on the Ezoic loader
 * executing the command queue. The runtime is callback-based; the callback's
 * payload is passed through to the resolved value.
 */
@Injectable({ providedIn: 'root' })
export class EzoicRewardedService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** `true` when running in a browser; `false` during server-side rendering. */
  readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _status = signal<EzoicRewardedStatus>('idle');

  /**
   * Lifecycle status of the rewarded runtime, driven by the loader's `window`
   * events: `'idle'` → `'initiated'` → `'displayed'` → `'closed'`. Stays
   * `'idle'` during server-side rendering and before initialization.
   */
  readonly status = this._status.asReadonly();

  private initialized = false;
  private listeners: { event: string; handler: () => void }[] = [];

  /**
   * Injects the rewarded loader and starts tracking the runtime's lifecycle
   * events. Invoked once at startup by {@link withRewardedAds}. Browser only,
   * idempotent, and a no-op during server-side rendering. When `loaderUrl` is
   * empty or blank it warns and leaves the service uninitialized (so its methods
   * resolve to non-granting fallbacks).
   *
   * @param loaderUrl The site-specific `{host}/porpoiseant/ezadloadrewarded.js`
   *   URL from the publisher's Ezoic integration.
   */
  initialize(loaderUrl: string): void {
    if (!this.isBrowser || this.initialized) {
      return;
    }
    if (!loaderUrl || loaderUrl.trim() === '') {
      console.warn(
        '[ezoic] withRewardedAds requires a non-empty loaderUrl; rewarded ads are disabled.',
      );
      return;
    }
    injectRewardedLoader(this.document, loaderUrl);
    this.registerStatusListeners();
    this.initialized = true;
  }

  /**
   * Requests a rewarded ad. Resolves with the runtime's request outcome, or a
   * non-granting fallback when rewarded ads are unavailable.
   */
  request(config?: EzoicRewardedRequestConfig): Promise<EzoicRewardedRequestOutcome> {
    return this.invoke<EzoicRewardedRequestOutcome>((api, resolve) => {
      if (typeof api.request !== 'function') {
        return false;
      }
      api.request((data) => resolve(data ?? REQUEST_FALLBACK), config);
      return true;
    }, REQUEST_FALLBACK);
  }

  /**
   * Shows a previously requested rewarded ad. Resolves with the runtime's show
   * outcome, or a non-granting fallback when rewarded ads are unavailable.
   */
  show(config?: EzoicRewardedShowConfig): Promise<EzoicRewardedShowOutcome> {
    return this.invoke<EzoicRewardedShowOutcome>((api, resolve) => {
      if (typeof api.show !== 'function') {
        return false;
      }
      api.show((data) => resolve(data ?? SHOW_FALLBACK), config);
      return true;
    }, SHOW_FALLBACK);
  }

  /**
   * Requests and, if available, shows a rewarded ad in a single call. Resolves
   * with the runtime's show outcome, or a non-granting fallback when rewarded
   * ads are unavailable.
   *
   * The SDK always requests `alwaysCallback` from the runtime internally —
   * this is not configurable by the caller — so the returned Promise
   * deterministically resolves on every outcome (fill and watched, no-fill,
   * cancelled, or closed early), rather than only on a granted reward.
   */
  requestAndShow(config?: EzoicRewardedRequestAndShowConfig): Promise<EzoicRewardedShowOutcome> {
    return this.invoke<EzoicRewardedShowOutcome>((api, resolve) => {
      if (typeof api.requestAndShow !== 'function') {
        return false;
      }
      api.requestAndShow((data) => resolve(data ?? SHOW_FALLBACK), {
        ...config,
        alwaysCallback: true,
      });
      return true;
    }, SHOW_FALLBACK);
  }

  /**
   * Requests a rewarded ad behind a confirmation overlay. Resolves with the
   * runtime's show outcome, or a non-granting fallback when rewarded ads are
   * unavailable.
   *
   * The SDK always requests `alwaysCallback` from the runtime internally —
   * this is not configurable by the caller — so the returned Promise
   * deterministically resolves on every outcome (fill and watched, no-fill,
   * cancelled, or closed early), rather than only on a granted reward.
   *
   * @param text Overlay copy overrides.
   * @param config Overlay behaviour configuration.
   */
  requestWithOverlay(
    text?: EzoicRewardedOverlayText,
    config?: EzoicRewardedOverlayConfig,
  ): Promise<EzoicRewardedShowOutcome> {
    return this.invoke<EzoicRewardedShowOutcome>((api, resolve) => {
      if (typeof api.requestWithOverlay !== 'function') {
        return false;
      }
      api.requestWithOverlay((data) => resolve(data ?? SHOW_FALLBACK), text, {
        ...config,
        alwaysCallback: true,
      });
      return true;
    }, SHOW_FALLBACK);
  }

  /**
   * Locks content behind a rewarded ad. `action` is either a redirect URL or a
   * callback to run after the reward is granted. Resolves with the request
   * outcome delivered to the runtime's `readyCallback`, or a non-granting
   * fallback when rewarded ads are unavailable. Any `readyCallback` supplied in
   * `config` is preserved: it fires first, then the Promise resolves.
   */
  contentLocker(
    action: EzoicRewardedContentLockerAction,
    config?: EzoicRewardedContentLockerConfig,
  ): Promise<EzoicRewardedRequestOutcome> {
    return this.invoke<EzoicRewardedRequestOutcome>((api, resolve) => {
      if (typeof api.contentLocker !== 'function') {
        return false;
      }
      const merged: EzoicRewardedContentLockerConfig = {
        ...config,
        readyCallback: (result) => {
          // Resolve even if the caller's callback throws: the throw still
          // propagates to the runtime afterwards, but the Promise never hangs.
          try {
            config?.readyCallback?.(result);
          } finally {
            resolve(result ?? REQUEST_FALLBACK);
          }
        },
      };
      api.contentLocker(action, merged);
      return true;
    }, REQUEST_FALLBACK);
  }

  /**
   * Queues a runtime call on `ezRewardedAds.cmd`, resolving the returned Promise
   * exactly once. Resolves the fallback immediately (without queuing) during
   * server-side rendering or before initialization; otherwise queues `call` and
   * resolves the fallback if the command cannot be queued, the runtime is absent
   * when the command runs, the runtime method is absent, or the call throws. If
   * the loader never drains the command queue the Promise stays pending, matching
   * the rest of the SDK's queued runtime reads.
   */
  private invoke<T>(
    call: (api: EzoicRewardedApi, resolve: (value: T) => void) => boolean,
    fallback: T,
  ): Promise<T> {
    if (!this.isBrowser) {
      return Promise.resolve(fallback);
    }
    if (!this.initialized) {
      console.warn(
        '[ezoic] EzoicRewardedService was used before withRewardedAds({ loaderUrl }) ' +
          'initialized it; returning a non-granting outcome.',
      );
      return Promise.resolve(fallback);
    }
    return new Promise<T>((resolve) => {
      let settled = false;
      const done = (value: T): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
      };
      const queued = this.pushRewarded((api) => {
        if (!api) {
          done(fallback);
          return;
        }
        try {
          if (!call(api, done)) {
            done(fallback);
          }
        } catch {
          done(fallback);
        }
      });
      if (!queued) {
        done(fallback);
      }
    });
  }

  /**
   * Queues a function on `ezRewardedAds.cmd`. The queued closure resolves the
   * live `window.ezRewardedAds` at execution time (passing `undefined` when it is
   * gone) and runs `command` with it. Returns `false` when there is no window to
   * queue against, so callers can resolve their fallback instead of hanging.
   */
  private pushRewarded(command: (api: EzoicRewardedApi | undefined) => void): boolean {
    const win = this.document.defaultView as EzoicWindow | null;
    if (!win) {
      return false;
    }
    if (!win.ezRewardedAds) {
      win.ezRewardedAds = { cmd: [] };
    } else if (!Array.isArray(win.ezRewardedAds.cmd)) {
      win.ezRewardedAds.cmd = [];
    }
    win.ezRewardedAds.cmd.push(() => {
      const api = (this.document.defaultView as EzoicWindow | null)?.ezRewardedAds;
      command(api);
    });
    return true;
  }

  /** Registers the three lifecycle listeners and their teardown. */
  private registerStatusListeners(): void {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    for (const [event, status] of REWARDED_EVENTS) {
      const handler = (): void => this._status.set(status);
      win.addEventListener(event, handler);
      this.listeners.push({ event, handler });
    }
    this.destroyRef.onDestroy(() => this.removeStatusListeners());
  }

  /** Removes the registered lifecycle listeners. */
  private removeStatusListeners(): void {
    const win = this.document.defaultView;
    if (win) {
      for (const { event, handler } of this.listeners) {
        win.removeEventListener(event, handler);
      }
    }
    this.listeners = [];
  }
}
