/*
 * Public API surface of @ezoic/angular-sdk.
 */

export { EZOIC_SDK_VERSION } from './lib/version';
export {
  EZOIC_PLACEHOLDER_ID_PREFIX,
  MIN_PLACEHOLDER_ID,
  MAX_PLACEHOLDER_ID,
  isValidPlaceholderId,
  placeholderElementId,
} from './lib/placeholder';

export { provideEzoic } from './lib/provide-ezoic';
export { EzoicService } from './lib/ezoic.service';
export {
  EZOIC_OPTIONS,
  EZOIC_SA_SCRIPT_URL,
  EZOIC_CMP_SCRIPT_URLS,
  EZOIC_ANALYTICS_SCRIPT_URL,
} from './lib/ezoic-config';
export type { EzoicOptions } from './lib/ezoic-config';
export type { EzoicCommand, Ezstandalone } from './lib/ezstandalone.types';
