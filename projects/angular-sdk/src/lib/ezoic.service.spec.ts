import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicService } from './ezoic.service';
import { EZOIC_SDK_SCRIPT_ATTR } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';

function sdkScriptCount(): number {
  return document.querySelectorAll(`script[${EZOIC_SDK_SCRIPT_ATTR}]`).length;
}

interface RuntimeSpies {
  showAds: jest.Mock;
  displayMore: jest.Mock;
  destroyPlaceholders: jest.Mock;
  destroyAll: jest.Mock;
  refreshAds: jest.Mock;
  isEzoicUser: jest.Mock;
  setIsSinglePageApplication: jest.Mock;
  setAutoRefresh: jest.Mock;
  newPage: jest.Mock;
  config: jest.Mock;
  enableConsent: jest.Mock;
  setDisablePersonalizedStatistics: jest.Mock;
  setDisablePersonalizedAds: jest.Mock;
  setEzoicAnchorAd: jest.Mock;
  hasAnchorAdBeenClosed: jest.Mock;
  setInterstitialAllowed: jest.Mock;
  isInterstitialAllowed: jest.Mock;
  setOutstreamAllowed: jest.Mock;
  isOutstreamAllowed: jest.Mock;
}

function mockRuntime(): RuntimeSpies {
  const spies: RuntimeSpies = {
    showAds: jest.fn(),
    displayMore: jest.fn(),
    destroyPlaceholders: jest.fn(),
    destroyAll: jest.fn(),
    refreshAds: jest.fn(),
    isEzoicUser: jest.fn(),
    setIsSinglePageApplication: jest.fn(),
    setAutoRefresh: jest.fn(),
    newPage: jest.fn(),
    config: jest.fn(),
    enableConsent: jest.fn(),
    setDisablePersonalizedStatistics: jest.fn(),
    setDisablePersonalizedAds: jest.fn(),
    setEzoicAnchorAd: jest.fn(),
    hasAnchorAdBeenClosed: jest.fn(),
    setInterstitialAllowed: jest.fn(),
    isInterstitialAllowed: jest.fn(),
    setOutstreamAllowed: jest.fn(),
    isOutstreamAllowed: jest.fn(),
  };
  (window as unknown as EzoicWindow).ezstandalone = { cmd: [], ...spies };
  return spies;
}

/** Runs and clears everything currently queued on `ezstandalone.cmd`. */
function drain(): void {
  const ez = (window as unknown as EzoicWindow).ezstandalone;
  if (!ez) {
    return;
  }
  const queued = [...ez.cmd];
  ez.cmd.length = 0;
  queued.forEach((fn) => fn());
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

describe('EzoicService', () => {
  beforeEach(reset);
  afterEach(reset);

  describe('in a browser', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: EZOIC_OPTIONS, useValue: {} }],
      });
    });

    it('reports the browser platform', () => {
      expect(TestBed.inject(EzoicService).isBrowser).toBe(true);
    });

    it('injects header scripts and becomes ready on initialize', () => {
      const service = TestBed.inject(EzoicService);
      expect(service.ready()).toBe(false);
      service.initialize();
      expect(service.ready()).toBe(true);
      expect(sdkScriptCount()).toBeGreaterThan(0);
    });

    it('does not inject twice on repeated initialize', () => {
      const service = TestBed.inject(EzoicService);
      service.initialize();
      const count = sdkScriptCount();
      service.initialize();
      expect(sdkScriptCount()).toBe(count);
    });

    it('queues functions on ezstandalone.cmd via push', () => {
      const service = TestBed.inject(EzoicService);
      service.initialize();
      const command = (): void => undefined;
      service.push(command);
      expect((window as unknown as EzoicWindow).ezstandalone?.cmd).toContain(command);
    });

    it('push initializes the queue even without initialize', () => {
      const service = TestBed.inject(EzoicService);
      const command = (): void => undefined;
      service.push(command);
      expect((window as unknown as EzoicWindow).ezstandalone?.cmd).toContain(command);
    });

    describe('display passthroughs', () => {
      it('showAds forwards ids and object placeholders to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.showAds(101, { id: 102, required: true, sizes: ['728x90'] });
        drain();
        expect(spies.showAds).toHaveBeenCalledWith(101, {
          id: 102,
          required: true,
          sizes: ['728x90'],
        });
      });

      it('displayMore forwards ids to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.displayMore(103, 104);
        drain();
        expect(spies.displayMore).toHaveBeenCalledWith(103, 104);
      });

      it('destroyPlaceholders forwards ids to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.destroyPlaceholders(101, 102);
        drain();
        expect(spies.destroyPlaceholders).toHaveBeenCalledWith(101, 102);
      });

      it('destroyAll forwards to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.destroyAll();
        drain();
        expect(spies.destroyAll).toHaveBeenCalledTimes(1);
      });

      it('refreshAds forwards ids to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.refreshAds(101);
        drain();
        expect(spies.refreshAds).toHaveBeenCalledWith(101);
      });

      it('isEzoicUser forwards the percentage and callback to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        const callback = (): void => undefined;
        service.isEzoicUser(callback, 50);
        drain();
        expect(spies.isEzoicUser).toHaveBeenCalledWith(50, callback);
      });
    });

    describe('SPA passthroughs', () => {
      it('setIsSinglePageApplication forwards the flag to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.setIsSinglePageApplication(true);
        drain();
        expect(spies.setIsSinglePageApplication).toHaveBeenCalledWith(true);
      });

      it('setAutoRefresh forwards the flag to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.setAutoRefresh(true);
        drain();
        expect(spies.setAutoRefresh).toHaveBeenCalledWith(true);
      });

      it('newPage forwards to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.newPage();
        drain();
        expect(spies.newPage).toHaveBeenCalledTimes(1);
      });
    });

    describe('consent + config passthroughs', () => {
      it('enableConsent forwards to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.enableConsent();
        drain();
        expect(spies.enableConsent).toHaveBeenCalledTimes(1);
      });

      it('setDisablePersonalizedStatistics forwards the flag', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.setDisablePersonalizedStatistics(true);
        drain();
        expect(spies.setDisablePersonalizedStatistics).toHaveBeenCalledWith(true);
      });

      it('setDisablePersonalizedAds forwards the flag', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.setDisablePersonalizedAds(true);
        drain();
        expect(spies.setDisablePersonalizedAds).toHaveBeenCalledWith(true);
      });

      it('setEzoicAnchorAd forwards the flag', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.setEzoicAnchorAd(true);
        drain();
        expect(spies.setEzoicAnchorAd).toHaveBeenCalledWith(true);
      });

      it('setInterstitialAllowed forwards the flag and options', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.setInterstitialAllowed(false, { foo: 1 });
        drain();
        expect(spies.setInterstitialAllowed).toHaveBeenCalledWith(false, { foo: 1 });
      });

      it('config forwards the typed options object to the runtime', () => {
        const spies = mockRuntime();
        const service = TestBed.inject(EzoicService);
        service.config({ disableVideo: true, anchorAdPosition: 'top' });
        drain();
        expect(spies.config).toHaveBeenCalledWith({ disableVideo: true, anchorAdPosition: 'top' });
      });

      it('hasAnchorAdBeenClosed resolves the runtime value', async () => {
        const spies = mockRuntime();
        spies.hasAnchorAdBeenClosed.mockReturnValue(true);
        const service = TestBed.inject(EzoicService);
        const pending = service.hasAnchorAdBeenClosed();
        drain();
        await expect(pending).resolves.toBe(true);
      });

      it('isInterstitialAllowed resolves the runtime value', async () => {
        const spies = mockRuntime();
        spies.isInterstitialAllowed.mockReturnValue(true);
        const service = TestBed.inject(EzoicService);
        const pending = service.isInterstitialAllowed();
        drain();
        await expect(pending).resolves.toBe(true);
      });

      it('isOutstreamAllowed resolves false when the runtime read returns undefined', async () => {
        const spies = mockRuntime();
        spies.isOutstreamAllowed.mockReturnValue(undefined);
        const service = TestBed.inject(EzoicService);
        const pending = service.isOutstreamAllowed();
        drain();
        await expect(pending).resolves.toBe(false);
      });

      it('setOutstreamAllowed forwards args and resolves the runtime promise', async () => {
        const spies = mockRuntime();
        spies.setOutstreamAllowed.mockResolvedValue(true);
        const service = TestBed.inject(EzoicService);
        const pending = service.setOutstreamAllowed(true, { bar: 2 });
        drain();
        await expect(pending).resolves.toBe(true);
        expect(spies.setOutstreamAllowed).toHaveBeenCalledWith(true, { bar: 2 });
      });

      it('resolves getters to their fallback when the runtime never exposes the method', async () => {
        (window as unknown as EzoicWindow).ezstandalone = { cmd: [] };
        const service = TestBed.inject(EzoicService);
        const interstitial = service.isInterstitialAllowed();
        const anchorClosed = service.hasAnchorAdBeenClosed();
        drain();
        await expect(interstitial).resolves.toBe(false);
        await expect(anchorClosed).resolves.toBe(false);
      });
    });

    describe('resolveLocationId', () => {
      function setRuntime(getGeneratedIdAsync?: jest.Mock): void {
        (window as unknown as EzoicWindow).ezstandalone = getGeneratedIdAsync
          ? { cmd: [], GetGeneratedIdAsync: getGeneratedIdAsync }
          : { cmd: [] };
      }

      it('uses the static map when the runtime has not loaded', async () => {
        setRuntime();
        const service = TestBed.inject(EzoicService);
        await expect(service.resolveLocationId('under_first_paragraph')).resolves.toBe(909);
      });

      it('resolves aliases via the static map', async () => {
        setRuntime();
        const service = TestBed.inject(EzoicService);
        await expect(service.resolveLocationId('incontent_0')).resolves.toBe(910);
      });

      it('returns null for an unknown location with no runtime', async () => {
        setRuntime();
        const service = TestBed.inject(EzoicService);
        await expect(service.resolveLocationId('not_a_place')).resolves.toBeNull();
      });

      it('delegates to the runtime helper and coerces a numeric string result', async () => {
        const getId = jest.fn().mockResolvedValue('915');
        setRuntime(getId);
        const service = TestBed.inject(EzoicService);
        await expect(service.resolveLocationId('incontent_5')).resolves.toBe(915);
        expect(getId).toHaveBeenCalledWith('incontent_5');
      });

      it('accepts a runtime-allocated id above 999 (god mode)', async () => {
        const getId = jest.fn().mockResolvedValue(1000);
        setRuntime(getId);
        const service = TestBed.inject(EzoicService);
        await expect(service.resolveLocationId('mid_content')).resolves.toBe(1000);
      });

      it('falls back to the static map when the runtime helper rejects', async () => {
        const getId = jest.fn().mockRejectedValue(new Error('boom'));
        setRuntime(getId);
        const service = TestBed.inject(EzoicService);
        await expect(service.resolveLocationId('under_first_paragraph')).resolves.toBe(909);
      });

      it('falls back to the static map when the runtime returns a non-numeric result', async () => {
        const getId = jest.fn().mockResolvedValue('not-a-number');
        setRuntime(getId);
        const service = TestBed.inject(EzoicService);
        await expect(service.resolveLocationId('top_of_page')).resolves.toBe(900);
      });
    });
  });

  describe('during server-side rendering', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
    });

    it('does not report the browser platform', () => {
      expect(TestBed.inject(EzoicService).isBrowser).toBe(false);
    });

    it('injects nothing and stays not-ready on initialize', () => {
      const service = TestBed.inject(EzoicService);
      service.initialize();
      expect(service.ready()).toBe(false);
      expect(sdkScriptCount()).toBe(0);
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
    });

    it('treats push as a no-op that touches no window global', () => {
      const service = TestBed.inject(EzoicService);
      service.push((): void => undefined);
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
    });

    it('treats display passthroughs as no-ops that touch no window global', () => {
      const service = TestBed.inject(EzoicService);
      service.showAds(101);
      service.destroyPlaceholders(101);
      service.destroyAll();
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
    });

    it('treats SPA passthroughs as no-ops that touch no window global', () => {
      const service = TestBed.inject(EzoicService);
      service.setIsSinglePageApplication(true);
      service.setAutoRefresh(true);
      service.newPage();
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
    });

    it('resolves a location to null without touching any window global', async () => {
      const service = TestBed.inject(EzoicService);
      await expect(service.resolveLocationId('under_first_paragraph')).resolves.toBeNull();
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
    });

    it('treats consent + config setters as no-ops that touch no window global', () => {
      const service = TestBed.inject(EzoicService);
      service.enableConsent();
      service.setDisablePersonalizedStatistics(true);
      service.setDisablePersonalizedAds(true);
      service.setEzoicAnchorAd(true);
      service.setInterstitialAllowed(true);
      service.config({ disableVideo: true });
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
    });

    it('resolves toggle getters to their defaults without a window global', async () => {
      const service = TestBed.inject(EzoicService);
      await expect(service.hasAnchorAdBeenClosed()).resolves.toBe(false);
      await expect(service.isInterstitialAllowed()).resolves.toBe(false);
      await expect(service.isOutstreamAllowed()).resolves.toBe(false);
      await expect(service.setOutstreamAllowed(true)).resolves.toBe(false);
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
    });
  });
});
