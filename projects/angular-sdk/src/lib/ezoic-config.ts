import { InjectionToken } from '@angular/core';

/** Default URL of the Ezoic standalone header bundle (`sa.min.js`). */
export const EZOIC_SA_SCRIPT_URL = 'https://www.ezojs.com/ezoic/sa.min.js';

/**
 * URLs of the two Ezoic consent-management (CMP) scripts, in the exact order
 * they must load. Both are injected with `data-cfasync="false"` before the
 * header script for privacy compliance.
 *
 * @see https://docs.ezoic.com/docs/ezoicads/integration/
 */
export const EZOIC_CMP_SCRIPT_URLS = [
  'https://cmp.gatekeeperconsent.com/min.js',
  'https://the.gatekeeperconsent.com/cmp.min.js',
] as const;

/** Default URL of the optional Ezoic analytics script. */
export const EZOIC_ANALYTICS_SCRIPT_URL = 'https://ezoicanalytics.com/analytics.js';

/**
 * URL of the Open Video embed script, injected once by `<ezoic-video-embed>`. It
 * drains `window.openVideoPlayers` to mount inline video embeds.
 *
 * @see https://docs.ezoic.com/docs/ezoicadsadvanced/ezoic-video/
 */
export const EZOIC_OPEN_VIDEO_SCRIPT_URL = 'https://open.video/video.js';

/** Options accepted by `provideEzoic`. */
export interface EzoicOptions {
  /**
   * Inject the two Ezoic consent-management (CMP) scripts before the header
   * script. These must load first for privacy compliance. Only disable this if
   * your site already loads an Ezoic-compatible TCF CMP.
   *
   * @default true
   */
  cmp?: boolean;
  /**
   * URL of the Ezoic standalone header bundle. Override only to pin a specific
   * build (for example the ES6 variant).
   *
   * @default EZOIC_SA_SCRIPT_URL
   */
  scriptUrl?: string;
  /**
   * Inject the Ezoic analytics script after the header script.
   *
   * @default true
   */
  analytics?: boolean;
  /**
   * URL of the analytics script injected when {@link EzoicOptions.analytics} is
   * enabled.
   *
   * @default EZOIC_ANALYTICS_SCRIPT_URL
   */
  analyticsScriptUrl?: string;
}

/** {@link EzoicOptions} with every field resolved to a concrete value. */
export interface ResolvedEzoicOptions {
  cmp: boolean;
  scriptUrl: string;
  analytics: boolean;
  analyticsScriptUrl: string;
}

/** DI token carrying the raw {@link EzoicOptions} passed to `provideEzoic`. */
export const EZOIC_OPTIONS = new InjectionToken<EzoicOptions>('EZOIC_OPTIONS');

/** Merges caller {@link EzoicOptions} over the built-in defaults. */
export function resolveEzoicOptions(options: EzoicOptions = {}): ResolvedEzoicOptions {
  return {
    cmp: options.cmp ?? true,
    scriptUrl: options.scriptUrl ?? EZOIC_SA_SCRIPT_URL,
    analytics: options.analytics ?? true,
    analyticsScriptUrl: options.analyticsScriptUrl ?? EZOIC_ANALYTICS_SCRIPT_URL,
  };
}
