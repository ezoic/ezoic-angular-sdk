import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  EzoicAdComponent,
  EzoicVideoComponent,
  EzoicVideoEmbedComponent,
} from '@ezoic/angular-sdk';

/**
 * Article route. Mounts a different explicit-id display placement than Home so
 * navigation tears down the departing route's placeholders and requests this
 * route's, plus an inline Open Video embed and an Ezoic video placeholder.
 * Generated ids carry no dashboard sizing, so sizes are passed explicitly.
 */
@Component({
  selector: 'app-article',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent, EzoicVideoComponent, EzoicVideoEmbedComponent],
  template: `
    <h1>Article</h1>
    <p>A distinct explicit-id placement for this route.</p>
    <ezoic-ad [id]="919" [required]="true" [sizes]="['300x250', '336x280']" />

    <h2>Inline video embed (Open Video)</h2>
    <ezoic-video-embed videoId="demo-video-id" playlist="demo-playlist" float autoplay />

    <h2>Ezoic video placeholder</h2>
    <ezoic-video divId="demo-video-slot-1" />
  `,
})
export class ArticleComponent {}
