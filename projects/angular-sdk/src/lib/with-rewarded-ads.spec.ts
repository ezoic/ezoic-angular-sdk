import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EzoicRewardedService } from './ezoic-rewarded.service';
import { EzoicService } from './ezoic.service';
import { provideEzoic } from './provide-ezoic';
import { withRewardedAds } from './with-rewarded-ads';
import { EZOIC_SDK_SCRIPT_ATTR } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';
import { EzoicRewardedPlacements } from './ezoic-rewarded.types';

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
  afterEach(() => {
    reset();
    jest.restoreAllMocks();
  });

  it('reports the rewarded-ads feature kind', () => {
    expect(withRewardedAds().kind).toBe('rewarded-ads');
    expect(withRewardedAds({ loaderUrl: LOADER_URL }).kind).toBe('rewarded-ads');
  });

  describe('default (runtime-served) mode', () => {
    it('initializes the service and calls initRewardedAds without injecting a loader', () => {
      const initSpy = jest
        .spyOn(EzoicService.prototype, 'initRewardedAds')
        .mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [provideEzoic({}, withRewardedAds())],
      });
      // The app initializer runs during module finalization triggered by the first inject.
      TestBed.inject(EzoicRewardedService);
      expect(initSpy).toHaveBeenCalledWith(undefined);
      expect(markers()).not.toContain('rewarded');
      expect(markers()).not.toContain('rewarded-cmd-stub');
    });

    it('forwards the configured placements to initRewardedAds', () => {
      const placements: EzoicRewardedPlacements = {
        anchor: false,
        interstitial: false,
        video: true,
        sideRails: false,
      };
      const initSpy = jest
        .spyOn(EzoicService.prototype, 'initRewardedAds')
        .mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [provideEzoic({}, withRewardedAds({ placements }))],
      });
      TestBed.inject(EzoicRewardedService);
      expect(initSpy).toHaveBeenCalledWith(placements);
      expect(markers()).not.toContain('rewarded');
    });
  });

  describe('explicit loaderUrl (escape-hatch) mode', () => {
    it('injects the loader at boot and does not call initRewardedAds', () => {
      const initSpy = jest
        .spyOn(EzoicService.prototype, 'initRewardedAds')
        .mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [provideEzoic({}, withRewardedAds({ loaderUrl: LOADER_URL }))],
      });
      TestBed.inject(EzoicRewardedService);
      expect(markers()).toContain('rewarded');
      expect(Array.isArray((window as unknown as EzoicWindow).ezRewardedAds?.cmd)).toBe(true);
      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  describe('during server-side rendering', () => {
    it('injects no loader and touches no window global (default mode)', () => {
      const initSpy = jest
        .spyOn(EzoicService.prototype, 'initRewardedAds')
        .mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          provideEzoic({}, withRewardedAds()),
        ],
      });
      TestBed.inject(EzoicRewardedService);
      expect(markers()).toEqual([]);
      expect((window as unknown as EzoicWindow).ezRewardedAds).toBeUndefined();
      // initRewardedAds is queued but a no-op on the server.
      expect(initSpy).toHaveBeenCalledWith(undefined);
    });

    it('injects no loader and touches no window global (loaderUrl mode)', () => {
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
