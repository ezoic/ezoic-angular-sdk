import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  OnInit,
  booleanAttribute,
  inject,
  input,
} from '@angular/core';
import { EzoicService } from './ezoic.service';
import { injectOpenVideoLoader, pushOpenVideoPlayer } from './script-loader';

/**
 * Coerces an optional boolean attribute: `null`/`undefined` (attribute absent)
 * stays `undefined` so the value is omitted from the pushed embed entry;
 * anything else is normalized through {@link booleanAttribute}.
 */
function optionalBooleanAttribute(value: boolean | string | undefined): boolean | undefined {
  return value == null ? undefined : booleanAttribute(value);
}

/**
 * Renders an Open Video inline embed.
 *
 * Unlike `<ezoic-video>` (which emits a bare div for the Ezoic runtime to
 * scan), this component uses its own host element as the embed target, so the
 * publisher sizes it directly with `ezoic-video-embed { width; height }` CSS. On
 * init in the browser it injects `https://open.video/video.js` once and pushes
 * an entry onto `window.openVideoPlayers`, which the Open Video script consumes
 * to mount the player.
 *
 * @example
 * ```html
 * <ezoic-video-embed videoId="abc123" />
 * <ezoic-video-embed videoId="abc123" playlist="my-playlist" float autoplay />
 * ```
 *
 * @see https://docs.ezoic.com/docs/ezoicadsadvanced/ezoic-video/
 */
@Component({
  selector: 'ezoic-video-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class EzoicVideoEmbedComponent implements OnInit {
  private readonly ezoic = inject(EzoicService);
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject<ElementRef<Element>>(ElementRef);

  /** The Open Video video id (maps to the entry's `videoID`). Required. */
  readonly videoId = input.required<string>();

  /** Optional Open Video playlist id to load instead of a single video. */
  readonly playlist = input<string | undefined>(undefined);

  /** Enable the floating player behaviour. Omitted from the entry when unset. */
  readonly float = input(undefined, { transform: optionalBooleanAttribute });

  /** Autoplay the video. Omitted from the entry when unset. */
  readonly autoplay = input(undefined, { transform: optionalBooleanAttribute });

  ngOnInit(): void {
    const videoId = this.videoId();
    if (videoId.trim() === '') {
      throw new Error('<ezoic-video-embed> requires a non-empty videoId.');
    }
    if (!this.ezoic.isBrowser) {
      return;
    }
    const playlist = this.playlist();
    const float = this.float();
    const autoplay = this.autoplay();
    injectOpenVideoLoader(this.document);
    pushOpenVideoPlayer(this.document, {
      target: this.elementRef.nativeElement,
      videoID: videoId,
      ...(playlist ? { playlist } : {}),
      ...(float !== undefined ? { float } : {}),
      ...(autoplay !== undefined ? { autoplay } : {}),
    });
  }
}
