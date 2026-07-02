import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EzoicConsentService } from './ezoic-consent.service';
import { EzoicWindow } from './ezstandalone.types';
import { TcfAddEventListenerCallback, TcfData } from './tcf.types';

interface InstalledTcf {
  api: jest.Mock;
  /** Invokes the registered addEventListener callback with the given TCData. */
  fire: (data: TcfData, success?: boolean) => void;
  /** Records the listenerId passed to each removeEventListener call. */
  removed: jest.Mock;
}

function installTcf(): InstalledTcf {
  let callback: TcfAddEventListenerCallback | undefined;
  const removed = jest.fn();
  const api = jest.fn(
    (command: string, _version: number, cb: (...args: unknown[]) => void, param?: unknown) => {
      if (command === 'addEventListener') {
        callback = cb as unknown as TcfAddEventListenerCallback;
      } else if (command === 'removeEventListener') {
        (cb as (success: boolean) => void)(true);
        removed(param);
      }
    },
  );
  (window as unknown as EzoicWindow).__tcfapi = api as unknown as EzoicWindow['__tcfapi'];
  return {
    api,
    fire: (data, success = true) => callback?.(data, success),
    removed,
  };
}

function reset(): void {
  (window as unknown as EzoicWindow).__tcfapi = undefined;
}

describe('EzoicConsentService', () => {
  afterEach(reset);

  describe('in a browser', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({});
    });

    it('registers a TCF event listener when the CMP is already present', () => {
      const tcf = installTcf();
      TestBed.inject(EzoicConsentService);
      expect(tcf.api).toHaveBeenCalledWith('addEventListener', 2, expect.any(Function));
    });

    it('marks ready and exposes consent state on a tcloaded event', () => {
      const tcf = installTcf();
      const service = TestBed.inject(EzoicConsentService);
      expect(service.ready()).toBe(false);
      tcf.fire({
        eventStatus: 'tcloaded',
        tcString: 'CONSENT123',
        gdprApplies: true,
        listenerId: 7,
      });
      expect(service.ready()).toBe(true);
      expect(service.tcString()).toBe('CONSENT123');
      expect(service.gdprApplies()).toBe(true);
      expect(service.eventStatus()).toBe('tcloaded');
    });

    it('records cmpuishown without becoming ready', () => {
      const tcf = installTcf();
      const service = TestBed.inject(EzoicConsentService);
      tcf.fire({ eventStatus: 'cmpuishown', gdprApplies: true });
      expect(service.eventStatus()).toBe('cmpuishown');
      expect(service.ready()).toBe(false);
      expect(service.tcString()).toBeNull();
    });

    it('becomes ready and updates the string on useractioncomplete', () => {
      const tcf = installTcf();
      const service = TestBed.inject(EzoicConsentService);
      tcf.fire({ eventStatus: 'cmpuishown', gdprApplies: true });
      tcf.fire({ eventStatus: 'useractioncomplete', tcString: 'UPDATED', gdprApplies: true });
      expect(service.ready()).toBe(true);
      expect(service.tcString()).toBe('UPDATED');
      expect(service.eventStatus()).toBe('useractioncomplete');
    });

    it('ignores a callback invoked with success=false', () => {
      const tcf = installTcf();
      const service = TestBed.inject(EzoicConsentService);
      tcf.fire({ eventStatus: 'tcloaded', tcString: 'X' }, false);
      expect(service.ready()).toBe(false);
      expect(service.tcString()).toBeNull();
    });

    it('removes its listener on destroy using the CMP-assigned id', () => {
      const tcf = installTcf();
      const service = TestBed.inject(EzoicConsentService);
      tcf.fire({ eventStatus: 'tcloaded', tcString: 'X', listenerId: 42 });
      expect(service.ready()).toBe(true);
      TestBed.resetTestingModule();
      expect(tcf.removed).toHaveBeenCalledWith(42);
    });

    it('waits for a CMP that loads after construction, then registers', () => {
      jest.useFakeTimers();
      try {
        const service = TestBed.inject(EzoicConsentService);
        const tcf = installTcf();
        expect(tcf.api).not.toHaveBeenCalled();
        jest.advanceTimersByTime(300);
        expect(tcf.api).toHaveBeenCalledWith('addEventListener', 2, expect.any(Function));
        tcf.fire({ eventStatus: 'tcloaded', tcString: 'LATE', listenerId: 1 });
        expect(service.ready()).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('stops polling after the maximum attempts when no CMP appears', () => {
      jest.useFakeTimers();
      try {
        TestBed.inject(EzoicConsentService);
        const clearSpy = jest.spyOn(global, 'clearInterval');
        jest.advanceTimersByTime(250 * 41);
        expect(clearSpy).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('during server-side rendering', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    it('does not report the browser platform', () => {
      expect(TestBed.inject(EzoicConsentService).isBrowser).toBe(false);
    });

    it('registers no listener and leaves state at its initial values', () => {
      const tcf = installTcf();
      const service = TestBed.inject(EzoicConsentService);
      expect(tcf.api).not.toHaveBeenCalled();
      expect(service.ready()).toBe(false);
      expect(service.tcString()).toBeNull();
      expect(service.gdprApplies()).toBeNull();
      expect(service.eventStatus()).toBeNull();
    });
  });
});
