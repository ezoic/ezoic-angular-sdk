import { Injectable, inject } from '@angular/core';
import { EzoicService } from './ezoic.service';

/**
 * Coordinates `<ezoic-video>` component instances so that every video div that
 * mounts in the same tick is loaded with a single `displayMoreVideo(...)` call.
 *
 * `displayMoreVideo` both appends the divs to the video registry and requests
 * them, so it is the only runtime call the component load path makes (it never
 * pairs it with `defineVideo`, which would double-append). Mounted div ids are
 * reference-counted so a video placeholder is torn down exactly once, when its
 * last component unmounts. Internal: not part of the public API.
 *
 * The `displayMoreVideo` call is queued on the command queue but the runtime
 * only drains queued video requests once page-level ad scripts have loaded
 * (triggered by a `showAds`/display placement or `initRewardedAds`). A page with
 * only `<ezoic-video>` and no other ad initialization leaves the request queued;
 * see {@link EzoicVideoComponent} for the full requirement.
 */
@Injectable({ providedIn: 'root' })
export class EzoicVideoRegistry {
  private readonly ezoic = inject(EzoicService);

  /** Live mount count per video div id (guards against premature teardown). */
  private readonly mounted = new Map<string, number>();

  /** Div ids registered this tick and not yet flushed to `displayMoreVideo`. */
  private readonly pending = new Set<string>();

  private flushScheduled = false;

  /**
   * Registers a video div for display. The first mount of an id schedules it
   * into the next `displayMoreVideo` batch; a second concurrent mount of the
   * same id is a publisher error (div ids must be unique on a page) and is
   * warned about and ignored. No-op during server-side rendering.
   */
  register(divId: string): void {
    if (!this.ezoic.isBrowser) {
      return;
    }
    const count = this.mounted.get(divId) ?? 0;
    if (count > 0) {
      this.mounted.set(divId, count + 1);
      console.warn(
        `[ezoic] Duplicate <ezoic-video> divId "${divId}": each video div id must be unique on a ` +
          `page. The duplicate was ignored.`,
      );
      return;
    }
    this.mounted.set(divId, 1);
    this.pending.add(divId);
    this.scheduleFlush();
  }

  /**
   * Unregisters a video div mount. When the last mount of an id is removed the
   * video placeholder is torn down via `destroyVideoPlaceholders`; if it was
   * registered and removed before its batch flushed it is simply dropped (it
   * never loaded). No-op during server-side rendering.
   */
  unregister(divId: string): void {
    if (!this.ezoic.isBrowser) {
      return;
    }
    const count = this.mounted.get(divId) ?? 0;
    if (count <= 0) {
      return;
    }
    if (count > 1) {
      this.mounted.set(divId, count - 1);
      return;
    }
    this.mounted.delete(divId);
    if (this.pending.delete(divId)) {
      return;
    }
    this.ezoic.destroyVideoPlaceholders(divId);
  }

  private scheduleFlush(): void {
    if (this.flushScheduled) {
      return;
    }
    this.flushScheduled = true;
    queueMicrotask(() => this.flush());
  }

  private flush(): void {
    this.flushScheduled = false;
    if (this.pending.size === 0) {
      return;
    }
    const divIds = [...this.pending];
    this.pending.clear();
    this.ezoic.displayMoreVideo(...divIds);
  }
}
