import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EzoicAdRegistry } from './ezoic-ad.registry';
import { EzoicRewardedInitScheduler } from './ezoic-rewarded-init.scheduler';
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
  // Remove any Ezoic placeholders / GPT containers a predicate-arm test added.
  document
    .querySelectorAll('[id^="ezoic-pub-ad-placeholder-"], [id^="div-gpt-ad"]')
    .forEach((el) => el.remove());
  // Drop any getEntriesByType stub a predicate-arm test installed (jsdom's
  // performance omits it, so it is only present when a test defines it).
  delete (window.performance as unknown as { getEntriesByType?: unknown }).getEntriesByType;
  (window as unknown as EzoicWindow).ezstandalone = undefined;
  (window as unknown as EzoicWindow).ezRewardedAds = undefined;
}

/**
 * Defines `performance.getEntriesByType('resource')` for the test — jsdom's
 * performance omits it, so `EzoicService.isAdLoadStarted` skips the resource-
 * timing arm by default. Cleaned up by {@link reset}.
 */
function stubResourceTiming(names: string[]): void {
  (
    window.performance as unknown as {
      getEntriesByType: (type: string) => { name: string }[];
    }
  ).getEntriesByType = (type: string): { name: string }[] =>
    type === 'resource' ? names.map((name) => ({ name })) : [];
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
      // enabled=true → the deferred scheduler takes its fast path and dispatches
      // synchronously as the app initializer runs.
      (window as unknown as EzoicWindow).ezstandalone = { cmd: [], enabled: true };
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
      (window as unknown as EzoicWindow).ezstandalone = { cmd: [], enabled: true };
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

  describe('deferred init scheduling (default mode)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    /**
     * Boots the default-mode feature and runs its app initializer (triggered by
     * the first inject), returning the `initRewardedAds` spy. `enabled` is left
     * falsy so the scheduler arms its poll/grace timers rather than fast-pathing.
     */
    function bootDefault(placements?: EzoicRewardedPlacements): jest.SpyInstance {
      const initSpy = jest
        .spyOn(EzoicService.prototype, 'initRewardedAds')
        .mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [provideEzoic({}, withRewardedAds(placements ? { placements } : {}))],
      });
      TestBed.inject(EzoicRewardedService);
      return initSpy;
    }

    function markEnabled(): void {
      (window as unknown as EzoicWindow).ezstandalone = { cmd: [], enabled: true };
    }

    it('does not dispatch initRewardedAds at boot when enabled is falsy', () => {
      const initSpy = bootDefault();
      expect(initSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(250);
      expect(initSpy).not.toHaveBeenCalled();
    });

    it('dispatches once when enabled flips true before the grace deadline, then stops polling', () => {
      const placements: EzoicRewardedPlacements = { video: true };
      const initSpy = bootDefault(placements);
      expect(initSpy).not.toHaveBeenCalled();

      markEnabled();
      jest.advanceTimersByTime(250);
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith(placements);

      // Poll interval and grace timer are cleared: no further dispatches.
      jest.advanceTimersByTime(10_000);
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('fires at the grace deadline when no display placements are mounted (rewarded-only page)', () => {
      const placements: EzoicRewardedPlacements = { anchor: true };
      const initSpy = bootDefault(placements);
      expect(initSpy).not.toHaveBeenCalled();

      // No <ezoic-ad> registered → hasMountedPlacements() is false at the deadline.
      jest.advanceTimersByTime(4000);
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith(placements);
    });

    it('does NOT fire at the grace deadline when placements are mounted, then fires when enabled flips', () => {
      const placements: EzoicRewardedPlacements = { video: true };
      const initSpy = bootDefault(placements);
      // Simulate a live <ezoic-ad>: register a mounted placeholder in the shared
      // registry the scheduler reads at its deadline.
      TestBed.inject(EzoicAdRegistry).register({ id: 101 });

      jest.advanceTimersByTime(4000);
      expect(initSpy).not.toHaveBeenCalled();

      // Polling continues past the grace window; init fires when enabled flips.
      markEnabled();
      jest.advanceTimersByTime(250);
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith(placements);
    });

    it('schedules once across repeated schedule() calls; the first placements win', () => {
      const initSpy = jest
        .spyOn(EzoicService.prototype, 'initRewardedAds')
        .mockImplementation(() => undefined);
      TestBed.configureTestingModule({ providers: [provideEzoic({})] });
      const scheduler = TestBed.inject(EzoicRewardedInitScheduler);
      scheduler.schedule({ video: true });
      // A second consumer scheduling different placements must not re-arm or win.
      scheduler.schedule({ anchor: true });

      markEnabled();
      jest.advanceTimersByTime(250);
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith({ video: true });
    });
  });

  describe('initial-ad-load predicate arms (fast path, default mode)', () => {
    // Real timers: the fast path dispatches synchronously at boot, so no polling
    // is involved and no timers are armed.
    function bootDefault(): jest.SpyInstance {
      const initSpy = jest
        .spyOn(EzoicService.prototype, 'initRewardedAds')
        .mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [provideEzoic({}, withRewardedAds())],
      });
      TestBed.inject(EzoicRewardedService);
      return initSpy;
    }

    it('dispatches when a /sa.go entry is in resource timing (public enabled stays false)', () => {
      // The real-page bug: public enabled never flips. The /sa.go resource entry
      // is the reliable signal that the initial ad request was issued.
      stubResourceTiming(['https://g.ezoic.net/sa.go?t=1']);
      const initSpy = bootDefault();
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith(undefined);
    });

    it('dispatches when a GPT container is rendered inside an Ezoic placeholder (public enabled stays false)', () => {
      // Ezoic renders its GPT container inside the placeholder once the ad
      // response is rendering.
      const placeholder = document.createElement('div');
      placeholder.id = 'ezoic-pub-ad-placeholder-910';
      const gpt = document.createElement('div');
      gpt.id = 'div-gpt-ad-ezoic_com-medrectangle-4-0';
      placeholder.appendChild(gpt);
      document.body.appendChild(placeholder);
      const initSpy = bootDefault();
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('does NOT dispatch for a plain publisher GPT container outside any Ezoic placeholder', () => {
      stubResourceTiming([]);
      // Plain publisher-hardcoded GPT present before the Ezoic load — must not be
      // mistaken for the Ezoic initial load starting.
      const gpt = document.createElement('div');
      gpt.id = 'div-gpt-ad-publisher-slot-1';
      document.body.appendChild(gpt);
      const initSpy = bootDefault();
      expect(initSpy).not.toHaveBeenCalled();
    });

    it('does not dispatch when no initial-ad-load signal is present (all arms false)', () => {
      // getEntriesByType present but returns no /sa.go entry; no GPT container.
      stubResourceTiming([]);
      const initSpy = bootDefault();
      // enabled unset, no /sa.go entry, no div-gpt-ad → scheduler stays armed.
      expect(initSpy).not.toHaveBeenCalled();
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
      // The deferred scheduler is SSR-safe: it never arms timers or dispatches on
      // the server, so initRewardedAds is not called at all.
      expect(initSpy).not.toHaveBeenCalled();
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
