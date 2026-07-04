import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { DemoStateService } from './demo-state.service';

/**
 * Home route. Demonstrates zero-config semantic placements (900-range),
 * an explicit-id placement (dashboard-sized), and dynamic-content placements
 * that mount after initial load when the shell's "Load more ads" button flips
 * the shared `showMoreAds` signal.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent],
  template: `
    <h1>Home</h1>
    <p>
      Zero-config semantic placements resolve to reserved 900-range ids in the browser. They carry
      no dashboard sizing, so each passes explicit sizes and keeps the default
      <code>required: true</code>.
    </p>

    <ezoic-ad location="top_of_page" required [sizes]="bannerSizes" />
    <p>First paragraph of demo article content.</p>
    <ezoic-ad location="under_first_paragraph" required [sizes]="bannerSizes" />
    <p>More demo content follows the first paragraph.</p>
    <ezoic-ad location="mid_content" required [sizes]="bannerSizes" />

    <h2>Explicit-id placement</h2>
    <p>An explicit id is sized in the Ezoic dashboard, so no sizes are passed.</p>
    <ezoic-ad [id]="910" />

    <h2>Best-effort placement (required opt-out)</h2>
    <p>
      Location placements default to <code>required: true</code>. Pass
      <code>[required]="false"</code> to make one best-effort — it still passes sizes.
    </p>
    <ezoic-ad location="bottom_of_page" [required]="false" [sizes]="bannerSizes" />

    @if (demoState.showMoreAds()) {
      <h2>Dynamically added placements</h2>
      <p>These incontent ids mounted after initial load; the SDK batches a follow-up request.</p>
      <ezoic-ad [id]="915" />
      <ezoic-ad [id]="916" />
    }
  `,
})
export class HomeComponent {
  protected readonly demoState = inject(DemoStateService);

  /** Sizes requested for the zero-config location placements. */
  protected readonly bannerSizes = ['728x90', '320x50'];
}
