import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicAdRegistry } from './ezoic-ad.registry';
import { EzoicWindow } from './ezstandalone.types';

interface Spies {
  showAds: jest.Mock;
  destroyPlaceholders: jest.Mock;
}

function mockRuntime(): Spies {
  const showAds = jest.fn();
  const destroyPlaceholders = jest.fn();
  (window as unknown as EzoicWindow).ezstandalone = { cmd: [], showAds, destroyPlaceholders };
  return { showAds, destroyPlaceholders };
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

/** Resolves after the registry's microtask flush has run (queued FIFO before this). */
function tick(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

function reset(): void {
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

describe('EzoicAdRegistry', () => {
  afterEach(reset);

  describe('in a browser', () => {
    let registry: EzoicAdRegistry;
    let spies: Spies;

    beforeEach(() => {
      spies = mockRuntime();
      TestBed.configureTestingModule({ providers: [{ provide: EZOIC_OPTIONS, useValue: {} }] });
      registry = TestBed.inject(EzoicAdRegistry);
    });

    it('batches all same-tick registrations into one showAds call', async () => {
      registry.register({ id: 101 });
      registry.register({ id: 102 });
      registry.register({ id: 103 });
      await tick();
      drain();
      expect(spies.showAds).toHaveBeenCalledTimes(1);
      expect(spies.showAds).toHaveBeenCalledWith(101, 102, 103);
    });

    it('passes the object form when required or sizes are set, and a bare id otherwise', async () => {
      registry.register({ id: 101 });
      registry.register({ id: 102, required: true, sizes: ['728x90'] });
      await tick();
      drain();
      expect(spies.showAds).toHaveBeenCalledWith(101, {
        id: 102,
        required: true,
        sizes: ['728x90'],
      });
    });

    it('warns about and ignores a duplicate mounted id', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      registry.register({ id: 200 });
      registry.register({ id: 200 });
      await tick();
      drain();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(spies.showAds).toHaveBeenCalledTimes(1);
      expect(spies.showAds).toHaveBeenCalledWith(200);
      warn.mockRestore();
    });

    it('destroys a placeholder when its last mount unregisters', async () => {
      registry.register({ id: 101 });
      await tick();
      drain();
      registry.unregister(101);
      drain();
      expect(spies.destroyPlaceholders).toHaveBeenCalledTimes(1);
      expect(spies.destroyPlaceholders).toHaveBeenCalledWith(101);
    });

    it('reference-counts duplicate mounts so teardown happens once, on the last unmount', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      registry.register({ id: 200 });
      registry.register({ id: 200 });
      await tick();
      drain();
      registry.unregister(200);
      drain();
      expect(spies.destroyPlaceholders).not.toHaveBeenCalled();
      registry.unregister(200);
      drain();
      expect(spies.destroyPlaceholders).toHaveBeenCalledTimes(1);
      expect(spies.destroyPlaceholders).toHaveBeenCalledWith(200);
    });

    it('never shows or destroys a placeholder unmounted before its batch flushes', async () => {
      registry.register({ id: 101 });
      registry.unregister(101);
      await tick();
      drain();
      expect(spies.showAds).not.toHaveBeenCalled();
      expect(spies.destroyPlaceholders).not.toHaveBeenCalled();
    });
  });

  describe('during server-side rendering', () => {
    it('does not queue any work', async () => {
      const spies = mockRuntime();
      TestBed.configureTestingModule({
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const registry = TestBed.inject(EzoicAdRegistry);
      registry.register({ id: 101 });
      await tick();
      drain();
      registry.unregister(101);
      drain();
      expect(spies.showAds).not.toHaveBeenCalled();
      expect(spies.destroyPlaceholders).not.toHaveBeenCalled();
    });
  });
});
