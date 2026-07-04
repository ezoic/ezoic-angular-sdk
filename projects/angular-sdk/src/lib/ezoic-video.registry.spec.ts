import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicVideoRegistry } from './ezoic-video.registry';
import { EzoicWindow } from './ezstandalone.types';

interface Spies {
  displayMoreVideo: jest.Mock;
  destroyVideoPlaceholders: jest.Mock;
}

function mockRuntime(): Spies {
  const displayMoreVideo = jest.fn();
  const destroyVideoPlaceholders = jest.fn();
  (window as unknown as EzoicWindow).ezstandalone = {
    cmd: [],
    displayMoreVideo,
    destroyVideoPlaceholders,
  };
  return { displayMoreVideo, destroyVideoPlaceholders };
}

/** Runs and clears everything currently queued on `ezstandalone.cmd`. */
function drain(): void {
  const ez = (window as unknown as EzoicWindow).ezstandalone;
  if (!ez || !Array.isArray(ez.cmd)) {
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

describe('EzoicVideoRegistry', () => {
  afterEach(reset);

  describe('in a browser', () => {
    let registry: EzoicVideoRegistry;
    let spies: Spies;

    beforeEach(() => {
      spies = mockRuntime();
      TestBed.configureTestingModule({ providers: [{ provide: EZOIC_OPTIONS, useValue: {} }] });
      registry = TestBed.inject(EzoicVideoRegistry);
    });

    it('batches all same-tick registrations into one displayMoreVideo call', async () => {
      registry.register('video-1');
      registry.register('video-2');
      registry.register('video-3');
      await tick();
      drain();
      expect(spies.displayMoreVideo).toHaveBeenCalledTimes(1);
      expect(spies.displayMoreVideo).toHaveBeenCalledWith('video-1', 'video-2', 'video-3');
    });

    it('warns about and ignores a duplicate mounted div id', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      registry.register('video-1');
      registry.register('video-1');
      await tick();
      drain();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(spies.displayMoreVideo).toHaveBeenCalledTimes(1);
      expect(spies.displayMoreVideo).toHaveBeenCalledWith('video-1');
      warn.mockRestore();
    });

    it('destroys a video placeholder when its last mount unregisters', async () => {
      registry.register('video-1');
      await tick();
      drain();
      registry.unregister('video-1');
      drain();
      expect(spies.destroyVideoPlaceholders).toHaveBeenCalledTimes(1);
      expect(spies.destroyVideoPlaceholders).toHaveBeenCalledWith('video-1');
    });

    it('reference-counts duplicate mounts so teardown happens once, on the last unmount', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      registry.register('video-1');
      registry.register('video-1');
      await tick();
      drain();
      registry.unregister('video-1');
      drain();
      expect(spies.destroyVideoPlaceholders).not.toHaveBeenCalled();
      registry.unregister('video-1');
      drain();
      expect(spies.destroyVideoPlaceholders).toHaveBeenCalledTimes(1);
      expect(spies.destroyVideoPlaceholders).toHaveBeenCalledWith('video-1');
    });

    it('never loads or destroys a video unmounted before its batch flushes', async () => {
      registry.register('video-1');
      registry.unregister('video-1');
      await tick();
      drain();
      expect(spies.displayMoreVideo).not.toHaveBeenCalled();
      expect(spies.destroyVideoPlaceholders).not.toHaveBeenCalled();
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
      const registry = TestBed.inject(EzoicVideoRegistry);
      registry.register('video-1');
      await tick();
      drain();
      registry.unregister('video-1');
      drain();
      expect(spies.displayMoreVideo).not.toHaveBeenCalled();
      expect(spies.destroyVideoPlaceholders).not.toHaveBeenCalled();
    });
  });
});
