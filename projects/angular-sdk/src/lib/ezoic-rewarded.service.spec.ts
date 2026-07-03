import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EzoicRewardedService } from './ezoic-rewarded.service';
import { EZOIC_SDK_SCRIPT_ATTR } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';
import { EzoicRewardedRequestOutcome, EzoicRewardedShowOutcome } from './ezoic-rewarded.types';

const LOADER_URL = 'https://example.com/porpoiseant/ezadloadrewarded.js';

interface RewardedSpies {
  request: jest.Mock;
  show: jest.Mock;
  requestAndShow: jest.Mock;
  requestWithOverlay: jest.Mock;
  contentLocker: jest.Mock;
}

function installRewardedRuntime(): RewardedSpies {
  const spies: RewardedSpies = {
    request: jest.fn(),
    show: jest.fn(),
    requestAndShow: jest.fn(),
    requestWithOverlay: jest.fn(),
    contentLocker: jest.fn(),
  };
  (window as unknown as EzoicWindow).ezRewardedAds = { cmd: [], ready: true, ...spies };
  return spies;
}

/** Runs and clears everything currently queued on `ezRewardedAds.cmd`. */
function drainRewarded(): void {
  const api = (window as unknown as EzoicWindow).ezRewardedAds;
  if (!api) {
    return;
  }
  const queued = [...api.cmd];
  api.cmd.length = 0;
  queued.forEach((fn) => fn());
}

function markers(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(`script[${EZOIC_SDK_SCRIPT_ATTR}]`),
  ).map((s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) ?? '');
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).ezRewardedAds = undefined;
}

describe('EzoicRewardedService', () => {
  beforeEach(reset);
  afterEach(() => {
    reset();
    jest.restoreAllMocks();
  });

  describe('in a browser', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({});
    });

    it('reports the browser platform', () => {
      expect(TestBed.inject(EzoicRewardedService).isBrowser).toBe(true);
    });

    it('warns and resolves a non-granting fallback when used before initialize', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const service = TestBed.inject(EzoicRewardedService);
      await expect(service.request()).resolves.toEqual({
        status: false,
        msg: 'Rewarded ads are not available.',
      });
      expect(warn).toHaveBeenCalled();
      expect((window as unknown as EzoicWindow).ezRewardedAds).toBeUndefined();
    });

    it('injects the loader, the rewarded stub and a cmd array on initialize', () => {
      const service = TestBed.inject(EzoicRewardedService);
      service.initialize(LOADER_URL);
      expect(markers()).toContain('rewarded');
      expect(markers()).toContain('rewarded-cmd-stub');
      expect(Array.isArray((window as unknown as EzoicWindow).ezRewardedAds?.cmd)).toBe(true);
    });

    it('does not double-inject on a second initialize', () => {
      const service = TestBed.inject(EzoicRewardedService);
      service.initialize(LOADER_URL);
      service.initialize(LOADER_URL);
      expect(markers().filter((m) => m === 'rewarded')).toHaveLength(1);
      expect(markers().filter((m) => m === 'rewarded-cmd-stub')).toHaveLength(1);
    });

    it('warns and stays uninitialized when the loaderUrl is blank', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const service = TestBed.inject(EzoicRewardedService);
      service.initialize('   ');
      expect(warn).toHaveBeenCalled();
      expect(markers()).not.toContain('rewarded');
    });

    describe('runtime methods', () => {
      function setup(): { service: EzoicRewardedService; spies: RewardedSpies } {
        const service = TestBed.inject(EzoicRewardedService);
        service.initialize(LOADER_URL);
        const spies = installRewardedRuntime();
        return { service, spies };
      }

      it('request forwards the config and resolves the callback payload', async () => {
        const { service, spies } = setup();
        const pending = service.request({ minCPM: 5 });
        drainRewarded();
        expect(spies.request).toHaveBeenCalledWith(expect.any(Function), { minCPM: 5 });
        const outcome: EzoicRewardedRequestOutcome = { status: true, msg: 'ready' };
        spies.request.mock.calls[0][0](outcome);
        await expect(pending).resolves.toEqual(outcome);
      });

      it('show forwards the config and resolves the callback payload', async () => {
        const { service, spies } = setup();
        const pending = service.show({ rewardName: 'coins' });
        drainRewarded();
        expect(spies.show).toHaveBeenCalledWith(expect.any(Function), { rewardName: 'coins' });
        const outcome: EzoicRewardedShowOutcome = { status: true, reward: true, msg: 'done' };
        spies.show.mock.calls[0][0](outcome);
        await expect(pending).resolves.toEqual(outcome);
      });

      it('requestAndShow forwards the config and resolves the callback payload', async () => {
        const { service, spies } = setup();
        const pending = service.requestAndShow({ rewardName: 'coins' });
        drainRewarded();
        expect(spies.requestAndShow).toHaveBeenCalledWith(expect.any(Function), {
          rewardName: 'coins',
          alwaysCallback: true,
        });
        const outcome: EzoicRewardedShowOutcome = { status: true, reward: true, msg: 'done' };
        spies.requestAndShow.mock.calls[0][0](outcome);
        await expect(pending).resolves.toEqual(outcome);
      });

      it('requestAndShow forces alwaysCallback even when the caller does not set it', async () => {
        const { service, spies } = setup();
        const pending = service.requestAndShow({ rewardName: 'coins' });
        drainRewarded();
        expect(spies.requestAndShow).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({ alwaysCallback: true }),
        );
        const decline: EzoicRewardedShowOutcome = {
          status: true,
          reward: false,
          msg: 'ad closed before reward granted',
        };
        spies.requestAndShow.mock.calls[0][0](decline);
        await expect(pending).resolves.toEqual(decline);
      });

      it('requestWithOverlay passes callback, text and config in order', async () => {
        const { service, spies } = setup();
        const text = { header: 'Watch an ad', accept: 'OK', cancel: 'No' };
        const config = { rewardName: 'coins', lockScroll: true };
        const pending = service.requestWithOverlay(text, config);
        drainRewarded();
        expect(spies.requestWithOverlay).toHaveBeenCalledWith(expect.any(Function), text, {
          ...config,
          alwaysCallback: true,
        });
        const outcome: EzoicRewardedShowOutcome = { status: true, reward: true, msg: 'done' };
        spies.requestWithOverlay.mock.calls[0][0](outcome);
        await expect(pending).resolves.toEqual(outcome);
      });

      it('requestWithOverlay forces alwaysCallback even when the caller does not set it', async () => {
        const { service, spies } = setup();
        const text = { header: 'Watch an ad' };
        const pending = service.requestWithOverlay(text, { rewardName: 'coins' });
        drainRewarded();
        expect(spies.requestWithOverlay).toHaveBeenCalledWith(
          expect.any(Function),
          text,
          expect.objectContaining({ alwaysCallback: true }),
        );
        const noFill: EzoicRewardedShowOutcome = {
          status: false,
          reward: false,
          msg: 'failed to load ad',
        };
        spies.requestWithOverlay.mock.calls[0][0](noFill);
        await expect(pending).resolves.toEqual(noFill);
      });

      it('contentLocker forwards the action and a merged readyCallback', async () => {
        const { service, spies } = setup();
        const pending = service.contentLocker('https://example.com/unlock', { rewardName: 'x' });
        drainRewarded();
        expect(spies.contentLocker).toHaveBeenCalledWith(
          'https://example.com/unlock',
          expect.objectContaining({ readyCallback: expect.any(Function) }),
        );
        const outcome: EzoicRewardedRequestOutcome = { status: true, msg: 'ready' };
        spies.contentLocker.mock.calls[0][1].readyCallback(outcome);
        await expect(pending).resolves.toEqual(outcome);
      });

      it('contentLocker invokes a caller-supplied readyCallback before resolving', async () => {
        const { service, spies } = setup();
        const callerReady = jest.fn();
        const pending = service.contentLocker(() => undefined, { readyCallback: callerReady });
        drainRewarded();
        const outcome: EzoicRewardedRequestOutcome = { status: true, msg: 'ready' };
        spies.contentLocker.mock.calls[0][1].readyCallback(outcome);
        await expect(pending).resolves.toEqual(outcome);
        expect(callerReady).toHaveBeenCalledWith(outcome);
      });

      it('contentLocker still resolves when a caller readyCallback throws', async () => {
        const { service, spies } = setup();
        const boom = jest.fn(() => {
          throw new Error('boom');
        });
        const pending = service.contentLocker(() => undefined, { readyCallback: boom });
        drainRewarded();
        const outcome: EzoicRewardedRequestOutcome = { status: true, msg: 'ready' };
        // The runtime invoking the merged callback re-surfaces the caller throw,
        // but the Promise must still resolve rather than hang.
        expect(() => spies.contentLocker.mock.calls[0][1].readyCallback(outcome)).toThrow('boom');
        await expect(pending).resolves.toEqual(outcome);
        expect(boom).toHaveBeenCalledWith(outcome);
      });

      it('resolves the fallback when the runtime is gone once the command runs', async () => {
        const { service } = setup();
        const pending = service.request();
        const queued = [...((window as unknown as EzoicWindow).ezRewardedAds?.cmd ?? [])];
        (window as unknown as EzoicWindow).ezRewardedAds = undefined;
        queued.forEach((fn) => fn());
        await expect(pending).resolves.toEqual({
          status: false,
          msg: 'Rewarded ads are not available.',
        });
      });

      it('resolves the fallback when the runtime method is missing', async () => {
        const service = TestBed.inject(EzoicRewardedService);
        service.initialize(LOADER_URL);
        (window as unknown as EzoicWindow).ezRewardedAds = { cmd: [], ready: true };
        const pending = service.request();
        drainRewarded();
        await expect(pending).resolves.toEqual({
          status: false,
          msg: 'Rewarded ads are not available.',
        });
      });

      it('resolves the fallback when the callback delivers nullish data', async () => {
        const { service, spies } = setup();
        const pending = service.show();
        drainRewarded();
        spies.show.mock.calls[0][0](undefined);
        await expect(pending).resolves.toEqual({
          status: false,
          reward: false,
          msg: 'Rewarded ads are not available.',
        });
      });
    });

    describe('lifecycle events', () => {
      it('maps the runtime window events to the status signal', () => {
        const service = TestBed.inject(EzoicRewardedService);
        service.initialize(LOADER_URL);
        expect(service.status()).toBe('idle');
        window.dispatchEvent(new Event('ezRewardedInitiated'));
        expect(service.status()).toBe('initiated');
        window.dispatchEvent(new Event('ezRewardedDisplayed'));
        expect(service.status()).toBe('displayed');
        window.dispatchEvent(new Event('ezRewardedClosed'));
        expect(service.status()).toBe('closed');
      });

      it('removes its window listeners on destroy', () => {
        const service = TestBed.inject(EzoicRewardedService);
        service.initialize(LOADER_URL);
        const removeSpy = jest.spyOn(window, 'removeEventListener');
        TestBed.resetTestingModule();
        expect(removeSpy).toHaveBeenCalledWith('ezRewardedInitiated', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith('ezRewardedDisplayed', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith('ezRewardedClosed', expect.any(Function));
      });
    });
  });

  describe('during server-side rendering', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    it('does not report the browser platform', () => {
      expect(TestBed.inject(EzoicRewardedService).isBrowser).toBe(false);
    });

    it('injects nothing and touches no window global on initialize', () => {
      const service = TestBed.inject(EzoicRewardedService);
      service.initialize(LOADER_URL);
      expect(markers()).toEqual([]);
      expect((window as unknown as EzoicWindow).ezRewardedAds).toBeUndefined();
      expect(service.status()).toBe('idle');
    });

    it('resolves every method to a non-granting fallback without a window global', async () => {
      const service = TestBed.inject(EzoicRewardedService);
      await expect(service.request()).resolves.toEqual({
        status: false,
        msg: 'Rewarded ads are not available.',
      });
      await expect(service.show()).resolves.toEqual({
        status: false,
        reward: false,
        msg: 'Rewarded ads are not available.',
      });
      await expect(service.requestAndShow()).resolves.toEqual({
        status: false,
        reward: false,
        msg: 'Rewarded ads are not available.',
      });
      await expect(service.requestWithOverlay()).resolves.toEqual({
        status: false,
        reward: false,
        msg: 'Rewarded ads are not available.',
      });
      await expect(service.contentLocker('https://example.com/unlock')).resolves.toEqual({
        status: false,
        msg: 'Rewarded ads are not available.',
      });
      expect((window as unknown as EzoicWindow).ezRewardedAds).toBeUndefined();
    });
  });
});
