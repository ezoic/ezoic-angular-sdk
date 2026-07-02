import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Event as RouterEvent, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicService } from './ezoic.service';
import { provideEzoic } from './provide-ezoic';
import { withRouterRefresh } from './with-router-refresh';
import { EzoicWindow } from './ezstandalone.types';

interface RuntimeSpies {
  showAds: jest.Mock;
  destroyPlaceholders: jest.Mock;
  setIsSinglePageApplication: jest.Mock;
  newPage: jest.Mock;
}

function mockRuntime(): RuntimeSpies {
  const spies: RuntimeSpies = {
    showAds: jest.fn(),
    destroyPlaceholders: jest.fn(),
    setIsSinglePageApplication: jest.fn(),
    newPage: jest.fn(),
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

class FakeRouter {
  readonly events = new Subject<RouterEvent>();
  url = '/';
  emit(url: string): void {
    this.events.next(new NavigationEnd(1, url, url));
  }
}

/** A synchronous requestAnimationFrame so refresh assertions are deterministic. */
function useSyncRaf(): jest.SpyInstance {
  const win = window as unknown as {
    requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  };
  if (typeof win.requestAnimationFrame !== 'function') {
    win.requestAnimationFrame = (): number => 0;
  }
  return jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback): number => {
      cb(0);
      return 0;
    });
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

describe('withRouterRefresh', () => {
  beforeEach(reset);
  afterEach(() => {
    reset();
    jest.restoreAllMocks();
  });

  it('marks the page as a single-page application at boot', () => {
    const spies = mockRuntime();
    TestBed.configureTestingModule({
      providers: [
        { provide: EZOIC_OPTIONS, useValue: {} },
        { provide: Router, useValue: new FakeRouter() },
        provideEzoic({}, withRouterRefresh()),
      ],
    });
    TestBed.inject(EzoicService);
    drain();
    expect(spies.setIsSinglePageApplication).toHaveBeenCalledWith(true);
  });

  describe('component mode (no placeholderIds)', () => {
    it('does not drive showAds, destroy or newPage on navigation', () => {
      const spies = mockRuntime();
      useSyncRaf();
      const router = new FakeRouter();
      TestBed.configureTestingModule({
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: Router, useValue: router },
          provideEzoic({}, withRouterRefresh()),
        ],
      });
      TestBed.inject(EzoicService);
      drain();
      router.emit('/a');
      router.emit('/b');
      drain();
      expect(spies.showAds).not.toHaveBeenCalled();
      expect(spies.destroyPlaceholders).not.toHaveBeenCalled();
      expect(spies.newPage).not.toHaveBeenCalled();
    });
  });

  describe('imperative mode (placeholderIds)', () => {
    function setup(): { router: FakeRouter; spies: RuntimeSpies } {
      const spies = mockRuntime();
      useSyncRaf();
      const router = new FakeRouter();
      TestBed.configureTestingModule({
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: Router, useValue: router },
          provideEzoic({}, withRouterRefresh({ placeholderIds: [101, 102] })),
        ],
      });
      TestBed.inject(EzoicService);
      drain();
      return { router, spies };
    }

    it('requests the ids on the first navigation without destroying', () => {
      const { router, spies } = setup();
      router.emit('/a');
      drain();
      expect(spies.showAds).toHaveBeenCalledWith(101, 102);
      expect(spies.destroyPlaceholders).not.toHaveBeenCalled();
    });

    it('destroys then re-requests the ids on later navigations, in order', () => {
      const { router, spies } = setup();
      router.emit('/a');
      drain();
      spies.showAds.mockClear();
      router.emit('/b');
      drain();
      expect(spies.destroyPlaceholders).toHaveBeenCalledWith(101, 102);
      expect(spies.showAds).toHaveBeenCalledWith(101, 102);
      expect(spies.destroyPlaceholders.mock.invocationCallOrder[0]).toBeLessThan(
        spies.showAds.mock.invocationCallOrder[0],
      );
    });

    it('never calls newPage — the runtime auto-detects pushState (coalesce, no double-fire)', () => {
      const { router, spies } = setup();
      router.emit('/a');
      // Simulate the runtime's own SPAMonitor firing newPage for the same nav.
      (window as unknown as EzoicWindow).ezstandalone?.newPage?.();
      router.emit('/b');
      drain();
      // Only the manual simulation above; the SDK itself added no newPage call.
      expect(spies.newPage).toHaveBeenCalledTimes(1);
    });
  });

  it('does nothing on navigation when opted out (no feature)', () => {
    const spies = mockRuntime();
    const router = new FakeRouter();
    TestBed.configureTestingModule({
      providers: [
        { provide: EZOIC_OPTIONS, useValue: {} },
        { provide: Router, useValue: router },
        provideEzoic({}),
      ],
    });
    TestBed.inject(EzoicService);
    drain();
    router.emit('/a');
    drain();
    expect(spies.setIsSinglePageApplication).not.toHaveBeenCalled();
    expect(spies.showAds).not.toHaveBeenCalled();
  });

  it('warns and disables imperative refresh when no Router is available', () => {
    // A real app without provideRouter resolves Router to null (it is not
    // root-provided). The test platform injects an ambient Router, so bind the
    // token to null to represent genuine absence.
    const spies = mockRuntime();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: EZOIC_OPTIONS, useValue: {} },
        { provide: Router, useValue: null },
        provideEzoic({}, withRouterRefresh({ placeholderIds: [101] })),
      ],
    });
    TestBed.inject(EzoicService);
    drain();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(spies.showAds).not.toHaveBeenCalled();
  });

  describe('during server-side rendering', () => {
    it('sets no SPA flag on window and creates no subscription', () => {
      const router = new FakeRouter();
      const spy = jest.spyOn(router.events, 'subscribe');
      TestBed.configureTestingModule({
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: Router, useValue: router },
          provideEzoic({}, withRouterRefresh({ placeholderIds: [101] })),
        ],
      });
      TestBed.inject(EzoicService);
      expect((window as unknown as EzoicWindow).ezstandalone).toBeUndefined();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
