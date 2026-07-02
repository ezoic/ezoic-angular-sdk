import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicService } from './ezoic.service';
import { EZOIC_SDK_SCRIPT_ATTR } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';

function sdkScriptCount(): number {
  return document.querySelectorAll(`script[${EZOIC_SDK_SCRIPT_ATTR}]`).length;
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
  });
});
