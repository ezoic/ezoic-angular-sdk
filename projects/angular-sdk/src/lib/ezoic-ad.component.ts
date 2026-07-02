import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  booleanAttribute,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { EzoicAdRegistry } from './ezoic-ad.registry';
import { placeholderElementId } from './placeholder';

/**
 * Renders a single Ezoic display-ad placeholder.
 *
 * The component emits a bare `<div id="ezoic-pub-ad-placeholder-<id>">` with no
 * styling of its own (the host wrapper is layout-transparent), which is what the
 * Ezoic runtime scans for. Placeholders that mount in the same tick are batched
 * into one `showAds` call; the placeholder is torn down on destroy.
 *
 * @example
 * ```html
 * <ezoic-ad [id]="101" />
 * <ezoic-ad [id]="102" required [sizes]="['728x90', '320x50']" />
 * ```
 *
 * @see https://docs.ezoic.com/docs/ezoicads/integration/
 */
@Component({
  selector: 'ezoic-ad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div [id]="elementId()"></div>',
  host: { style: 'display: contents' },
})
export class EzoicAdComponent implements OnInit, OnDestroy {
  private readonly registry = inject(EzoicAdRegistry);

  /** The placeholder id (integer 1-999). Required. */
  readonly id = input.required<number, unknown>({ transform: numberAttribute });

  /** Request the ad as required (must-fill). Defaults to `false`. */
  readonly required = input(false, { transform: booleanAttribute });

  /** Ad sizes to request, each in `WIDTHxHEIGHT` form (for example `"728x90"`). */
  readonly sizes = input<readonly string[]>([]);

  /**
   * The placeholder element id, e.g. `ezoic-pub-ad-placeholder-101`. Throws a
   * `RangeError` when `id` is outside the valid 1-999 range.
   */
  readonly elementId = computed(() => placeholderElementId(this.id()));

  /** Id captured at registration so teardown matches, even if `id` later changes. */
  private registeredId: number | null = null;

  ngOnInit(): void {
    const id = this.id();
    this.registeredId = id;
    this.registry.register({ id, required: this.required(), sizes: [...this.sizes()] });
  }

  ngOnDestroy(): void {
    if (this.registeredId !== null) {
      this.registry.unregister(this.registeredId);
      this.registeredId = null;
    }
  }
}
