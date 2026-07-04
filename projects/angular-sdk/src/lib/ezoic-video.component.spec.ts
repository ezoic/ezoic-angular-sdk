import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicVideoComponent } from './ezoic-video.component';
import { EzoicWindow } from './ezstandalone.types';

@Component({
  imports: [EzoicVideoComponent],
  template: `
    @for (video of videos; track video) {
      <ezoic-video [divId]="video"></ezoic-video>
    }
  `,
})
class HostComponent {
  videos: string[] = [];
}

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

function drain(): void {
  const ez = (window as unknown as EzoicWindow).ezstandalone;
  if (!ez || !Array.isArray(ez.cmd)) {
    return;
  }
  const queued = [...ez.cmd];
  ez.cmd.length = 0;
  queued.forEach((fn) => fn());
}

function tick(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

function videoDiv(divId: string): HTMLElement | null {
  return document.getElementById(divId);
}

function reset(): void {
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

describe('EzoicVideoComponent', () => {
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

    it('renders one bare video div per component', () => {
      host.videos = ['my-video', 'other-video'];
      fixture.detectChanges();

      const first = videoDiv('my-video');
      const second = videoDiv('other-video');
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first?.tagName).toBe('DIV');
      // "Bare" means no styling of its own — no class or style attribute.
      expect(first?.getAttribute('class')).toBeNull();
      expect(first?.getAttribute('style')).toBeNull();
    });

    it('batches every div mounted in the same tick into one displayMoreVideo call', async () => {
      host.videos = ['video-1', 'video-2', 'video-3'];
      fixture.detectChanges();
      await tick();
      drain();
      expect(spies.displayMoreVideo).toHaveBeenCalledTimes(1);
      expect(spies.displayMoreVideo).toHaveBeenCalledWith('video-1', 'video-2', 'video-3');
    });

    it('destroys a video placeholder when its component is removed', async () => {
      host.videos = ['video-1', 'video-2'];
      fixture.detectChanges();
      await tick();
      drain();

      host.videos = ['video-1'];
      fixture.detectChanges();
      drain();
      expect(videoDiv('video-2')).toBeNull();
      expect(spies.destroyVideoPlaceholders).toHaveBeenCalledTimes(1);
      expect(spies.destroyVideoPlaceholders).toHaveBeenCalledWith('video-2');
    });

    it('throws for an empty divId', () => {
      host.videos = [''];
      expect(() => fixture.detectChanges()).toThrow('<ezoic-video> requires a non-empty divId.');
    });
  });

  describe('during server-side rendering', () => {
    it('renders the video div but loads no video and touches no runtime', async () => {
      const spies = mockRuntime();
      TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.videos = ['my-video'];
      fixture.detectChanges();
      await tick();
      drain();
      expect(videoDiv('my-video')).not.toBeNull();
      expect(spies.displayMoreVideo).not.toHaveBeenCalled();
    });
  });
});
