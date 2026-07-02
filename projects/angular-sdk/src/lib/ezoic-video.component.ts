import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  input,
} from '@angular/core';
import { EzoicVideoRegistry } from './ezoic-video.registry';

/**
 * Renders a single Ezoic video placeholder (outstream/instream).
 *
 * The component emits a bare `<div id="<divId>">` with no styling of its own —
 * the element the Ezoic video runtime scans for. The publisher chooses the div
 * id and sizes it with their own `#<divId>` CSS. Video divs that mount in the
 * same tick are batched into a single `displayMoreVideo(...)` call (which both
 * appends and loads them); the placeholder is torn down on destroy via
 * `destroyVideoPlaceholders`.
 *
 * @example
 * ```html
 * <ezoic-video divId="my-video-1" />
 * ```
 *
 * @see https://docs.ezoic.com/docs/ezoicadsadvanced/ezoic-video/
 */
@Component({
  selector: 'ezoic-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div [id]="divId()"></div>',
  host: { style: 'display: contents' },
})
export class EzoicVideoComponent implements OnInit, OnDestroy {
  private readonly registry = inject(EzoicVideoRegistry);

  /** The video div id. Must be non-empty and unique on the page. */
  readonly divId = input.required<string>();

  /** Id captured at registration so teardown matches, even if inputs change. */
  private registeredDivId: string | null = null;

  ngOnInit(): void {
    const divId = this.divId();
    if (divId.trim() === '') {
      throw new Error('<ezoic-video> requires a non-empty divId.');
    }
    this.registeredDivId = divId;
    this.registry.register(divId);
  }

  ngOnDestroy(): void {
    if (this.registeredDivId !== null) {
      this.registry.unregister(this.registeredDivId);
      this.registeredDivId = null;
    }
  }
}
