import {
  EnvironmentProviders,
  Provider,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { EZOIC_OPTIONS, EzoicOptions } from './ezoic-config';
import { EzoicService } from './ezoic.service';
import { EzoicFeature } from './ezoic-feature';

/**
 * Configures the Ezoic SDK for an Angular application.
 *
 * Add the returned providers to your `ApplicationConfig`. At startup (browser
 * only) the SDK injects, in order, the Ezoic consent scripts, the command-queue
 * stub and the `sa.min.js` header bundle, then optionally the analytics script.
 * During server-side rendering it does nothing and touches no browser globals.
 *
 * @example
 * ```ts
 * import { ApplicationConfig } from '@angular/core';
 * import { provideEzoic } from '@ezoic/angular-sdk';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideEzoic()],
 * };
 * ```
 *
 * Optional features are passed after the options argument, for example to
 * refresh ads automatically on Angular Router navigation:
 *
 * @example
 * ```ts
 * import { provideEzoic, withRouterRefresh } from '@ezoic/angular-sdk';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideEzoic({}, withRouterRefresh())],
 * };
 * ```
 *
 * @param options SDK options; see {@link EzoicOptions}.
 * @param features Optional SDK features, for example {@link withRouterRefresh}.
 * @returns Environment providers for `ApplicationConfig.providers`.
 */
export function provideEzoic(
  options: EzoicOptions = {},
  ...features: EzoicFeature[]
): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = [
    { provide: EZOIC_OPTIONS, useValue: options },
    provideAppInitializer(() => {
      inject(EzoicService).initialize();
    }),
  ];
  for (const feature of features) {
    providers.push(...feature.providers);
  }
  return makeEnvironmentProviders(providers);
}
