/**
 * Minimal typings for the IAB TCF v2.2 CMP API (`window.__tcfapi`) — the subset
 * the SDK reads to surface consent state.
 *
 * Under TCF v2.2 the `getTCData` command is deprecated; consent state is
 * obtained by registering a listener with `addEventListener` (and released with
 * `removeEventListener`). The listener's callback receives the `TCData` object,
 * which carries the CMP-assigned `listenerId`.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md
 */

/**
 * Status of a TCF event delivered to an `addEventListener` callback.
 *
 * - `tcloaded` — a TC string is available to calling scripts.
 * - `cmpuishown` — the CMP UI was surfaced (or re-surfaced) to the user.
 * - `useractioncomplete` — the user confirmed (or re-confirmed) their choices.
 */
export type TcfEventStatus = 'tcloaded' | 'cmpuishown' | 'useractioncomplete';

/**
 * The subset of the TCF `TCData` object the SDK reads. The full object carries
 * per-purpose and per-vendor consent maps; those are intentionally not typed
 * here because the SDK does not interpret them.
 */
export interface TcfData {
  /**
   * The encoded TC string. Absent when GDPR does not apply to the user in this
   * context (only `gdprApplies`, `tcfPolicyVersion`, `cmpId` and `cmpVersion`
   * are guaranteed then).
   */
  tcString?: string;
  /** Which TCF event triggered the callback. */
  eventStatus?: TcfEventStatus;
  /** CMP load status; `"loaded"` once the CMP is available. */
  cmpStatus?: string;
  /** Whether GDPR applies to the user in this context. */
  gdprApplies?: boolean;
  /** CMP-assigned id for the registered listener, used to remove it later. */
  listenerId?: number;
}

/** Callback registered via `__tcfapi('addEventListener', 2, cb)`. */
export type TcfAddEventListenerCallback = (data: TcfData, success: boolean) => void;

/** Callback passed to `__tcfapi('removeEventListener', 2, cb, listenerId)`. */
export type TcfRemoveEventListenerCallback = (success: boolean) => void;

/**
 * The `window.__tcfapi` function. Only the two commands the SDK uses are typed
 * precisely; a permissive fallback overload keeps other TCF commands callable.
 */
export interface TcfApi {
  (command: 'addEventListener', version: number, callback: TcfAddEventListenerCallback): void;
  (
    command: 'removeEventListener',
    version: number,
    callback: TcfRemoveEventListenerCallback,
    listenerId: number,
  ): void;
  (
    command: string,
    version: number,
    callback: (...args: unknown[]) => void,
    parameter?: unknown,
  ): void;
}
