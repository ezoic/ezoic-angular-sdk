import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EZOIC_OPTIONS, resolveEzoicOptions } from './ezoic-config';
import { injectEzoicScripts } from './script-loader';
import { EzoicCommand, EzoicPlaceholderArg, Ezstandalone, EzoicWindow } from './ezstandalone.types';
import { MIN_PLACEHOLDER_ID } from './placeholder';
import { resolveStaticLocationId } from './location-map';
import { EzoicConfig } from './ezoic-runtime-config';

/**
 * Core Ezoic SDK service. Handles one-time header-script injection at
 * application startup and provides a browser-only, SSR-safe helper for queuing
 * work on the `ezstandalone` command queue.
 *
 * Configure it with `provideEzoic` in your `ApplicationConfig`; do not add it to
 * a component `providers` array.
 */
@Injectable({ providedIn: 'root' })
export class EzoicService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly options = resolveEzoicOptions(
    inject(EZOIC_OPTIONS, { optional: true }) ?? undefined,
  );
  private readonly _ready = signal(false);

  /** `true` when running in a browser; `false` during server-side rendering. */
  readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Emits `true` once the header scripts have been injected and the command
   * queue is available. Stays `false` during server-side rendering.
   */
  readonly ready = this._ready.asReadonly();

  /**
   * Injects the Ezoic header scripts and marks the SDK ready. Invoked once at
   * application startup by `provideEzoic`. Safe to call repeatedly: it is a
   * no-op after the first successful run and during server-side rendering.
   */
  initialize(): void {
    if (!this.isBrowser || this._ready()) {
      return;
    }
    injectEzoicScripts(this.document, this.options);
    this._ready.set(true);
  }

  /**
   * Queues a function on `ezstandalone.cmd`. Before the header script finishes
   * loading the function is buffered and run in order once the runtime is
   * ready; afterwards it runs immediately. No-op during server-side rendering.
   *
   * @param command Function to run inside the Ezoic command queue.
   */
  push(command: EzoicCommand): void {
    if (!this.isBrowser) {
      return;
    }
    const win = this.document.defaultView as EzoicWindow | null;
    if (!win) {
      return;
    }
    if (!win.ezstandalone) {
      win.ezstandalone = { cmd: [] };
    } else if (!Array.isArray(win.ezstandalone.cmd)) {
      win.ezstandalone.cmd = [];
    }
    win.ezstandalone.cmd.push(command);
  }

  /**
   * Requests display placeholders. Each argument is a placeholder id or the
   * object form `{ id, required?, sizes? }`. Runs inside the command queue, so
   * it is safe to call before the runtime loads and is a no-op during
   * server-side rendering.
   *
   * Prefer the `<ezoic-ad>` component for declarative placements; this method
   * is for imperative and dynamic-content flows.
   */
  showAds(...placeholders: EzoicPlaceholderArg[]): void {
    this.push(() => this.runtime()?.showAds?.(...placeholders));
  }

  /**
   * Requests additional placeholders after the initial page load (for
   * infinite-scroll or dynamically injected content). Requires at least one id.
   */
  displayMore(...ids: number[]): void {
    this.push(() => this.runtime()?.displayMore?.(...ids));
  }

  /** Tears down the given placeholders by id (for example when content is removed). */
  destroyPlaceholders(...ids: number[]): void {
    this.push(() => this.runtime()?.destroyPlaceholders?.(...ids));
  }

  /** Tears down every selected placeholder plus anchor, side rails and floating outstream. */
  destroyAll(): void {
    this.push(() => this.runtime()?.destroyAll?.());
  }

  /** Re-requests bids for the given header-bidding placeholders by id. */
  refreshAds(...ids: number[]): void {
    this.push(() => this.runtime()?.refreshAds?.(...ids));
  }

  /**
   * Reports whether the current visitor is in the Ezoic A/B group. Because the
   * runtime may still be loading, the result is delivered to `callback` rather
   * than returned. `percentage` overrides the sampling rate. No-op during
   * server-side rendering.
   */
  isEzoicUser(callback: (isUser: boolean) => void, percentage?: number): void {
    this.push(() => this.runtime()?.isEzoicUser?.(percentage, callback));
  }

  /**
   * Marks the page as a single-page application so subsequent `showAds` calls on
   * new pageviews refresh ads for the new route. Push once at app boot; the
   * `withRouterRefresh` provider feature does this for you.
   */
  setIsSinglePageApplication(value: boolean): void {
    this.push(() => this.runtime()?.setIsSinglePageApplication?.(value));
  }

  /**
   * Enables the runtime's auto-refresh behaviour: on each new pageview it clears
   * placeholder DOM and fires `ezPageUnload`. Off by default.
   */
  setAutoRefresh(value: boolean): void {
    this.push(() => this.runtime()?.setAutoRefresh?.(value));
  }

  /**
   * Signals a new pageview to the runtime. Rarely needed: the runtime already
   * detects `history.pushState`/`replaceState` automatically, so calling this in
   * addition would double-fire. Exposed for imperative flows that change the
   * pageview without a history navigation.
   */
  newPage(): void {
    this.push(() => this.runtime()?.newPage?.());
  }

  /**
   * Resolves a semantic ("zero-config") location name to a placeholder id.
   *
   * When the runtime has loaded it delegates to `ezstandalone.GetGeneratedIdAsync`,
   * which is DOM-aware and allocates a free id in the reserved 900-999 range.
   * Before the runtime is available it falls back to the SDK's static
   * name-to-id map. Returns `null` for an unknown location name and during
   * server-side rendering. Used by the `<ezoic-ad location="...">` component;
   * publishers rarely need to call it directly.
   *
   * @param location A semantic location name or alias (for example
   *   `"under_first_paragraph"` or `"incontent_5"`).
   */
  async resolveLocationId(location: string): Promise<number | null> {
    if (!this.isBrowser) {
      return null;
    }
    const runtime = this.runtime();
    if (typeof runtime?.GetGeneratedIdAsync === 'function') {
      try {
        const resolved = Number(await runtime.GetGeneratedIdAsync(location));
        if (Number.isInteger(resolved) && resolved >= MIN_PLACEHOLDER_ID) {
          return resolved;
        }
      } catch {
        // Fall back to the static map when the runtime helper throws.
      }
    }
    return resolveStaticLocationId(location);
  }

  /**
   * Signals that the publisher manages consent (an Ezoic-compatible CMP is on
   * the page). The SDK injects the CMP scripts by default, so most sites do not
   * need to call this. No-op during server-side rendering.
   */
  enableConsent(): void {
    this.push(() => this.runtime()?.enableConsent?.());
  }

  /**
   * Opts the current visitor out of personalized statistics. No-op during
   * server-side rendering.
   */
  setDisablePersonalizedStatistics(disable: boolean): void {
    this.push(() => this.runtime()?.setDisablePersonalizedStatistics?.(disable));
  }

  /**
   * Opts the current visitor out of personalized ads. No-op during server-side
   * rendering.
   */
  setDisablePersonalizedAds(disable: boolean): void {
    this.push(() => this.runtime()?.setDisablePersonalizedAds?.(disable));
  }

  /** Enables or disables the Ezoic anchor ad. No-op during server-side rendering. */
  setEzoicAnchorAd(enabled: boolean): void {
    this.push(() => this.runtime()?.setEzoicAnchorAd?.(enabled));
  }

  /**
   * Resolves whether the visitor has closed the anchor ad (reads the
   * `ez_anchor_closed` cookie). Resolves once the runtime is ready; resolves to
   * `false` during server-side rendering.
   */
  hasAnchorAdBeenClosed(): Promise<boolean> {
    return this.query((rt) => rt.hasAnchorAdBeenClosed?.(), false);
  }

  /**
   * Allows or blocks the interstitial ad. `options` is forwarded to the runtime
   * unchanged. No-op during server-side rendering.
   */
  setInterstitialAllowed(allowed: boolean, options?: Record<string, unknown>): void {
    this.push(() => this.runtime()?.setInterstitialAllowed?.(allowed, options));
  }

  /**
   * Resolves whether the interstitial ad is currently allowed. Resolves once
   * the runtime is ready; resolves to `false` during server-side rendering.
   */
  isInterstitialAllowed(): Promise<boolean> {
    return this.query((rt) => rt.isInterstitialAllowed?.(), false);
  }

  /**
   * Allows or blocks the floating outstream video. `options` is forwarded to
   * the runtime unchanged. Resolves to the effective allowed state once the
   * runtime is ready; resolves to `false` during server-side rendering.
   */
  setOutstreamAllowed(allowed: boolean, options?: Record<string, unknown>): Promise<boolean> {
    return this.query((rt) => rt.setOutstreamAllowed?.(allowed, options), false);
  }

  /**
   * Resolves whether floating outstream video is currently allowed. Resolves
   * once the runtime is ready; resolves to `false` during server-side rendering.
   */
  isOutstreamAllowed(): Promise<boolean> {
    return this.query((rt) => rt.isOutstreamAllowed?.(), false);
  }

  /**
   * Sets runtime ad configuration. Only the keys typed on {@link EzoicConfig}
   * are accepted; the runtime ignores unknown keys. No-op during server-side
   * rendering.
   *
   * Write-only: the public `window.ezstandalone.config` wrapper forwards to the
   * runtime but discards its return value, so the current configuration cannot
   * be read back through the runtime API. Track the values you set in your own
   * application state if you need to read them later.
   */
  config(options: EzoicConfig): void {
    this.push(() => this.runtime()?.config?.(options));
  }

  /**
   * Runs a value-returning runtime read inside the command queue so it binds to
   * the runtime once it is ready, and returns the result as a promise. During
   * server-side rendering — and if the read throws or returns `undefined` — it
   * resolves to `fallback`. The runtime read may itself return a promise (as
   * `setOutstreamAllowed` does); it is awaited before resolving.
   */
  private query<T>(
    read: (runtime: Ezstandalone) => T | Promise<T> | undefined,
    fallback: T,
  ): Promise<T> {
    if (!this.isBrowser) {
      return Promise.resolve(fallback);
    }
    return new Promise<T>((resolve) => {
      this.push(() => {
        const runtime = this.runtime();
        if (!runtime) {
          resolve(fallback);
          return;
        }
        try {
          const value = read(runtime);
          Promise.resolve(value as T | Promise<T>).then(
            (resolved) => resolve(resolved ?? fallback),
            () => resolve(fallback),
          );
        } catch {
          resolve(fallback);
        }
      });
    });
  }

  /**
   * Returns the live `ezstandalone` runtime once the header script has loaded,
   * or `undefined` before then. Resolved lazily inside queued commands so calls
   * bind to the real runtime at execution time, not at queue time.
   */
  private runtime(): Ezstandalone | undefined {
    const win = this.document.defaultView as EzoicWindow | null;
    return win?.ezstandalone;
  }
}
