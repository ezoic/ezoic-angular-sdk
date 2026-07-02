/**
 * Typed configuration accepted by the Ezoic runtime's `config(...)` method.
 *
 * The runtime **ignores unknown keys** (it logs an error and drops them), so
 * this interface is intentionally a tight union of the verified, accepted keys.
 * That gives compile-time rejection of typos in addition to the runtime guard.
 *
 * @see https://docs.ezoic.com/docs/ezoicads/integration/
 */
export interface EzoicConfig {
  /**
   * Position of the anchor ad. Typically `"top"` or `"bottom"`.
   *
   * @default "bottom"
   */
  anchorAdPosition?: string;
  /** Opt in to anchor-ad expansion. Left unset by default. */
  anchorAdExpansion?: boolean;
  /** Disable video ads for the page. */
  disableVideo?: boolean;
  /** Disable the interstitial ad for the page. */
  disableInterstitial?: boolean;
  /** Disable the left side-rail ad. */
  disableLeftSideRail?: boolean;
  /** Disable the right side-rail ad. */
  disableRightSideRail?: boolean;
  /** Disable floating of the sidebar ad. */
  disableSidebarFloating?: boolean;
  /**
   * Reserve layout space for placeholders before ads load, reducing cumulative
   * layout shift (CLS).
   *
   * @default false
   */
  reservePlaceholderSpace?: boolean;
  /**
   * Limit the cookies the runtime sets. Consumed server-side.
   *
   * @default false
   */
  limitCookies?: boolean;
  /** Enable the vignette (full-screen) ad on desktop. */
  vignetteDesktop?: boolean;
  /** Enable the vignette (full-screen) ad on mobile. */
  vignetteMobile?: boolean;
  /** Enable the vignette (full-screen) ad on tablet. */
  vignetteTablet?: boolean;
}
