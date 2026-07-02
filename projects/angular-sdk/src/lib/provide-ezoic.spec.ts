import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicService } from './ezoic.service';
import { provideEzoic } from './provide-ezoic';
import { EZOIC_SDK_SCRIPT_ATTR } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';

function markers(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(`script[${EZOIC_SDK_SCRIPT_ATTR}]`),
  ).map((s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) ?? '');
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

describe('provideEzoic', () => {
  beforeEach(reset);
  afterEach(reset);

  it('registers the caller options under EZOIC_OPTIONS', () => {
    TestBed.configureTestingModule({ providers: [provideEzoic({ cmp: false })] });
    expect(TestBed.inject(EZOIC_OPTIONS)).toEqual({ cmp: false });
  });

  it('runs the app initializer, injecting scripts and marking the service ready', () => {
    // TestBed runs synchronous APP_INITIALIZERs during module finalization, so
    // the first inject already triggered provideEzoic's initializer.
    TestBed.configureTestingModule({ providers: [provideEzoic()] });
    expect(TestBed.inject(EzoicService).ready()).toBe(true);
    expect(markers()).toEqual(['cmp', 'cmp', 'cmd-stub', 'header', 'analytics']);
  });

  it('honours options passed to provideEzoic through the initializer', () => {
    TestBed.configureTestingModule({
      providers: [provideEzoic({ cmp: false, analytics: false })],
    });
    expect(TestBed.inject(EzoicService).ready()).toBe(true);
    expect(markers()).toEqual(['cmd-stub', 'header']);
  });

  it('injects nothing during server-side rendering', () => {
    TestBed.configureTestingModule({
      providers: [provideEzoic(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    expect(TestBed.inject(EzoicService).ready()).toBe(false);
    expect(markers()).toEqual([]);
  });
});
