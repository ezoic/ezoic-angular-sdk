import { Injectable, inject } from '@angular/core';
import { EzoicService } from './ezoic.service';
import { EzoicPlaceholder } from './placeholder';
import { EzoicPlaceholderArg } from './ezstandalone.types';

/**
 * Coordinates `<ezoic-ad>` component instances so that every placeholder that
 * mounts in the same tick is requested with a single `showAds(...)` call.
 *
 * The Ezoic runtime applies its own 200-800 ms debounce on top, so the SDK adds
 * no further timer of its own — it only coalesces same-tick registrations via a
 * microtask. Mounted ids are reference-counted so a placeholder is torn down
 * exactly once, when its last component unmounts. Internal: not part of the
 * public API.
 */
@Injectable({ providedIn: 'root' })
export class EzoicAdRegistry {
  private readonly ezoic = inject(EzoicService);

  /** Live mount count per placeholder id (guards against premature teardown). */
  private readonly mounted = new Map<number, number>();

  /** Placeholders registered this tick and not yet flushed to `showAds`. */
  private readonly pending = new Map<number, EzoicPlaceholder>();

  private flushScheduled = false;

  /**
   * Registers a placeholder for display. The first mount of an id schedules it
   * into the next `showAds` batch; a second concurrent mount of the same id is
   * a publisher error (ids must be unique on a page) and is warned about and
   * ignored. No-op during server-side rendering.
   */
  register(placeholder: EzoicPlaceholder): void {
    if (!this.ezoic.isBrowser) {
      return;
    }
    const { id } = placeholder;
    const count = this.mounted.get(id) ?? 0;
    if (count > 0) {
      this.mounted.set(id, count + 1);
      console.warn(
        `[ezoic] Duplicate <ezoic-ad> placeholder id ${id}: each Ezoic placeholder id must be ` +
          `unique on a page. The duplicate was ignored.`,
      );
      return;
    }
    this.mounted.set(id, 1);
    this.pending.set(id, placeholder);
    this.scheduleFlush();
  }

  /**
   * Unregisters a placeholder mount. When the last mount of an id is removed the
   * placeholder is torn down via `destroyPlaceholders`; if it was registered and
   * removed before its batch flushed it is simply dropped (it never displayed).
   * No-op during server-side rendering.
   */
  unregister(id: number): void {
    if (!this.ezoic.isBrowser) {
      return;
    }
    const count = this.mounted.get(id) ?? 0;
    if (count <= 0) {
      return;
    }
    if (count > 1) {
      this.mounted.set(id, count - 1);
      return;
    }
    this.mounted.delete(id);
    if (this.pending.delete(id)) {
      return;
    }
    this.ezoic.destroyPlaceholders(id);
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
    const args: EzoicPlaceholderArg[] = [];
    for (const placeholder of this.pending.values()) {
      args.push(toShowAdsArg(placeholder));
    }
    this.pending.clear();
    this.ezoic.showAds(...args);
  }
}

/**
 * Reduces a placeholder to the leanest `showAds` argument: a bare id when no
 * options are set, otherwise the full object form.
 */
function toShowAdsArg(placeholder: EzoicPlaceholder): EzoicPlaceholderArg {
  const sizes = placeholder.sizes ?? [];
  if (!placeholder.required && sizes.length === 0) {
    return placeholder.id;
  }
  return { id: placeholder.id, required: placeholder.required ?? false, sizes };
}
