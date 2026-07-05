import { DestroyRef, Injectable, inject } from '@angular/core';
import { EzoicAdRegistry } from './ezoic-ad.registry';
import { EzoicService } from './ezoic.service';
import { EzoicRewardedPlacements } from './ezoic-rewarded.types';

/** Interval, in milliseconds, between polls of {@link EzoicService.isAdLoadStarted}. */
const POLL_INTERVAL_MS = 250;

/**
 * Grace window, in milliseconds, from scheduling before the deferred init fires
 * on a page that has mounted NO display placements (a rewarded-only page).
 */
const GRACE_MS = 4000;

/**
 * Defers the default (runtime-served) `initRewardedAds` call so it never
 * preempts the page's initial ad load, then dispatches it exactly once.
 *
 * The Ezoic runtime's `initRewardedAds` runs `showAds([12])` internally. On an
 * Ezoic JS-integrated page {@link withRewardedAds}'s app initializer runs before
 * any `<ezoic-ad>` mounts, so dispatching `initRewardedAds` immediately would
 * issue that internal `showAds([12])` before the page's first real `showAds` has
 * established the initial ad load. That collides with the runtime's
 * mid-initialization state machine and wedges the whole page: no `sa.go`
 * request, no ads render, and the rewarded loader never arrives.
 *
 * {@link schedule} instead dispatches when the first of these holds:
 *
 * 1. {@link EzoicService.isAdLoadStarted} reports the initial load has started
 *    (via the `/sa.go` ad request in resource timing, a GPT container rendered
 *    inside an Ezoic placeholder, or `ezstandalone.enabled`), so `showAds([12])`
 *    routes safely through `displayMore`. Polled every {@link POLL_INTERVAL_MS}
 *    ms.
 * 2. The {@link GRACE_MS} grace window elapses with NO display placement mounted
 *    ({@link EzoicAdRegistry.hasMountedPlacements} is `false`) — a rewarded-only
 *    page where `initRewardedAds` is itself the ad bootstrap.
 *
 * The registry is read at the deadline, not at scheduling time, because the
 * initializer boots before any component mounts. When the grace window elapses
 * while placements ARE mounted but the initial load has not started, init is NOT
 * fired at the deadline (that could preempt the pending load); the poll continues
 * until the load starts or the page unloads — never giving up avoids a silent
 * failure. The dispatch is page-global (this service is an application-root
 * singleton) and runs to completion once started. SSR-safe: a no-op with no
 * browser environment.
 */
@Injectable({ providedIn: 'root' })
export class EzoicRewardedInitScheduler {
  private readonly ezoic = inject(EzoicService);
  private readonly registry = inject(EzoicAdRegistry);
  private readonly destroyRef = inject(DestroyRef);

  /** Guards the scheduler so it is armed at most once per page. */
  private scheduled = false;

  /** Guards the single init dispatch (once per page). */
  private dispatched = false;

  /** Enabled-poll interval handle; cleared once init is dispatched. */
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  /** Grace-window timeout handle; cleared once init is dispatched. */
  private graceTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Arms the deferred dispatch of `initRewardedAds(placements)`. Idempotent: the
   * first call wins and its `placements` are the ones forwarded; later calls are
   * ignored. A no-op during server-side rendering.
   *
   * @param placements Site-wide rewarded placement toggles forwarded to
   *   `ezstandalone.initRewardedAds`. Omit for the runtime default (all enabled).
   */
  schedule(placements?: EzoicRewardedPlacements): void {
    if (!this.ezoic.isBrowser || this.scheduled) {
      return;
    }
    this.scheduled = true;
    this.destroyRef.onDestroy(() => this.clearTimers());

    // Fast path: the initial load has already started.
    if (this.ezoic.isAdLoadStarted()) {
      this.fire(placements);
      return;
    }

    this.pollTimer = setInterval(() => {
      if (this.ezoic.isAdLoadStarted()) {
        this.fire(placements);
      }
    }, POLL_INTERVAL_MS);

    this.graceTimer = setTimeout(() => {
      this.graceTimer = undefined;
      if (this.dispatched) {
        return;
      }
      // Rewarded-only page: init is the ad bootstrap, so fire it. Otherwise the
      // ad-load poll above owns the eventual dispatch.
      if (!this.registry.hasMountedPlacements()) {
        this.fire(placements);
      }
    }, GRACE_MS);
  }

  /** Dispatches `initRewardedAds` exactly once and cancels the pending timers. */
  private fire(placements?: EzoicRewardedPlacements): void {
    if (this.dispatched) {
      return;
    }
    this.dispatched = true;
    this.clearTimers();
    this.ezoic.initRewardedAds(placements);
  }

  /** Cancels any pending poll/grace timers. */
  private clearTimers(): void {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    if (this.graceTimer !== undefined) {
      clearTimeout(this.graceTimer);
      this.graceTimer = undefined;
    }
  }
}
