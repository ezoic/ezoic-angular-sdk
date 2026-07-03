import { Injectable, Signal, signal } from '@angular/core';

/**
 * Shared demo UI state. Holds the dynamic-content toggle that the shell's
 * "Load more ads" button flips and the Home route reads to mount extra
 * `<ezoic-ad>` placements after the initial page load.
 */
@Injectable({ providedIn: 'root' })
export class DemoStateService {
  private readonly _showMoreAds = signal(false);

  /** Whether the extra incontent placements should be mounted. */
  readonly showMoreAds: Signal<boolean> = this._showMoreAds.asReadonly();

  /** Toggles the dynamic-content placements and returns the new state. */
  toggleMoreAds(): boolean {
    const next = !this._showMoreAds();
    this._showMoreAds.set(next);
    return next;
  }
}
