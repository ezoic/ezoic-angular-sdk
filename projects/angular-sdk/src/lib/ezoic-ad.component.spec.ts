import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicAdComponent } from './ezoic-ad.component';
import { EzoicWindow } from './ezstandalone.types';

interface AdSpec {
  id: number;
  required?: boolean;
  sizes?: string[];
}

@Component({
  imports: [EzoicAdComponent],
  template: `
    @for (ad of ads; track ad.id) {
      <ezoic-ad [id]="ad.id" [required]="ad.required ?? false" [sizes]="ad.sizes ?? []"></ezoic-ad>
    }
  `,
})
class HostComponent {
  ads: AdSpec[] = [];
}

interface FlexSpec {
  id?: number;
  location?: string;
  sizes?: string[];
  required?: boolean;
}

@Component({
  imports: [EzoicAdComponent],
  template: `
    @for (ad of ads; track $index) {
      <ezoic-ad
        [id]="ad.id"
        [location]="ad.location"
        [sizes]="ad.sizes ?? []"
        [required]="ad.required"
      ></ezoic-ad>
    }
  `,
})
class FlexHostComponent {
  ads: FlexSpec[] = [];
}

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

function drain(): void {
  const ez = (window as unknown as EzoicWindow).ezstandalone;
  if (!ez) {
    return;
  }
  const queued = [...ez.cmd];
  ez.cmd.length = 0;
  queued.forEach((fn) => fn());
}

function tick(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

/** Drains every microtask (async location resolution + registry flush). */
function settle(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function placeholderDiv(id: number): HTMLElement | null {
  return document.getElementById(`ezoic-pub-ad-placeholder-${id}`);
}

function reset(): void {
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

describe('EzoicAdComponent', () => {
  afterEach(reset);

  describe('in a browser', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let spies: Spies;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      spies = mockRuntime();
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [{ provide: EZOIC_OPTIONS, useValue: {} }],
      });
      fixture = TestBed.createComponent(HostComponent);
      host = fixture.componentInstance;
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('renders one bare placeholder div per component', () => {
      host.ads = [{ id: 101 }, { id: 102 }];
      fixture.detectChanges();

      const first = placeholderDiv(101);
      const second = placeholderDiv(102);
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first?.tagName).toBe('DIV');
      // "Bare" means no styling of its own — no class or style attribute.
      expect(first?.getAttribute('class')).toBeNull();
      expect(first?.getAttribute('style')).toBeNull();
      expect(second?.getAttribute('class')).toBeNull();
      expect(second?.getAttribute('style')).toBeNull();
    });

    it('batches every id mounted in the same tick into one showAds call', async () => {
      host.ads = [{ id: 101 }, { id: 102 }, { id: 103 }];
      fixture.detectChanges();
      await tick();
      drain();
      expect(spies.showAds).toHaveBeenCalledTimes(1);
      expect(spies.showAds).toHaveBeenCalledWith(101, 102, 103);
    });

    it('forwards the object form for required/sized placeholders', async () => {
      host.ads = [{ id: 103, required: true, sizes: ['300x250'] }];
      fixture.detectChanges();
      await tick();
      drain();
      expect(spies.showAds).toHaveBeenCalledWith({
        id: 103,
        required: true,
        sizes: ['300x250'],
      });
    });

    it('destroys a placeholder when its component is removed', async () => {
      host.ads = [{ id: 101 }, { id: 102 }];
      fixture.detectChanges();
      await tick();
      drain();

      host.ads = [{ id: 101 }];
      fixture.detectChanges();
      drain();
      expect(placeholderDiv(102)).toBeNull();
      expect(spies.destroyPlaceholders).toHaveBeenCalledTimes(1);
      expect(spies.destroyPlaceholders).toHaveBeenCalledWith(102);
    });

    it('throws for an out-of-range placeholder id', () => {
      host.ads = [{ id: 1500 }];
      expect(() => fixture.detectChanges()).toThrow(RangeError);
    });
  });

  describe('during server-side rendering', () => {
    it('renders the placeholder div but requests no ads and touches no runtime', async () => {
      const spies = mockRuntime();
      TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.ads = [{ id: 101 }];
      fixture.detectChanges();
      await tick();
      drain();
      expect(placeholderDiv(101)).not.toBeNull();
      expect(spies.showAds).not.toHaveBeenCalled();
    });

    it('renders no div and requests no ads for a location-based placeholder', async () => {
      const spies = mockRuntime();
      TestBed.configureTestingModule({
        imports: [FlexHostComponent],
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const fixture = TestBed.createComponent(FlexHostComponent);
      fixture.componentInstance.ads = [{ location: 'under_first_paragraph' }];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();
      expect(placeholderDiv(909)).toBeNull();
      expect(spies.showAds).not.toHaveBeenCalled();
    });
  });

  describe('zero-config locations (in a browser)', () => {
    let fixture: ComponentFixture<FlexHostComponent>;
    let host: FlexHostComponent;
    let spies: Spies;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      spies = mockRuntime();
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        imports: [FlexHostComponent],
        providers: [{ provide: EZOIC_OPTIONS, useValue: {} }],
      });
      fixture = TestBed.createComponent(FlexHostComponent);
      host = fixture.componentInstance;
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('resolves a location to a 900-range id via the static fallback and renders it', async () => {
      host.ads = [{ location: 'under_first_paragraph' }];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();
      expect(placeholderDiv(909)).not.toBeNull();
      expect(placeholderDiv(909)?.getAttribute('style')).toBeNull();
      expect(spies.showAds).toHaveBeenCalledTimes(1);
      expect(spies.showAds).toHaveBeenCalledWith({ id: 909, required: true, sizes: [] });
    });

    it('resolves aliases through the static fallback', async () => {
      host.ads = [{ location: 'incontent_0' }];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();
      expect(placeholderDiv(910)).not.toBeNull();
    });

    it('coalesces several location placeholders into one showAds call', async () => {
      host.ads = [
        { location: 'top_of_page' },
        { location: 'under_first_paragraph' },
        { location: 'mid_content' },
      ];
      fixture.detectChanges();
      await settle();
      drain();
      expect(spies.showAds).toHaveBeenCalledTimes(1);
      expect(spies.showAds).toHaveBeenCalledWith(
        { id: 900, required: true, sizes: [] },
        { id: 909, required: true, sizes: [] },
        { id: 911, required: true, sizes: [] },
      );
    });

    it('tears down a location placeholder on destroy', async () => {
      host.ads = [{ location: 'under_first_paragraph' }];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();

      host.ads = [];
      fixture.detectChanges();
      drain();
      expect(placeholderDiv(909)).toBeNull();
      expect(spies.destroyPlaceholders).toHaveBeenCalledWith(909);
    });

    it('warns and requests nothing for an unknown location', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      host.ads = [{ location: 'not_a_real_location' }];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();
      expect(placeholderDiv(909)).toBeNull();
      expect(spies.showAds).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('not_a_real_location'));
      warn.mockRestore();
    });

    it('throws when both [id] and location are provided', () => {
      host.ads = [{ id: 101, location: 'top_of_page' }];
      expect(() => fixture.detectChanges()).toThrow(/exactly one of \[id\] or location/);
    });

    it('throws when neither [id] nor location is provided', () => {
      host.ads = [{}];
      expect(() => fixture.detectChanges()).toThrow(/exactly one of \[id\] or location/);
    });
  });

  describe('zero-config locations with the runtime helper', () => {
    it('resolves via ezstandalone.GetGeneratedIdAsync when available', async () => {
      const showAds = jest.fn();
      const getId = jest.fn().mockResolvedValue('916');
      (window as unknown as EzoicWindow).ezstandalone = {
        cmd: [],
        showAds,
        GetGeneratedIdAsync: getId,
      };
      TestBed.configureTestingModule({
        imports: [FlexHostComponent],
        providers: [{ provide: EZOIC_OPTIONS, useValue: {} }],
      });
      const fixture = TestBed.createComponent(FlexHostComponent);
      fixture.componentInstance.ads = [{ location: 'incontent_6' }];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();
      expect(getId).toHaveBeenCalledWith('incontent_6');
      expect(placeholderDiv(916)).not.toBeNull();
      expect(showAds).toHaveBeenCalledWith({ id: 916, required: true, sizes: [] });
    });
  });

  describe('sizing and required defaults', () => {
    let spies: Spies;

    beforeEach(() => {
      spies = mockRuntime();
      TestBed.configureTestingModule({
        imports: [HostComponent, FlexHostComponent],
        providers: [{ provide: EZOIC_OPTIONS, useValue: {} }],
      });
    });

    afterEach(reset);

    it('location placement defaults to required with the passed sizes', async () => {
      const fixture = TestBed.createComponent(FlexHostComponent);
      fixture.componentInstance.ads = [{ location: 'under_first_paragraph', sizes: ['300x250'] }];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();
      expect(spies.showAds).toHaveBeenCalledWith({ id: 909, required: true, sizes: ['300x250'] });
    });

    it('location placement opts out of required via [required]=false', async () => {
      const fixture = TestBed.createComponent(FlexHostComponent);
      fixture.componentInstance.ads = [
        { location: 'under_first_paragraph', sizes: ['300x250'], required: false },
      ];
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      drain();
      expect(spies.showAds).toHaveBeenCalledWith({ id: 909, required: false, sizes: ['300x250'] });
    });

    it('explicit-id placement still defaults to not-required', async () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.ads = [{ id: 101, sizes: ['728x90'] }];
      fixture.detectChanges();
      await tick();
      drain();
      expect(spies.showAds).toHaveBeenCalledWith({ id: 101, required: false, sizes: ['728x90'] });
    });

    it('warns in dev mode when a placement is requested without sizes', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.ads = [{ id: 105 }];
      fixture.detectChanges();
      await tick();
      drain();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('sizes'));
      warn.mockRestore();
    });

    it('does not warn about sizes when sizes are provided', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.ads = [{ id: 105, sizes: ['728x90'] }];
      fixture.detectChanges();
      await tick();
      drain();
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('without [sizes]'));
      warn.mockRestore();
    });
  });
});
