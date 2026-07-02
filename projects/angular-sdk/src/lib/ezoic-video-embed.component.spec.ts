import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EZOIC_OPTIONS, EZOIC_OPEN_VIDEO_SCRIPT_URL } from './ezoic-config';
import { EzoicVideoEmbedComponent } from './ezoic-video-embed.component';
import { EzoicOpenVideoEntry, EzoicWindow } from './ezstandalone.types';
import { EZOIC_SDK_SCRIPT_ATTR } from './script-loader';

interface EmbedSpec {
  videoId: string;
  playlist?: string;
  float?: boolean;
  autoplay?: boolean;
}

@Component({
  imports: [EzoicVideoEmbedComponent],
  template: `
    @for (embed of embeds; track $index) {
      <ezoic-video-embed
        [videoId]="embed.videoId"
        [playlist]="embed.playlist"
        [float]="embed.float"
        [autoplay]="embed.autoplay"
      ></ezoic-video-embed>
    }
  `,
})
class HostComponent {
  embeds: EmbedSpec[] = [];
}

function openVideoScripts(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(`script[${EZOIC_SDK_SCRIPT_ATTR}="open-video"]`),
  );
}

function players(): EzoicOpenVideoEntry[] {
  return (window as unknown as EzoicWindow).openVideoPlayers ?? [];
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).openVideoPlayers = undefined;
}

describe('EzoicVideoEmbedComponent', () => {
  beforeEach(reset);
  afterEach(reset);

  describe('in a browser', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [{ provide: EZOIC_OPTIONS, useValue: {} }],
      });
      fixture = TestBed.createComponent(HostComponent);
      host = fixture.componentInstance;
    });

    it('injects the open.video script exactly once across two embeds', () => {
      host.embeds = [{ videoId: 'abc' }, { videoId: 'def' }];
      fixture.detectChanges();
      const scripts = openVideoScripts();
      expect(scripts).toHaveLength(1);
      expect(scripts[0].getAttribute('src')).toBe(EZOIC_OPEN_VIDEO_SCRIPT_URL);
      expect(scripts[0].async).toBe(true);
    });

    it('pushes an entry with the correct videoID casing and host target', () => {
      host.embeds = [{ videoId: 'abc123' }];
      fixture.detectChanges();
      const entries = players();
      expect(entries).toHaveLength(1);
      expect(entries[0].videoID).toBe('abc123');
      expect(entries[0].target).toBeInstanceOf(HTMLElement);
      expect((entries[0].target as HTMLElement).tagName.toLowerCase()).toBe('ezoic-video-embed');
    });

    it('forwards playlist, float and autoplay when set', () => {
      host.embeds = [{ videoId: 'abc', playlist: 'pl-1', float: true, autoplay: true }];
      fixture.detectChanges();
      const [entry] = players();
      expect(entry.playlist).toBe('pl-1');
      expect(entry.float).toBe(true);
      expect(entry.autoplay).toBe(true);
    });

    it('omits playlist, float and autoplay when unset', () => {
      host.embeds = [{ videoId: 'abc' }];
      fixture.detectChanges();
      const [entry] = players();
      expect('playlist' in entry).toBe(false);
      expect('float' in entry).toBe(false);
      expect('autoplay' in entry).toBe(false);
    });

    it('throws for an empty videoId', () => {
      host.embeds = [{ videoId: '' }];
      expect(() => fixture.detectChanges()).toThrow(
        '<ezoic-video-embed> requires a non-empty videoId.',
      );
    });
  });

  describe('during server-side rendering', () => {
    it('injects no script and pushes no player', () => {
      TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [
          { provide: EZOIC_OPTIONS, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.embeds = [{ videoId: 'abc' }];
      fixture.detectChanges();
      expect(openVideoScripts()).toHaveLength(0);
      expect((window as unknown as EzoicWindow).openVideoPlayers).toBeUndefined();
    });
  });
});
