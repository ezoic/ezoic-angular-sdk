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
  signal,
} from '@angular/core';
import { EzoicAdRegistry } from './ezoic-ad.registry';
import { EzoicService } from './ezoic.service';
import { EZOIC_PLACEHOLDER_ID_PREFIX, placeholderElementId } from './placeholder';

/**
 * Renders a single Ezoic display-ad placeholder.
 *
 * The component emits a bare `<div id="ezoic-pub-ad-placeholder-<id>">` with no
 * styling of its own (the host wrapper is layout-transparent), which is what the
 * Ezoic runtime scans for. Placeholders that mount in the same tick are batched
 * into one `showAds` call; the placeholder is torn down on destroy.
 *
 * Provide exactly one of `[id]` (an explicit placeholder id, 1-999) or
 * `location` (a semantic "zero-config" location name such as
 * `"under_first_paragraph"`, resolved to a reserved 900-999 id). A
 * location-based placeholder resolves its id in the browser only, so its div is
 * not rendered during server-side rendering.
 *
 * @example
 * ```html
 * <ezoic-ad [id]="101" />
 * <ezoic-ad [id]="102" required [sizes]="['728x90', '320x50']" />
 * <ezoic-ad location="under_first_paragraph" />
 * ```
 *
 * @see https://docs.ezoic.com/docs/ezoicads/integration/
 */
@Component({
  selector: 'ezoic-ad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '@if (elementId(); as eid) { <div [id]="eid"></div> }',
  host: { style: 'display: contents' },
})
export class EzoicAdComponent implements OnInit, OnDestroy {
  private readonly registry = inject(EzoicAdRegistry);
  private readonly ezoic = inject(EzoicService);

  /**
   * The placeholder id (integer 1-999). Provide this or {@link location}, but
   * not both.
   */
  readonly id = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown): number | undefined =>
      value == null || value === '' ? undefined : numberAttribute(value),
  });

  /**
   * A semantic ("zero-config") location name — for example
   * `"under_first_paragraph"`, `"mid_content"` or `"top_of_page"` — resolved to
   * a reserved 900-999 placeholder id. Provide this or {@link id}, but not both.
   */
  readonly location = input<string | undefined>(undefined);

  /** Request the ad as required (must-fill). Defaults to `false`. */
  readonly required = input(false, { transform: booleanAttribute });

  /** Ad sizes to request, each in `WIDTHxHEIGHT` form (for example `"728x90"`). */
  readonly sizes = input<readonly string[]>([]);

  /** The resolved placeholder id, or `null` until it is known. */
  private readonly resolvedId = signal<number | null>(null);

  /**
   * The placeholder element id (e.g. `ezoic-pub-ad-placeholder-101`) once the
   * id is known, otherwise `null` (the div is not rendered until then).
   */
  readonly elementId = computed<string | null>(() => {
    const id = this.resolvedId();
    return id === null ? null : `${EZOIC_PLACEHOLDER_ID_PREFIX}${id}`;
  });

  /** Id captured at registration so teardown matches, even if inputs change. */
  private registeredId: number | null = null;

  /** Set once the component is destroyed, to drop a late location resolution. */
  private destroyed = false;

  ngOnInit(): void {
    const id = this.id();
    const location = this.location();
    const hasId = id !== undefined && !Number.isNaN(id);
    const hasLocation = location !== undefined && location !== '';

    if (hasId === hasLocation) {
      throw new Error(
        '<ezoic-ad> requires exactly one of [id] or location: ' +
          (hasId ? 'both were provided.' : 'neither was provided.'),
      );
    }

    if (hasId) {
      // Validate the publisher-supplied id (throws RangeError when out of
      // range), then register synchronously so id-based ads batch in one tick.
      placeholderElementId(id as number);
      this.activate(id as number);
      return;
    }

    // Location-based: resolve to an id in the browser only, then register. The
    // resolution is asynchronous, so the div appears once the id is known.
    if (!this.ezoic.isBrowser) {
      return;
    }
    void this.ezoic.resolveLocationId(location as string).then((resolved) => {
      if (this.destroyed) {
        return;
      }
      if (resolved === null) {
        console.warn(
          `[ezoic] Unknown Ezoic location "${location as string}": no matching placeholder id. ` +
            'The ad was not requested.',
        );
        return;
      }
      this.activate(resolved);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.registeredId !== null) {
      this.registry.unregister(this.registeredId);
      this.registeredId = null;
    }
  }

  /** Records the resolved id, renders the div, and requests the placeholder. */
  private activate(id: number): void {
    this.registeredId = id;
    this.resolvedId.set(id);
    this.registry.register({ id, required: this.required(), sizes: [...this.sizes()] });
  }
}
