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

    beforeEach(() => {
      spies = mockRuntime();
      TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [{ provide: EZOIC_OPTIONS, useValue: {} }],
      });
      fixture = TestBed.createComponent(HostComponent);
      host = fixture.componentInstance;
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
  });
});
