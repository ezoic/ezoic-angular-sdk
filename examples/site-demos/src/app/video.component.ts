import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  EzoicAdComponent,
  EzoicVideoComponent,
  EzoicVideoEmbedComponent,
} from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "Video" scenario. Shows both video surfaces the SDK exposes: an Open Video
 * inline embed and an Ezoic video placeholder.
 *
 * The page also mounts one display `<ezoic-ad>` placement. That is required, not
 * decorative: the Ezoic runtime only requests a queued `<ezoic-video>`
 * placeholder once page-level ad scripts have loaded, which a `showAds` (any
 * display placement) triggers. Without it the `<ezoic-video>` request stays
 * queued forever.
 */
@Component({
  selector: 'app-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent, EzoicVideoComponent, EzoicVideoEmbedComponent],
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
      autoplaying player for the given video.
    </p>
    <ezoic-video-embed videoId="zn0TPhaPiju" float autoplay />

    <h2>Ezoic video placeholder</h2>
    <p>
      <code>&lt;ezoic-video&gt;</code> emits a bare div the Ezoic video runtime discovers and fills;
      the publisher chooses and sizes the div id.
    </p>
    <ezoic-video divId="demo-video-slot-1" />

    <h2>Display placement (required to initialize page-level ads)</h2>
    <p>
      This <code>&lt;ezoic-ad&gt;</code> is not decorative: the Ezoic runtime only requests a queued
      video placeholder after page-level ad scripts load, which a display <code>showAds</code>
      triggers. Without a display placement (or rewarded init) the video above never loads.
    </p>
    <ezoic-ad [id]="926" [required]="true" [sizes]="['300x250', '336x280']" />
  `,
})
export class VideoComponent {
  private readonly eventLog = inject(EventLogService);

  constructor() {
    this.eventLog.add(
      'Video scenario mounted: <ezoic-video-embed videoId="zn0TPhaPiju"> + <ezoic-video divId="demo-video-slot-1"> + <ezoic-ad [id]="926"> (display unit initializes page-level ads so the video placeholder loads)',
    );
  }
}
