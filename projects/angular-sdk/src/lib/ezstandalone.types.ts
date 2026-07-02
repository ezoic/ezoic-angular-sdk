/**
 * Minimal typings for the parts of the global `window.ezstandalone` runtime the
 * SDK interacts with. The full public surface is documented at
 * https://docs.ezoic.com/docs/ezoicads/integration/ ; this interface is grown
 * as later features wrap more of the runtime.
 */

import type { EzoicPlaceholder } from './placeholder';

/** A function queued on `ezstandalone.cmd` to run once the runtime is ready. */
export type EzoicCommand = () => void;

/**
 * An argument accepted by `ezstandalone.showAds`: either a bare placeholder id
 * or the full {@link EzoicPlaceholder} object form.
 */
export type EzoicPlaceholderArg = number | EzoicPlaceholder;

/**
 * The subset of `window.ezstandalone` the SDK reads or writes. The command
 * queue is the only member required before the header script (`sa.min.js`)
 * finishes loading; the remaining members are populated by the runtime at load
 * time, so their method signatures are declared optional and always invoked
 * through the command queue.
 */
export interface Ezstandalone {
  /**
   * Command queue. Functions pushed before the runtime loads are buffered and
   * executed in order once it is ready; functions pushed afterwards run
   * immediately.
   */
  cmd: EzoicCommand[];
  /** `true` once the runtime has been enabled for the current pageview. */
  enabled?: boolean;
  /** `true` once the runtime has completed its one-time initialization. */
  initialized?: boolean;
  /**
   * Requests the given placeholders. Ids initializing in the same tick are
   * batched by the SDK into a single call; the runtime applies its own
   * additional debounce.
   */
  showAds?(...placeholders: EzoicPlaceholderArg[]): void;
  /** Requests additional placeholders after the initial page load. */
  displayMore?(...ids: number[]): void;
  /** Tears down the given placeholders by id. */
  destroyPlaceholders?(...ids: number[]): void;
  /** Tears down every selected placeholder plus anchor, side rails and floating outstream. */
  destroyAll?(): void;
  /** Re-requests bids for the given (header-bidding) placeholders by id. */
  refreshAds?(...ids: number[]): void;
  /**
   * Reports whether the current visitor is in the Ezoic A/B group. The result
   * is delivered to `callback`; `percentage` overrides the sampling rate.
   */
  isEzoicUser?(percentage?: number, callback?: (isUser: boolean) => void): boolean;
  /**
   * Marks the page as a single-page application. When enabled, a subsequent
   * `showAds` on a new pageview routes through the runtime's internal
   * `refresh()` flow instead of a first-load, so ads reload for the new route.
   * Push this once at application boot.
   */
  setIsSinglePageApplication?(value: boolean): void;
  /**
   * When `true`, the runtime clears placeholder DOM and fires `ezPageUnload` on
   * each new pageview (`newPage`). Off by default.
   */
  setAutoRefresh?(value: boolean): void;
  /**
   * Signals a new pageview to the runtime (resets the enabled state so the next
   * `showAds` refreshes). The runtime also calls this automatically on
   * `history.pushState`/`replaceState` (debounced ~1000 ms), so the SDK does not
   * call it during router navigation to avoid double-firing.
   */
  newPage?(): void;
}

/** `Window` augmented with the optional Ezoic runtime global. */
export interface EzoicWindow extends Window {
  ezstandalone?: Ezstandalone;
}
