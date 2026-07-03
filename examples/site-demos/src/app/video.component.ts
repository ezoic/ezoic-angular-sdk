import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicVideoComponent, EzoicVideoEmbedComponent } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "Video" scenario. Shows both video surfaces the SDK exposes: an Open Video
 * inline embed and an Ezoic video placeholder.
 */
@Component({
  selector: 'app-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicVideoComponent, EzoicVideoEmbedComponent],
  template: `
    <h1>Video</h1>
    <p>
      The SDK offers two video surfaces. Below, the first is an Open Video inline embed that mounts
      a player into its own host element; the second is an Ezoic video placeholder div the video
      runtime fills.
    </p>

    <h2>Open Video inline embed</h2>
    <p>
      <code>&lt;ezoic-video-embed&gt;</code> injects the Open Video script and mounts a floating,
      autoplaying player for the given video and playlist.
    </p>
    <ezoic-video-embed videoId="demo-video-id" playlist="demo-playlist" float autoplay />

    <h2>Ezoic video placeholder</h2>
    <p>
      <code>&lt;ezoic-video&gt;</code> emits a bare div the Ezoic video runtime discovers and fills;
      the publisher chooses and sizes the div id.
    </p>
    <ezoic-video divId="demo-video-slot-1" />
  `,
})
export class VideoComponent {
  private readonly eventLog = inject(EventLogService);

  constructor() {
    this.eventLog.add(
      'Video scenario mounted: <ezoic-video-embed videoId="demo-video-id"> + <ezoic-video divId="demo-video-slot-1">',
    );
  }
}
