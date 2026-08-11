import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { DemoStateService } from './demo-state.service';

/**
 * Home route. Demonstrates zero-config semantic placements (900-range),
 * an explicit generated-id placement, and dynamic-content placements
 * that mount after initial load when the shell's "Load more ads" button flips
 * the shared `showMoreAds` signal. Generated ids carry no dashboard sizing, so
 * every placement below passes explicit sizes.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent],
  template: `
    <h1>Home</h1>
    <p>
      Zero-config semantic placements resolve to reserved 900-range ids in the browser. They carry
      no dashboard sizing, so each passes explicit, position-appropriate sizes and keeps the default
      <code>required: true</code>. Header/footer placements request banner-led sets (plus common
      rectangles); content placements request rectangle-led sets where live-demand evidence on
      Ezoic-integrated test sites concentrates. The platform filters client sizes to the site's
      configured allowed sizes per position and form factor.
    </p>

    <ezoic-ad location="top_of_page" required [sizes]="headerFooterSizes" />
    <p>First paragraph of demo article content.</p>
    <ezoic-ad location="under_first_paragraph" required [sizes]="contentSizes" />
    <p>More demo content follows the first paragraph.</p>
    <ezoic-ad location="mid_content" required [sizes]="contentSizes" />

    <h2>Explicit-id placement</h2>
    <p>
      Generated ids carry no dashboard sizing either, so this content-position id passes the same
      rectangle-led size set explicitly.
    </p>
    <ezoic-ad [id]="910" [required]="true" [sizes]="contentSizes" />

    <h2>Best-effort placement (required opt-out)</h2>
    <p>
      Location placements default to <code>required: true</code>. Pass
      <code>[required]="false"</code> to make one best-effort — it still passes sizes.
    </p>
    <ezoic-ad location="bottom_of_page" [required]="false" [sizes]="headerFooterSizes" />

    @if (demoState.showMoreAds()) {
      <h2>Dynamically added placements</h2>
      <p>These incontent ids mounted after initial load; the SDK batches a follow-up request.</p>
      <ezoic-ad [id]="915" [required]="true" [sizes]="['300x250', '336x280']" />
      <ezoic-ad [id]="916" [required]="true" [sizes]="['300x250']" />
    }
  `,
})
export class HomeComponent {
  protected readonly demoState = inject(DemoStateService);

  /**
   * Header/footer size set. Includes phone-form-factor 320x50 plus common rectangles;
   * the platform filters to the site's configured allowed sizes per position/form factor.
   */
  protected readonly headerFooterSizes = [
    '728x90',
    '970x90',
    '970x250',
    '300x250',
    '336x280',
    '320x50',
  ];

  /**
   * Content-position size set. Rectangle sizes are where content-position demand concentrates;
   * the platform filters client sizes to the site's configured allowed sizes per position/form
   * factor.
   */
  protected readonly contentSizes = ['300x250', '336x280', '580x400', '728x90'];
}
