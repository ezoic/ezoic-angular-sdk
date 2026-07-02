import { EnvironmentProviders, Provider } from '@angular/core';

/**
 * Identifies the kind of an {@link EzoicFeature}. Used only for debugging and
 * potential future de-duplication; not part of a public contract.
 */
export type EzoicFeatureKind = 'router-refresh' | 'rewarded-ads';

/**
 * An optional capability passed to {@link provideEzoic} after the options
 * argument, for example `provideEzoic(options, withRouterRefresh())`.
 *
 * A feature contributes providers to the application injector. Opting out of a
 * feature is simply not passing it.
 */
export interface EzoicFeature {
  /** Discriminates the feature kind (debug/introspection only). */
  readonly kind: EzoicFeatureKind;
  /** Providers the feature contributes to the application injector. */
  readonly providers: (Provider | EnvironmentProviders)[];
}
