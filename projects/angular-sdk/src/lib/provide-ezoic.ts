import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { EZOIC_OPTIONS, EzoicOptions } from './ezoic-config';
import { EzoicService } from './ezoic.service';

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
 * @param options SDK options; see {@link EzoicOptions}.
 * @returns Environment providers for `ApplicationConfig.providers`.
 */
export function provideEzoic(options: EzoicOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: EZOIC_OPTIONS, useValue: options },
    provideAppInitializer(() => {
      inject(EzoicService).initialize();
    }),
  ]);
}
