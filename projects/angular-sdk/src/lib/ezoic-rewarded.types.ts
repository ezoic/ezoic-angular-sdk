/**
 * Typings for the global `window.ezRewardedAds` rewarded-ads runtime.
 *
 * Rewarded ads use a runtime that is separate from `window.ezstandalone`: it has
 * its own command queue (`ezRewardedAds.cmd`) and is loaded by a site-specific
 * loader script (`{host}/porpoiseant/ezadloadrewarded.js`). Every runtime method
 * is callback-based — the result is delivered to a callback rather than returned
 * — so these types describe callback shapes, not return values.
 */

/**
 * Configuration for {@link EzoicRewardedApi.request}.
 */
export interface EzoicRewardedRequestConfig {
  /**
   * Minimum CPM (in the account currency) the ad must clear to be served. Pass
   * `null` to explicitly clear any default floor.
   */
  minCPM?: number | null;
  /** Publisher-defined reward type label sent with the request. */
  rewardType?: string;
  /** Publisher-defined reward amount sent with the request. */
  rewardAmount?: number;
}

/**
 * Configuration for {@link EzoicRewardedApi.show}.
 */
export interface EzoicRewardedShowConfig {
  /** Publisher-defined reward name reported back on grant. */
  rewardName?: string;
  /** Arbitrary publisher metadata echoed back in the outcome's `userInfo`. */
  userInfo?: Record<string, unknown>;
}

/**
 * Configuration for {@link EzoicRewardedApi.requestAndShow}: request an ad and,
 * if available, display it in a single call.
 */
export interface EzoicRewardedRequestAndShowConfig {
  /** Publisher-defined reward name reported back on grant. */
  rewardName?: string;
  /** When `true`, still fire the reward callback when there was no fill. */
  rewardOnNoFill?: boolean;
  /** When `true`, show the runtime's loading overlay while the ad is fetched. */
  loadingOverlay?: boolean;
  /**
   * Minimum CPM (in the account currency) the ad must clear to be served. Pass
   * `null` to explicitly clear any default floor.
   */
  minCPM?: number | null;
  /** Publisher-defined reward type label sent with the request. */
  rewardType?: string;
  /** Publisher-defined reward amount sent with the request. */
  rewardAmount?: number;
}

/**
 * Copy for the confirmation overlay shown by
 * {@link EzoicRewardedApi.requestWithOverlay}.
 */
export interface EzoicRewardedOverlayText {
  /** Overlay heading. */
  header?: string;
  /** Overlay body, one string per paragraph. */
  body?: string[];
  /** Label for the accept/confirm button. */
  accept?: string;
  /** Label for the cancel/dismiss button. */
  cancel?: string;
}

/**
 * Configuration for {@link EzoicRewardedApi.requestWithOverlay}: everything
 * {@link EzoicRewardedRequestAndShowConfig} accepts plus overlay-specific flags.
 */
export interface EzoicRewardedOverlayConfig extends EzoicRewardedRequestAndShowConfig {
  /** When `true`, lock page scroll while the overlay is visible. */
  lockScroll?: boolean;
  /** When `true`, skip the confirmation prompt and proceed directly. */
  dontAsk?: boolean;
}

/**
 * The `alwaysCallback` flag as the `requestAndShow`/`requestWithOverlay`
 * runtime methods actually accept it. Deliberately absent from the public
 * {@link EzoicRewardedRequestAndShowConfig}/{@link EzoicRewardedOverlayConfig}
 * config types: the SDK always forces this flag internally so its
 * Promise-wrapped methods deterministically resolve on every outcome, so it is
 * not a caller-configurable option.
 */
interface EzoicRewardedAlwaysCallback {
  alwaysCallback?: boolean;
}

/**
 * Action for {@link EzoicRewardedApi.contentLocker}: either a redirect URL
 * (`string`) to navigate to after the reward, or a callback (`() => void`) to
 * run after the reward is granted.
 */
export type EzoicRewardedContentLockerAction = string | (() => void);

/**
 * Optional call-to-action copy for the content-locker prompt.
 */
export interface EzoicRewardedContentLockerCallToAction {
  /** When `true`, suppress the built-in call-to-action prompt. */
  disabled?: boolean;
  /** Call-to-action heading. */
  header?: string;
  /** Call-to-action body text. */
  body?: string;
  /** Call-to-action button label. */
  button?: string;
}

/**
 * Configuration for {@link EzoicRewardedApi.contentLocker}.
 */
export interface EzoicRewardedContentLockerConfig {
  /** When `true`, show the runtime's loading overlay while the ad is fetched. */
  loadingOverlay?: boolean;
  /**
   * Called with the request outcome once the ad is ready (or fails). Receives
   * the same shape as {@link EzoicRewardedApi.request}'s callback.
   */
  readyCallback?: (result: EzoicRewardedRequestOutcome) => void;
  /** Publisher-defined reward name reported back on grant. */
  rewardName?: string;
  /**
   * Minimum CPM (in the account currency) the ad must clear to be served. Pass
   * `null` to explicitly clear any default floor.
   */
  minCPM?: number | null;
  /** Optional call-to-action copy overrides. */
  callToAction?: EzoicRewardedContentLockerCallToAction;
}

/**
 * Outcome delivered to the callback of {@link EzoicRewardedApi.request} and of
 * a content-locker `readyCallback`.
 */
export interface EzoicRewardedRequestOutcome {
  /** `true` when an ad was successfully requested and is ready to show. */
  status: boolean;
  /** Human-readable status/error message from the runtime. */
  msg: string;
  /** Optional ad metadata provided by the runtime. */
  adInfo?: Record<string, unknown>;
}

/**
 * Outcome delivered to the callback of {@link EzoicRewardedApi.show},
 * {@link EzoicRewardedApi.requestAndShow} and
 * {@link EzoicRewardedApi.requestWithOverlay}.
 */
export interface EzoicRewardedShowOutcome {
  /** `true` when the ad was successfully shown. */
  status: boolean;
  /** `true` when the user completed the ad and the reward should be granted. */
  reward: boolean;
  /** Human-readable status/error message from the runtime. */
  msg: string;
  /** Optional ad metadata provided by the runtime. */
  adInfo?: Record<string, unknown>;
  /** Publisher metadata echoed back from the show config. */
  userInfo?: Record<string, unknown>;
}

/**
 * Lifecycle status of the rewarded-ads runtime, driven by the `window` events
 * the loader fires (`ezRewardedInitiated`, `ezRewardedDisplayed`,
 * `ezRewardedClosed`). Starts at `'idle'`.
 */
export type EzoicRewardedStatus = 'idle' | 'initiated' | 'displayed' | 'closed';

/**
 * Site-wide rewarded placement toggles for `ezstandalone.initRewardedAds`. Any
 * omitted key falls back to the runtime default (all `true`).
 */
export interface EzoicRewardedPlacements {
  /** Enable the anchor rewarded placement. */
  anchor?: boolean;
  /** Enable the interstitial rewarded placement. */
  interstitial?: boolean;
  /** Enable the video rewarded placement. */
  video?: boolean;
  /** Enable the side-rails rewarded placement. */
  sideRails?: boolean;
}

/**
 * The shape of `window.ezRewardedAds`. Like `ezstandalone`, only the command
 * queue is guaranteed before the loader script finishes; the runtime methods are
 * populated at load time, so they are optional and always invoked through the
 * command queue. Every method is callback-based.
 */
export interface EzoicRewardedApi {
  /** `true` once the rewarded loader has finished initializing the runtime. */
  ready?: boolean;
  /**
   * Command queue. Functions pushed before the loader is ready are buffered and
   * executed in order once it is ready; functions pushed afterwards run
   * immediately. Each function takes no arguments and references
   * `window.ezRewardedAds` itself.
   */
  cmd: (() => void)[];
  /** Internal registration hook invoked by the loader; rarely called directly. */
  register?(): void;
  /**
   * Requests a rewarded ad. The outcome is delivered to `callback`.
   */
  request?(
    callback: (data: EzoicRewardedRequestOutcome) => void,
    config?: EzoicRewardedRequestConfig,
  ): void;
  /**
   * Shows a previously requested rewarded ad. The outcome is delivered to
   * `callback`.
   */
  show?(callback: (data: EzoicRewardedShowOutcome) => void, config?: EzoicRewardedShowConfig): void;
  /**
   * Requests and, if available, shows a rewarded ad in one call. The outcome is
   * delivered to `callback`. `config` also accepts `alwaysCallback`, which the
   * SDK always forces to `true` internally.
   */
  requestAndShow?(
    callback: (data: EzoicRewardedShowOutcome) => void,
    config?: EzoicRewardedRequestAndShowConfig & EzoicRewardedAlwaysCallback,
  ): void;
  /**
   * Requests a rewarded ad behind a confirmation overlay. Note the callback is
   * the first argument, then the overlay `text`, then `config`. The outcome is
   * delivered to `callback`. `config` also accepts `alwaysCallback`, which the
   * SDK always forces to `true` internally.
   */
  requestWithOverlay?(
    callback: (data: EzoicRewardedShowOutcome) => void,
    text?: EzoicRewardedOverlayText,
    config?: EzoicRewardedOverlayConfig & EzoicRewardedAlwaysCallback,
  ): void;
  /**
   * Locks content behind a rewarded ad. `action` is either a redirect URL or a
   * callback to run after the reward; the request outcome is delivered to the
   * `readyCallback` in `config`.
   */
  contentLocker?(
    action: EzoicRewardedContentLockerAction,
    config?: EzoicRewardedContentLockerConfig,
  ): void;
}
