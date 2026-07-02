import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EzoicRewardedService } from './ezoic-rewarded.service';
import { provideEzoic } from './provide-ezoic';
import { withRewardedAds } from './with-rewarded-ads';
import { EZOIC_SDK_SCRIPT_ATTR } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';

const LOADER_URL = 'https://example.com/porpoiseant/ezadloadrewarded.js';

function markers(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(`script[${EZOIC_SDK_SCRIPT_ATTR}]`),
  ).map((s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) ?? '');
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).ezstandalone = undefined;
  (window as unknown as EzoicWindow).ezRewardedAds = undefined;
}

describe('withRewardedAds', () => {
  beforeEach(reset);
  afterEach(reset);

  it('reports the rewarded-ads feature kind', () => {
    expect(withRewardedAds({ loaderUrl: LOADER_URL }).kind).toBe('rewarded-ads');
  });

  it('initializes the rewarded loader at boot in a browser', () => {
    TestBed.configureTestingModule({
      providers: [provideEzoic({}, withRewardedAds({ loaderUrl: LOADER_URL }))],
    });
    // The app initializer runs during module finalization triggered by the first inject.
    TestBed.inject(EzoicRewardedService);
    expect(markers()).toContain('rewarded');
    expect(Array.isArray((window as unknown as EzoicWindow).ezRewardedAds?.cmd)).toBe(true);
  });

  describe('during server-side rendering', () => {
    it('injects no loader and touches no window global', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          provideEzoic({}, withRewardedAds({ loaderUrl: LOADER_URL })),
        ],
      });
      TestBed.inject(EzoicRewardedService);
      expect(markers()).toEqual([]);
      expect((window as unknown as EzoicWindow).ezRewardedAds).toBeUndefined();
    });
  });
});
