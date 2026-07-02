/**
 * Minimal typings for the parts of the global `window.ezstandalone` runtime the
 * SDK interacts with. The full public surface is documented at
 * https://docs.ezoic.com/docs/ezoicads/integration/ ; this interface is grown
 * as later features wrap more of the runtime.
 */

import type { EzoicPlaceholder } from './placeholder';
import type { EzoicConfig } from './ezoic-runtime-config';
import type { TcfApi } from './tcf.types';
import type { EzoicRewardedApi, EzoicRewardedPlacements } from './ezoic-rewarded.types';

/** A function queued on `ezstandalone.cmd` to run once the runtime is ready. */
export type EzoicCommand = () => void;

/**
 * An argument accepted by `ezstandalone.showAds`: either a bare placeholder id
 * or the full {@link EzoicPlaceholder} object form.
 */
export type EzoicPlaceholderArg = number | EzoicPlaceholder;

/**
 * An entry accepted by `ezstandalone.defineVideo` / `displayMoreVideo`: either a
 * bare video div-id string or the object form `{ divID }`.
 */
export type EzoicVideoDefinition = string | { divID: string };

/**
 * An entry pushed onto `window.openVideoPlayers` to mount an Open Video inline
 * embed. The Open Video script (`https://open.video/video.js`) reads `target`
 * (the container element), `videoID`, and the optional `playlist`, `float` and
 * `autoplay` fields off each entry. Note the exact `videoID` casing (capital
 * `ID`).
 */
export interface EzoicOpenVideoEntry {
  /** The container element the player mounts into. */
  target: Element;
  /** The Open Video video id (capital `ID`, as read by the embed script). */
  videoID: string;
  /** Optional playlist id to load instead of a single video. */
  playlist?: string;
  /** Enable the floating player behaviour. */
  float?: boolean;
  /** Autoplay the video. */
  autoplay?: boolean;
}

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
  /**
   * Clears the video registry and registers `entries` WITHOUT loading them.
   * Each entry is a video div-id string or `{ divID }`. Use `displayMoreVideo`
   * to actually load video placeholders.
   */
  defineVideo?(...entries: EzoicVideoDefinition[]): void;
  /**
   * Appends `entries` to the video registry AND loads them — the video analog
   * of `showAds`. Each entry is a video div-id string or `{ divID }`. Gated
   * internally on document readiness (self-queues until ready).
   */
  displayMoreVideo?(...entries: EzoicVideoDefinition[]): void;
  /** Tears down the given video placeholders by div id (clears the div and destroys the player). */
  destroyVideoPlaceholders?(...divIDs: string[]): void;
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
  /**
   * Resolves a semantic location name (for example `"under_first_paragraph"`)
   * to a placeholder id, allocating a free id in the reserved 900-999 range.
   * Present only after the header script has loaded; before then the SDK falls
   * back to its own static name-to-id map. The runtime returns the id as either
   * a number or a numeric string.
   */
  GetGeneratedIdAsync?(location: string): Promise<number | string>;
  /**
   * Setter for the runtime ad configuration. Called with an object it merges
   * the known keys and ignores unknown ones (logging an error). The public
   * `window.ezstandalone.config` wrapper does not return a value, so it cannot
   * be used as a getter.
   */
  config?(options: EzoicConfig): void;
  /** Signals to the server that the publisher manages consent (CMP present). */
  enableConsent?(): void;
  /** Opts the visitor out of personalized statistics. */
  setDisablePersonalizedStatistics?(disable: boolean): void;
  /** Opts the visitor out of personalized ads. */
  setDisablePersonalizedAds?(disable: boolean): void;
  /** Enables or disables the Ezoic anchor ad for the page. */
  setEzoicAnchorAd?(value: boolean): void;
  /** Reads the `ez_anchor_closed` cookie: `true` if the user closed the anchor ad. */
  hasAnchorAdBeenClosed?(): boolean;
  /** Allows or blocks the interstitial ad; `options` is passed through to the runtime. */
  setInterstitialAllowed?(allowed: boolean, options?: Record<string, unknown>): void;
  /** Reports whether the interstitial ad is currently allowed. */
  isInterstitialAllowed?(): boolean;
  /**
   * Allows or blocks the floating outstream video; delegates to the outstream
   * player when present and resolves to the effective allowed state.
   */
  setOutstreamAllowed?(
    allowed: boolean,
    options?: Record<string, unknown>,
  ): Promise<boolean> | boolean;
  /** Reports whether floating outstream video is currently allowed. */
  isOutstreamAllowed?(): boolean;
  /**
   * Configures which site-wide rewarded placements are enabled. `placements`
   * defaults to all enabled (`{ anchor, interstitial, video, sideRails }` all
   * `true`) when omitted. Setter, returns nothing.
   */
  initRewardedAds?(placements?: EzoicRewardedPlacements): void;
}

/** `Window` augmented with the optional Ezoic runtime and TCF CMP globals. */
export interface EzoicWindow extends Window {
  ezstandalone?: Ezstandalone;
  /** IAB TCF v2.2 CMP API, present once an Ezoic-compatible CMP has loaded. */
  __tcfapi?: TcfApi;
  /**
   * Rewarded-ads runtime, present once the site-specific rewarded loader
   * (`{host}/porpoiseant/ezadloadrewarded.js`) has been injected. Separate from
   * {@link EzoicWindow.ezstandalone} with its own command queue.
   */
  ezRewardedAds?: EzoicRewardedApi;
  /**
   * Open Video embed queue. The canonical global the Open Video script
   * (`https://open.video/video.js`) drains to mount inline embeds; the SDK
   * pushes an {@link EzoicOpenVideoEntry} per `<ezoic-video-embed>`. The
   * `||[]` guard tolerates pushes before the script loads. (`humixPlayers` is a
   * legacy alias; the SDK never writes to it.)
   */
  openVideoPlayers?: EzoicOpenVideoEntry[];
}
