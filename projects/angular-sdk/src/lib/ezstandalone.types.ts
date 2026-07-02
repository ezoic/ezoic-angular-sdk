/**
 * Minimal typings for the parts of the global `window.ezstandalone` runtime the
 * SDK interacts with. The full public surface is documented at
 * https://docs.ezoic.com/docs/ezoicads/integration/ ; this interface is grown
 * as later features wrap more of the runtime.
 */

/** A function queued on `ezstandalone.cmd` to run once the runtime is ready. */
export type EzoicCommand = () => void;

/**
 * The subset of `window.ezstandalone` the SDK reads or writes. The command
 * queue is the only member required before the header script (`sa.min.js`)
 * finishes loading; the remaining flags are populated by the runtime at load
 * time and are exposed here read-only.
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
}

/** `Window` augmented with the optional Ezoic runtime global. */
export interface EzoicWindow extends Window {
  ezstandalone?: Ezstandalone;
}
